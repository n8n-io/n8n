import {
	InstanceAiConfirmRequestDto,
	InstanceAiFeedbackRequestDto,
	InstanceAiRenameThreadRequestDto,
	InstanceAiThreadTabsRequestDto,
	InstanceAiPreferenceCardEditRequestDto,
	InstanceAiPreferenceCardUndoRequestDto,
	InstanceAiSendMessageRequest,
	InstanceAiEventsQuery,
	InstanceAiCorrectTaskRequest,
	InstanceAiCloudBrowserReturnControlRequest,
	InstanceAiEnsureThreadRequest,
	InstanceAiPersistPendingAgentRequest,
	InstanceAiThreadMessagesQuery,
	InstanceAiThreadHistoryQuery,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
} from '@n8n/api-types';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiCloudBrowserLiveViewResponse,
	InstanceAiEvent,
	InstanceAiThreadTabsResponse,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	RestController,
	GlobalScope,
	Middleware,
	Get,
	Post,
	Put,
	Patch,
	Delete,
	OnPubSubEvent,
	Param,
	Body,
	Query,
} from '@n8n/decorators';
import type { StoredEvent } from '@n8n/instance-ai';
import { hasGlobalScope } from '@n8n/permissions';
import { buildAgentTreeFromEvents } from '@n8n/instance-ai';
import {
	OversizedAttachmentError,
	UnsupportedAttachmentError,
	validateAttachmentMimeTypes,
	validateAttachmentSizes,
} from '@n8n/instance-ai/parsers';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { InstanceAiBrowserSessionService } from './browser/instance-ai-browser-session.service';
import { InstanceAiCloudBrowserService } from './browser/instance-ai-cloud-browser.service';
import { DurableEventLog } from './event-bus/durable-event-log';
import { DurableLogMetrics } from './event-bus/durable-log-metrics';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiErrorReporterService } from './instance-ai-error-reporter.service';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiModelCatalogService } from './instance-ai-model-catalog.service';
import { InstanceAiPendingAgentService } from './instance-ai-pending-agent.service';
import { InstanceAiPreferenceCardService } from './instance-ai-preference-card.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiThreadTabsService } from './instance-ai-thread-tabs.service';
import { InstanceAiVerificationService } from './instance-ai-verification.service';
import { InstanceAiService } from './instance-ai.service';
import { InstanceAiOnboardingService, startsOnboardingFirstTurn } from './onboarding';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { ProjectService } from '@/services/project.service.ee';

type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

@RestController('/instance-ai')
export class InstanceAiController {
	private readonly instanceAiConfig: GlobalConfig['instanceAi'];

	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly onboarding: InstanceAiOnboardingService,
		private readonly pendingAgentService: InstanceAiPendingAgentService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly modelCatalogService: InstanceAiModelCatalogService,
		private readonly eventBus: InProcessEventBus,
		private readonly eventLog: DurableEventLog,
		private readonly durableLogMetrics: DurableLogMetrics,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly projectService: ProjectService,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
		private readonly publisher: Publisher,
		private readonly preferenceCardService: InstanceAiPreferenceCardService,
		globalConfig: GlobalConfig,
		private readonly threadTabsService: InstanceAiThreadTabsService,
		private readonly cloudBrowserService: InstanceAiCloudBrowserService,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	private requireInstanceAiEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
	}

	/**
	 * Without a model the run starts and then dies inside the provider call, with
	 * nothing to tell the user why. The frontend routes an unconfigured instance
	 * to setup rather than the composer, but that is one gate per entry point and
	 * the endpoint is reachable on its own, so refuse the run here too.
	 */
	private async requireModelConfigured(): Promise<void> {
		if (!(await this.settingsService.isModelConfigured())) {
			throw new BadRequestError(
				'The n8n Assistant has no model configured. An instance owner can add one in Settings > Assistant.',
			);
		}
	}

	private requireRunDebugEnabled(): void {
		if (!this.instanceAiService.isRunDebugEnabled()) {
			throw new NotFoundError('Run debug is not enabled');
		}
	}
	// Each BrotliCompress stream allocates ~8.6 MB of native memory for its
	// dictionary, and the compression middleware retains streams via closures on
	// the response object for the lifetime of the HTTP keep-alive connection.
	// Downgrade to gzip (~few KB per stream) for all instance-ai endpoints.
	@Middleware()
	stripBrotli(req: Request, _res: Response, next: NextFunction) {
		const ae = req.headers['accept-encoding'];
		if (typeof ae === 'string' && ae.includes('br')) {
			req.headers['accept-encoding'] = ae.replace(/\bbr\b,?\s*/g, '').replace(/,\s*$/, '');
		}
		next();
	}

	@Post('/chat/:threadId')
	@GlobalScope('instanceAi:message')
	async chat(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiSendMessageRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.requireModelConfigured();
		if (!payload.message && (!payload.attachments || payload.attachments.length === 0)) {
			throw new BadRequestError('Either message or attachments must be provided');
		}

		// Verify the requesting user owns this thread (or it's new)
		await this.assertThreadAccess(req.user.id, threadId, { allowNew: true });

		// Only file attachments carry a mime type to validate; workflow and agent
		// attachments are resource references the agent resolves with its tools.
		const fileAttachments = (payload.attachments ?? []).filter(
			(attachment) => attachment.type === 'file',
		);
		if (fileAttachments.length > 0) {
			try {
				validateAttachmentMimeTypes(fileAttachments);
				// Reject oversized payloads here rather than letting them reach the model.
				// The provider answers an oversized image with an opaque 400, and the
				// attachment is already persisted in thread history by then — so every
				// later turn replays it and fails too, stranding the conversation.
				//
				// Note the request schema caps each `data` field at the same per-file
				// limit, and body validation runs before this handler — so over HTTP a
				// single oversized file is answered by the schema and only the combined
				// budget reaches here. This call stays because it is the check for
				// non-HTTP callers and the one that enforces the total.
				validateAttachmentSizes(fileAttachments);
			} catch (error) {
				if (error instanceof UnsupportedAttachmentError) {
					const summary = error.unsupported.map((u) => `${u.fileName} (${u.mimeType})`).join(', ');
					throw new BadRequestError(
						`Unsupported attachment type: ${summary}. Supported types include CSV, JSON, ` +
							'PDF, DOCX, XLSX, HTML, plain text, markdown, and images.',
					);
				}
				if (error instanceof OversizedAttachmentError) {
					throw new BadRequestError(
						error.reason === 'per_file'
							? `${error.message} Attach a smaller version, or resize the image before sending.`
							: `${error.message} Send them across separate messages, or attach smaller versions.`,
					);
				}
				throw error;
			}
		}

		// One active run per thread
		if (this.instanceAiService.hasActiveRun(threadId)) {
			throw new ConflictError('A run is already active for this thread');
		}

		// The override is an eval knob that changes how often the observer runs, so it
		// follows the same gate as the eval routes.
		if (
			payload.observerThresholdTokens !== undefined &&
			(!this.instanceAiConfig.evalInstance || !hasGlobalScope(req.user, 'instanceAi:manage'))
		) {
			throw new ForbiddenError(
				'observerThresholdTokens requires an eval instance and the instanceAi:manage scope',
			);
		}

		const runId = this.instanceAiService.startRun(
			req.user,
			threadId,
			payload.message,
			payload.attachments,
			payload.context,
			payload.timeZone,
			payload.pushRef,
			payload.mode,
			payload.promptVersion,
			payload.browserUseAvailable,
			payload.threadArtifacts,
			payload.observerThresholdTokens,
		);
		return { runId };
	}

	// usesTemplates bypasses the send() wrapper so we can write SSE frames directly
	@Get('/events/:threadId', { usesTemplates: true })
	@GlobalScope('instanceAi:message')
	async events(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		@Param('threadId') threadId: string,
		@Query query: InstanceAiEventsQuery,
	) {
		this.requireInstanceAiEnabled();
		// Verify the requesting user owns this thread before streaming events.
		// A thread that doesn't exist yet is allowed — the frontend opens the SSE
		// connection for new conversations before the first message creates the thread.
		const ownership = await this.memoryService.checkThreadOwnership(req.user.id, threadId);
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}
		// A thread created after subscription can have a different owner.
		// Verify ownership before sending events or a bootstrap frame.
		let ownershipVerified = ownership === 'owned';
		let ownershipCheck: Promise<boolean> | undefined;
		const pendingEvents: StoredEvent[] = [];
		const userId = req.user.id;
		let closed = false;

		const verifyOwnership = async () => {
			ownershipCheck ??= this.memoryService
				.checkThreadOwnership(userId, threadId)
				.then((currentOwnership) => {
					if (closed) return false;

					ownershipVerified = currentOwnership === 'owned';
					if (!ownershipVerified) {
						pendingEvents.length = 0;
						closed = true;
						res.end();
						return false;
					}

					// Drain before live delivery can observe the verified owner.
					for (const stored of pendingEvents) this.writeSseEvent(res, stored);
					pendingEvents.length = 0;

					return true;
				})
				.catch(() => {
					pendingEvents.length = 0;
					closed = true;
					res.end();
					return false;
				});

			return await ownershipCheck;
		};

		// 1. Subscribe to live events before the async bootstrap below.
		//    hasSubscribers() must be true across the awaits that follow: in
		//    multi-main, sibling mains drop relayed events for threads without a
		//    local subscriber, so a relayed event arriving during an await would
		//    otherwise be lost for good. Events emitted while bootstrapping are
		//    NOT delivered here — they land in the event store and the replay in
		//    step 6 picks them up, avoiding duplicates.
		let bootstrapping = true;

		const deliver = (stored: StoredEvent) => {
			if (closed) return;

			if (ownershipVerified) {
				this.writeSseEvent(res, stored);
				return;
			}

			pendingEvents.push(stored);
			void verifyOwnership();
		};

		const unsubscribe = this.eventBus.subscribe(threadId, (stored) => {
			if (bootstrapping) return;
			deliver(stored);
		});

		// Cleanup is registered before the async bootstrap so a client disconnect
		// (or an error response) during the awaits below doesn't leak the
		// subscription.
		let keepAlive: NodeJS.Timeout | undefined = undefined;
		const cleanup = () => {
			closed = true;
			unsubscribe();
			if (keepAlive !== undefined) clearInterval(keepAlive);
		};
		req.once('close', cleanup);
		res.once('finish', cleanup);

		// 2. Re-publish any terminal outcomes that never reached the client.
		if (ownership === 'owned') {
			await this.instanceAiService.replayUndeliveredTerminalOutcomes(threadId);
		}

		// 3. Set SSE headers.
		// Disable response compression — SSE streams small chunks where compression
		// overhead exceeds the benefit, and each Brotli compressor retains ~8.6 MB
		// of native memory for the lifetime of the connection.
		(res as unknown as { compress: boolean }).compress = false;
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		// 4. Determine replay cursor
		//    Last-Event-ID header (browser auto-reconnect) takes precedence over query param.
		//    Both are validated as non-negative integers; invalid values fall back to 0.
		const headerValue = req.headers['last-event-id'];
		const parsedHeader = headerValue ? parseInt(String(headerValue), 10) : NaN;
		const cursor =
			Number.isFinite(parsedHeader) && parsedHeader >= 0 ? parsedHeader : (query.lastEventId ?? 0);

		// 5. Collect live message groups.
		//    Multiple groups can be active simultaneously when a background task
		//    from an older turn outlives its original turn.
		const threadStatus = this.instanceAiService.getThreadStatus(threadId);

		// Collect all distinct message groups that have live activity.
		const liveGroups = new Map<
			string,
			{ runIds: string[]; status: 'active' | 'suspended' | 'background' }
		>();

		// The active/suspended orchestrator run's group
		if (threadStatus.hasActiveRun || threadStatus.isSuspended) {
			const groupId = this.instanceAiService.getMessageGroupId(threadId);
			if (groupId) {
				liveGroups.set(groupId, {
					runIds: this.instanceAiService.getRunIdsForMessageGroup(groupId),
					status: threadStatus.hasActiveRun ? 'active' : 'suspended',
				});
			}
		}

		// Background tasks — each may belong to a different group
		for (const task of threadStatus.backgroundTasks) {
			if (task.status !== 'running' || !task.messageGroupId) continue;
			// The task's turn has ended, so we don't need to mark it as live.
			if (task.detachedFromTurn) continue;
			if (!liveGroups.has(task.messageGroupId)) {
				liveGroups.set(task.messageGroupId, {
					runIds: this.instanceAiService.getRunIdsForMessageGroup(task.messageGroupId),
					status: 'background',
				});
			}
		}

		// 6b (used by both arms below). Emit one run-sync control frame for a live
		//     message group. Each frame uses a named SSE event type
		//     (event: run-sync) with NO id: field so the browser's lastEventId is
		//     unaffected and the replay cursor stays consistent.
		const writeRunSyncFrame = async (
			groupId: string,
			group: { runIds: string[]; status: 'active' | 'suspended' | 'background' },
			runEvents: InstanceAiEvent[],
		) => {
			if (runEvents.length === 0) return;
			if (!ownershipVerified && !(await verifyOwnership())) return;

			const agentTree = buildAgentTreeFromEvents(runEvents);
			// The fold records that a confirmation was requested, not that it was
			// answered. Settle cards whose pending row is gone (same check as the
			// history read); otherwise a client that reconnects mid-run re-arms a
			// card the server already consumed, and every click on it fails.
			await this.memoryService.flagExpiredConfirmations([{ agentTree }]);
			if (closed) return;
			res.write(
				`event: run-sync\ndata: ${JSON.stringify({
					runId: group.runIds.at(-1),
					messageGroupId: groupId,
					runIds: group.runIds,
					agentTree,
					status: group.status,
					backgroundTasks: threadStatus.backgroundTasks,
				})}\n\n`,
			);
		};

		// 6. Replay missed events from the durable log — survives restarts and is
		//    valid on any main (the table is in the shared DB). The reads are
		//    async, so live events can land mid-bootstrap: buffer them across
		//    every await (the
		//    replay read, the run-sync tree reads, AND the gap read) and flush
		//    with seq dedupe only when no await remains before live delivery
		//    takes over (the drain persists before it emits, so a fact is never
		//    in neither place). A flushed event may already be folded into a
		//    run-sync tree; the shared reducer applies it idempotently, same as
		//    any live event arriving after a frame.
		const arrivedDuringReplay: StoredEvent[] = [];
		const stopBuffering = this.eventBus.subscribe(threadId, (stored) => {
			arrivedDuringReplay.push(stored);
		});
		try {
			const missed = await this.eventLog.getEventsAfter(threadId, cursor);
			// The client may have disconnected during the read: stop before
			// writing to the dead response or arming the keep-alive below.
			if (closed) return;
			let lastReplayedSeq = cursor;
			for (const stored of missed) {
				deliver(stored);
				if (stored.id !== undefined) lastReplayedSeq = stored.id;
			}
			// Build each live group's bootstrap tree from the durable log, so the
			// group renders fully even when the process
			// restarted, or this main never buffered the thread (sibling main).
			// Remember which coalesced blocks each delivered tree folds: the gap
			// read below may return the same rows, and re-applying a block the
			// tree already renders would append a duplicate timeline entry.
			const blockKey = (event: {
				type: string;
				runId: string;
				agentId: string;
				responseId?: string;
				payload: { text: string };
			}) =>
				`${event.type}:${event.runId}:${event.agentId}:${event.responseId ?? ''}:${event.payload.text}`;
			const foldedBlockKeys = new Set<string>();
			for (const [groupId, group] of liveGroups) {
				const runEvents = await this.eventLog.getEventsForRuns(threadId, group.runIds);
				if (closed) return;
				await writeRunSyncFrame(groupId, group, runEvents);
				for (const event of runEvents) {
					if (event.type === 'text-block' || event.type === 'reasoning-block') {
						foldedBlockKeys.add(blockKey(event));
					}
				}
			}
			// One more durable read: coalesced blocks are persisted but never
			// live-emitted (live clients saw the deltas), so a segment that closed
			// during the awaits above exists only as rows the replay read predates
			// — invisible to the buffering subscription. Without this read, the
			// buffered fact that follows such a block would advance the browser
			// cursor past it and no later replay would ever return it.
			const gapRows = await this.eventLog.getEventsAfter(threadId, lastReplayedSeq);
			if (closed) return;
			// A still-streaming segment exists only in the log's coalesce buffer
			// (deltas are never persisted), so a mid-stream refresh would render
			// only the post-refresh tail. Serve each open segment as one ephemeral
			// delta frame (no `id:` line — the cursor stays on durable facts), after
			// the run-sync frames so live deltas keep appending to it and the
			// segment's eventual block replaces it. Everything from this read to
			// `bootstrapping = false` is synchronous, so a buffered delta of a
			// served segment is exactly text inside the snapshot: skipping it loses
			// nothing and delivering it would duplicate.
			const openSegments = this.eventLog.getOpenSegments(threadId);
			const segmentKey = (
				kind: 'text' | 'reasoning',
				event: { runId: string; agentId: string; responseId?: string },
			) => `${kind}:${event.runId}:${event.agentId}:${event.responseId ?? ''}`;
			const served = new Set(openSegments.map((segment) => segmentKey(segment.kind, segment)));
			// Deliver the gap rows first. A block identical to one folded into a
			// delivered run-sync tree is not re-applied (that would duplicate its
			// text) but still counts as delivered for cursor contiguity — its
			// content reached the client inside the frame. Buffered deltas of a
			// gap block's segment are skipped below like served ones: their text
			// is inside the block, and delivering them after it would duplicate.
			const gapBlockSegments = new Set<string>();
			for (const row of gapRows) {
				if (row.id === undefined || row.id <= lastReplayedSeq) continue;
				const { event } = row;
				if (event.type === 'text-block' || event.type === 'reasoning-block') {
					gapBlockSegments.add(
						segmentKey(event.type === 'text-block' ? 'text' : 'reasoning', event),
					);
					if (foldedBlockKeys.has(blockKey(event))) {
						lastReplayedSeq = row.id;
						continue;
					}
				}
				deliver(row);
				lastReplayedSeq = row.id;
			}
			for (const stored of arrivedDuringReplay) {
				if (stored.id !== undefined) {
					if (stored.id <= lastReplayedSeq) continue;
					if (stored.id === lastReplayedSeq + 1) {
						deliver(stored);
						lastReplayedSeq = stored.id;
						continue;
					}
					// Rows between the cursor and this fact were persisted after the
					// gap read (a segment closed while it was in flight): deliver the
					// fact's content but strip its id line, so the cursor never
					// crosses a row the client has not seen — the next replay returns
					// the missing block and re-applies this fact idempotently.
					deliver({ event: stored.event });
					continue;
				}
				const { event } = stored;
				if (
					(event.type === 'text-delta' || event.type === 'reasoning-delta') &&
					(served.has(segmentKey(event.type === 'text-delta' ? 'text' : 'reasoning', event)) ||
						gapBlockSegments.has(
							segmentKey(event.type === 'text-delta' ? 'text' : 'reasoning', event),
						))
				) {
					continue;
				}
				deliver(stored);
			}
			for (const segment of openSegments) {
				deliver({
					event: {
						type: segment.kind === 'text' ? 'text-delta' : 'reasoning-delta',
						runId: segment.runId,
						agentId: segment.agentId,
						...(segment.responseId ? { responseId: segment.responseId } : {}),
						payload: { text: segment.text },
					},
				});
			}
			this.durableLogMetrics.recordReplay(missed.length, Math.max(0, lastReplayedSeq - cursor));
		} finally {
			// The buffering subscription must not outlive the bootstrap, even when
			// a durable read throws.
			stopBuffering();
		}
		if (liveGroups.size > 0) res.flush?.();

		bootstrapping = false;

		// 7. Keep-alive
		keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);
	}

	@Post('/confirm/:requestId')
	@GlobalScope('instanceAi:message')
	async confirm(req: AuthenticatedRequest, _res: Response, @Param('requestId') requestId: string) {
		this.requireInstanceAiEnabled();

		// Manual parse: `@Body` decorator can't resolve zod discriminated unions via reflection,
		// so validate the request body against the union schema directly.
		const parseResult = InstanceAiConfirmRequestDto.safeParse(req.body);
		if (!parseResult.success) {
			throw new BadRequestError(parseResult.error.errors[0].message);
		}

		// The host-seeded onboarding card has no run to resume: settle it and post the follow-up
		// question as a finished synthetic run. The user's next chat message starts the first turn.
		// Free text in the card starts that turn now, with the answers as the message, so the model
		// check of `chat` applies; it runs before the card is consumed.
		if (startsOnboardingFirstTurn(requestId, parseResult.data)) {
			await this.requireModelConfigured();
		}
		const card = await this.onboarding.answerCard(req.user.id, requestId, parseResult.data);
		if (card) {
			const runId =
				'firstMessage' in card
					? this.instanceAiService.startRun(req.user, card.threadId, card.firstMessage)
					: card.runId;
			return { ok: true, runId };
		}

		const resolved = await this.instanceAiService.resolveConfirmation(
			req.user.id,
			requestId,
			parseResult.data,
		);
		if (!resolved) {
			throw new NotFoundError('Confirmation request not found or not authorized');
		}
		return resolved;
	}

	@Post('/chat/:threadId/cancel')
	@GlobalScope('instanceAi:message')
	async cancel(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		await this.instanceAiService.routeCancelRun(threadId);
		return { ok: true };
	}

	@Post('/feedback/:threadId/:responseId')
	@GlobalScope('instanceAi:message')
	async feedback(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('responseId') responseId: string,
		@Body payload: InstanceAiFeedbackRequestDto,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		// Fire-and-forget: never surface LangSmith errors to the UI. The service
		// logs its own failures; the .catch here guards against unhandled
		// rejections from paths not wrapped internally (e.g. DB lookups).
		void this.instanceAiService
			.submitLangsmithFeedback(req.user, threadId, responseId, payload)
			.catch(() => {});
		return { ok: true };
	}

	@Post('/chat/:threadId/tasks/:taskId/cancel')
	@GlobalScope('instanceAi:message')
	async cancelTask(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		await this.instanceAiService.routeCancelBackgroundTask(threadId, taskId);
		return { ok: true };
	}

	/** The live view of a cloud browser task. The link is never stored, so the client asks again. */
	@Get('/chat/:threadId/tasks/:taskId/cloud-browser-live-view')
	@GlobalScope('instanceAi:message')
	async cloudBrowserLiveView(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
	): Promise<InstanceAiCloudBrowserLiveViewResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return await this.cloudBrowserService.getLiveView(req.user.id, threadId, taskId);
	}

	/** The user takes control of a cloud browser task's browser. The agent's calls wait for them. */
	@Post('/chat/:threadId/tasks/:taskId/cloud-browser-take-over')
	@GlobalScope('instanceAi:message')
	async takeOverCloudBrowser(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		const error = this.cloudBrowserService.giveControlToUser(req.user.id, threadId, taskId);
		if (error) throw new ConflictError(error);
		return { ok: true };
	}

	/** The user gives control of a cloud browser task's browser back to its agent. */
	@Post('/chat/:threadId/tasks/:taskId/cloud-browser-return-control')
	@GlobalScope('instanceAi:message')
	async returnCloudBrowserControl(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
		@Body payload: InstanceAiCloudBrowserReturnControlRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		const error = this.cloudBrowserService.returnControlToAgent(
			req.user.id,
			threadId,
			taskId,
			payload.note || undefined,
		);
		if (error) throw new ConflictError(error);
		return { ok: true };
	}

	@Post('/chat/:threadId/tasks/:taskId/correct')
	@GlobalScope('instanceAi:message')
	async correctTask(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
		@Body payload: InstanceAiCorrectTaskRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		await this.instanceAiService.routeCorrectionToTask(threadId, taskId, payload.message);
		return { ok: true };
	}

	// ── Preference card (the save_user_preference result in the chat) ────────
	//
	// The thread check is the ownership boundary. The row check is inside
	// AiPreferenceService. The runId and the toolCallId are not verified against
	// the log on purpose, and the check would cost a log read on every click.
	// The fold ignores preference-card facts when it anchors a turn, so a wrong
	// pair can only mis-render that one card's state in the caller's own thread.

	@Post('/threads/:threadId/preferences/:preferenceId/undo')
	@GlobalScope('instanceAi:message')
	async undoPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('preferenceId') preferenceId: string,
		@Body payload: InstanceAiPreferenceCardUndoRequestDto,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		const event = await this.preferenceCardService.undo(req.user, threadId, preferenceId, payload);
		// The card applies the fact at once; the stream delivers the same one later.
		return { ok: true, event };
	}

	@Post('/threads/:threadId/preferences/:preferenceId/edit')
	@GlobalScope('instanceAi:message')
	async editPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('preferenceId') preferenceId: string,
		@Body payload: InstanceAiPreferenceCardEditRequestDto,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return await this.preferenceCardService.edit(req.user, threadId, preferenceId, payload);
	}

	// ── Credits ──────────────────────────────────────────────────────────────

	@Get('/credits')
	@GlobalScope('instanceAi:message')
	async getCredits(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		return await this.instanceAiService.getCredits(req.user);
	}

	// ── Admin settings (owner/admin only) ──────────────────────────────────

	@Get('/settings')
	@GlobalScope('instanceAi:manage')
	async getAdminSettings(_req: AuthenticatedRequest) {
		return await this.settingsService.getAdminSettings();
	}

	@Get('/settings/models')
	@GlobalScope('instanceAi:manage')
	async getModelCatalog(_req: AuthenticatedRequest) {
		return await this.modelCatalogService.getModels();
	}

	@Put('/settings')
	@GlobalScope('instanceAi:manage')
	async updateAdminSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiAdminSettingsUpdateRequest,
	) {
		const result = await this.settingsService.updateAdminSettings(payload, req.user);
		const [publishResult] = await Promise.allSettled([
			this.publisher.publishCommand({ command: 'reload-instance-ai-settings' }),
			this.applyAdminSettingsSideEffects(result),
		]);

		if (publishResult.status === 'rejected') {
			this.instanceAiErrorReporter.report(publishResult.reason, {
				component: 'settings-publish',
				threadId: 'admin-settings',
			});
		}

		return result;
	}

	@Post('/settings/verify/model')
	@GlobalScope('instanceAi:manage')
	async verifyModel(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifyModelRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifyModel(req.user, payload);
	}

	@Post('/settings/verify/sandbox')
	@GlobalScope('instanceAi:manage')
	async verifySandbox(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifySandboxRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifySandbox(req.user, payload);
	}

	@Post('/settings/verify/search')
	@GlobalScope('instanceAi:manage')
	async verifySearch(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiVerifySearchRequest,
	) {
		return await Container.get(InstanceAiVerificationService).verifySearch(payload);
	}

	@OnPubSubEvent('reload-instance-ai-settings', { instanceType: 'main' })
	async reloadAdminSettings() {
		await this.settingsService.reloadFromDb();
		await this.applyAdminSettingsSideEffects({
			enabled: this.settingsService.isInstanceAiEnabled(),
			browserUseEnabled: this.settingsService.isBrowserUseEnabled(),
		});
	}

	private async applyAdminSettingsSideEffects(
		settings: Pick<InstanceAiAdminSettingsResponse, 'enabled' | 'browserUseEnabled'>,
	) {
		const sideEffects: Array<() => Promise<void> | void> = [
			async () => {
				await this.moduleRegistry.refreshModuleSettings('instance-ai');
			},
			async () => {
				await this.moduleRegistry.refreshModuleSettings('agents');
			},
		];
		if (!settings.enabled || !settings.browserUseEnabled) {
			sideEffects.push(async () => await this.browserSessionService.shutdown());
		}

		const results = await Promise.allSettled(sideEffects.map(async (apply) => await apply()));
		for (const result of results) {
			if (result.status === 'rejected') {
				this.instanceAiErrorReporter.report(result.reason, {
					component: 'settings-side-effects',
					threadId: 'admin-settings',
				});
			}
		}
	}

	// ── User preferences (per-user, self-service) ──────────────────────────

	@Get('/preferences')
	@GlobalScope('instanceAi:message')
	async getUserPreferences(req: AuthenticatedRequest) {
		return await this.settingsService.getUserPreferences(req.user);
	}

	@Get('/settings/service-credentials')
	@GlobalScope('instanceAi:manage')
	async listServiceCredentials(_req: AuthenticatedRequest) {
		return await this.settingsService.listInstanceServiceCredentials();
	}

	@Get('/settings/model-credentials')
	@GlobalScope('instanceAi:manage')
	async listInstanceModelCredentials(_req: AuthenticatedRequest) {
		return await this.settingsService.listInstanceModelCredentials();
	}

	@Get('/threads')
	@GlobalScope('instanceAi:message')
	async listThreads(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		return await this.memoryService.listThreads(req.user.id);
	}

	@Get('/threads/history')
	@GlobalScope('instanceAi:message')
	async listThreadHistory(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: InstanceAiThreadHistoryQuery,
	) {
		this.requireInstanceAiEnabled();
		return await this.memoryService.listThreadHistory(req.user.id, query);
	}

	@Get('/threads/:threadId')
	@GlobalScope('instanceAi:message')
	async getThread(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return { thread: await this.memoryService.getThreadInfo(threadId) };
	}

	@Post('/threads')
	@GlobalScope('instanceAi:message')
	async ensureThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEnsureThreadRequest,
	) {
		this.requireInstanceAiEnabled();
		const project = await this.projectService.getProjectWithScope(req.user, payload.projectId, [
			'project:read',
		]);
		if (!project) {
			throw new ForbiddenError('You do not have access to the requested project');
		}
		const requestedThreadId = payload.threadId ?? randomUUID();
		await this.assertThreadAccess(req.user.id, requestedThreadId, { allowNew: true });

		const launchMetadata = {
			source: payload.source,
			origin: payload.origin ?? ('internal' as const),
			sourceContext: payload.sourceContext,
		};
		try {
			// An onboarding thread opens with the greeting and the first question card in place.
			return payload.source === 'onboarding'
				? await this.onboarding.ensureThread(
						req.user,
						requestedThreadId,
						payload.projectId,
						launchMetadata,
					)
				: await this.memoryService.ensureThread(
						req.user.id,
						requestedThreadId,
						payload.projectId,
						launchMetadata,
					);
		} catch (error) {
			this.instanceAiErrorReporter.report(error, {
				component: 'instance-ai-ensure-thread',
				threadId: requestedThreadId,
				userId: req.user.id,
				projectId: payload.projectId,
			});
			throw error;
		}
	}

	@Delete('/threads/:threadId')
	@GlobalScope('instanceAi:message')
	async deleteThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		await this.instanceAiService.routeClearThreadState(threadId, req.user.id);
		await this.memoryService.deleteThread(threadId);
		return { ok: true };
	}

	@Patch('/threads/:threadId')
	@GlobalScope('instanceAi:message')
	async renameThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiRenameThreadRequestDto,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		const thread = await this.memoryService.updateThread(threadId, {
			title: payload.title,
			metadata: payload.metadata,
		});
		return { thread };
	}

	@Get('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async getThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<InstanceAiThreadTabsResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return { state: await this.threadTabsService.getState(threadId, req.user.id) };
	}

	@Put('/threads/:threadId/tabs')
	@GlobalScope('instanceAi:message')
	async saveThreadTabs(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiThreadTabsRequestDto,
	): Promise<InstanceAiThreadTabsResponse> {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		// The DTO strips unknown keys, so the payload is the state to save.
		const state = { ...payload };
		await this.threadTabsService.saveState(threadId, req.user.id, state);
		return { state };
	}

	/**
	 * Persist the pending new-agent artifact this thread has open, and bind it to
	 * the thread in the same request. Idempotent under a concurrent writer on the
	 * same client-minted id (the chat's agent_builder_build_agent tool), unlike the strict
	 * project-scoped agent create.
	 */
	@Post('/threads/:threadId/agent')
	@GlobalScope('instanceAi:message')
	async persistPendingAgent(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Body payload: InstanceAiPersistPendingAgentRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return await this.pendingAgentService.persistAndBind(
			req.user,
			threadId,
			payload,
			req.headers?.['push-ref'],
		);
	}

	@Get('/threads/:threadId/messages')
	@GlobalScope('instanceAi:message')
	async getThreadMessages(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Query query: InstanceAiThreadMessagesQuery,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		await this.instanceAiService.replayUndeliveredTerminalOutcomes(threadId);
		void this.instanceAiService.maybeDeliverCloudBrowserTaskResults(req.user, threadId);

		// ?raw=true returns the old format for the thread inspector
		if (query.raw === 'true') {
			return await this.memoryService.getThreadMessages(req.user.id, threadId, {
				limit: query.limit,
				page: query.page,
			});
		}

		// Exclude snapshots for active/suspended runs — they have no matching
		// assistant message in native memory yet and would misalign the
		// positional snapshot-to-message matching in parseStoredMessages. The
		// live message-group ids ride along so the durable-log fold can exclude
		// a whole in-flight group even when the active run's own run-start row
		// has not been persisted yet (it is the group mapping's source there).
		const threadStatus = this.instanceAiService.getThreadStatus(threadId);
		const activeRunId = this.instanceAiService.getActiveRunId(threadId);
		const excludeRunIds: string[] = [];
		const excludeMessageGroupIds: string[] = [];
		if (activeRunId) {
			excludeRunIds.push(activeRunId);
			const activeGroupId = this.instanceAiService.getMessageGroupId(threadId);
			if (activeGroupId) excludeMessageGroupIds.push(activeGroupId);
		}
		for (const t of threadStatus.backgroundTasks) {
			if (t.status !== 'running') continue;
			// The turn is already saved and no longer live, so we don't exclude it from history.
			if (t.detachedFromTurn) continue;
			if (t.runId) excludeRunIds.push(t.runId);
			if (t.messageGroupId) excludeMessageGroupIds.push(t.messageGroupId);
		}

		const result = await this.memoryService.getRichMessages(req.user.id, threadId, {
			limit: query.limit,
			page: query.page,
			excludeRunIds: excludeRunIds.length > 0 ? excludeRunIds : undefined,
			excludeMessageGroupIds:
				excludeMessageGroupIds.length > 0 ? excludeMessageGroupIds : undefined,
		});

		// Include the next SSE event ID so the frontend can skip past events
		// already covered by these historical messages (prevents duplicates).
		// Read from the log, so the cursor is valid across restarts and across
		// mains sharing the database.
		//
		// The applied-preferences payload rides along because the messages
		// endpoint is what opens a thread: without it a reopened thread could
		// only claim "none applied" until its next turn.
		//
		// Cursor first, payload second, on purpose. A turn that commits its
		// `preferences-applied` fact between the two reads then lands in the
		// payload AND replays over SSE (a harmless repeat). The other order
		// would move the cursor past a fact the payload never saw.
		const nextEventId = await this.eventLog.getNextEventId(threadId);
		const appliedPreferences = await this.eventLog.getLastAppliedPreferences(threadId);
		return {
			...result,
			nextEventId,
			...(appliedPreferences ? { appliedPreferences } : {}),
		};
	}

	@Get('/threads/:threadId/status')
	@GlobalScope('instanceAi:message')
	async getThreadStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		this.requireInstanceAiEnabled();
		// Allow new threads — the frontend polls status before the first message is sent
		await this.assertThreadAccess(req.user.id, threadId, { allowNew: true });
		return this.instanceAiService.getThreadStatus(threadId);
	}

	@Get('/debug/runs/:runId')
	@GlobalScope('instanceAi:message')
	async getRunDebug(req: AuthenticatedRequest, _res: Response, @Param('runId') runId: string) {
		this.requireInstanceAiEnabled();
		this.requireRunDebugEnabled();
		const record = this.instanceAiService.getRunDebug(runId);
		if (!record) {
			throw new NotFoundError('Run debug record not found');
		}
		await this.assertThreadAccess(req.user.id, record.threadId);
		return record;
	}

	@Get('/debug/threads/:threadId/runs')
	@GlobalScope('instanceAi:message')
	async listThreadDebugRuns(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		this.requireInstanceAiEnabled();
		this.requireRunDebugEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		return {
			threadId,
			runs: this.instanceAiService.listThreadDebugRuns(threadId),
		};
	}

	// ── Browser Use endpoints ───────────────────────────────────────────────────

	@Post('/browser/create-link')
	@GlobalScope('instanceAi:gateway')
	async createBrowserLink(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		this.assertBrowserChannelEnabled();
		return await this.browserSessionService.createLink(req.user.id);
	}

	@Get('/browser/status')
	@GlobalScope('instanceAi:gateway')
	browserStatus(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		this.assertBrowserChannelEnabled();
		return this.browserSessionService.getStatus(req.user.id);
	}

	@Post('/browser/disconnect-session')
	@GlobalScope('instanceAi:gateway')
	async browserDisconnectSession(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		await this.browserSessionService.disconnect(req.user.id);
		return { ok: true };
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private assertBrowserChannelEnabled(): void {
		if (!this.settingsService.isBrowserUseEnabled()) {
			throw new ForbiddenError('Browser Use is disabled');
		}
	}

	/**
	 * Verify thread ownership. Throws ForbiddenError if another user owns it.
	 * @param allowNew When true, a non-existent thread is permitted (new conversation).
	 */
	private async assertThreadAccess(
		userId: string,
		threadId: string,
		options?: { allowNew?: boolean },
	): Promise<void> {
		const ownership = await this.memoryService.checkThreadOwnership(userId, threadId);
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}
		if (!options?.allowNew && ownership === 'not_found') {
			throw new NotFoundError('Thread not found');
		}
	}

	private writeSseEvent(res: FlushableResponse, stored: StoredEvent): void {
		// No `event:` field — events are discriminated by data.type per streaming-protocol.md.
		// Ephemeral events (deltas/status) carry no `id:` line, so the browser's
		// Last-Event-ID only ever advances on durable facts — same precedent as
		// the run-sync control frames above.
		const idLine = stored.id !== undefined ? `id: ${stored.id}\n` : '';
		res.write(`${idLine}data: ${JSON.stringify(stored.event)}\n\n`);
		res.flush?.();
	}
}
