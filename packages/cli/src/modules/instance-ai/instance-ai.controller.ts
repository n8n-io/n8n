import {
	InstanceAiConfirmRequestDto,
	InstanceAiFeedbackRequestDto,
	InstanceAiGatewayCapabilitiesDto,
	InstanceAiGatewayCreateCredentialDto,
	InstanceAiFilesystemResponseDto,
	InstanceAiRenameThreadRequestDto,
	InstanceAiSendMessageRequest,
	InstanceAiEventsQuery,
	instanceAiGatewayKeySchema,
	InstanceAiCorrectTaskRequest,
	InstanceAiEnsureThreadRequest,
	InstanceAiThreadMessagesQuery,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiEvalExecutionRequest,
	InstanceAiEvalAgentExecutionRequest,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalSeedDataTableRowsRequest,
} from '@n8n/api-types';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import {
	RestController,
	GlobalScope,
	Middleware,
	Get,
	Post,
	Put,
	Patch,
	Delete,
	Param,
	Body,
	Query,
} from '@n8n/decorators';
import type { AgentTreeSnapshot, StoredEvent } from '@n8n/instance-ai';
import { buildAgentTreeFromEvents } from '@n8n/instance-ai';
import { UnsupportedAttachmentError, validateAttachmentMimeTypes } from '@n8n/instance-ai/parsers';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { InstanceAiBrowserSessionService } from './browser/instance-ai-browser-session.service';
import { EvalAgentExecutionService } from './eval/agent-execution.service';
import { EvalExecutionService } from './eval/execution.service';
import { EvalThreadCredentialAllowlistService } from './eval/thread-credential-allowlist.service';
import { EvalThreadRestoreService } from './eval/thread-restore.service';
import { DurableEventLog } from './event-bus/durable-event-log';
import { DurableLogMetrics } from './event-bus/durable-log-metrics';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiErrorReporterService } from './instance-ai-error-reporter.service';
import { InstanceAiGatewayService } from './instance-ai-gateway.service';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiService } from './instance-ai.service';
import { CredentialsService } from '@/credentials/credentials.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Push } from '@/push';
import { ProjectService } from '@/services/project.service.ee';
import { UrlService } from '@/services/url.service';

type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

@RestController('/instance-ai')
export class InstanceAiController {
	private readonly gatewayApiKey: string;

	/** Durable-log prototype flag (N8N_INSTANCE_AI_DURABLE_LOG): replay and
	 *  cursors come from the DB-backed log instead of the in-memory bus. */
	private readonly durableLogEnabled: boolean;

	private static getTreeRichnessScore(tree: InstanceAiAgentNode): number {
		let score = 0;
		const stack = [tree];

		while (stack.length > 0) {
			const node = stack.pop()!;
			score += 100;
			score += node.toolCalls.length * 10;
			score += node.timeline.length * 2;
			score += (node.planItems?.length ?? 0) * 20;
			score += node.toolCalls.filter((toolCall) => toolCall.confirmation).length * 50;
			score += node.children.length * 25;
			stack.push(...node.children);
		}

		return score;
	}

	private static selectBootstrapTree(
		eventTree: InstanceAiAgentNode,
		persistedTree?: InstanceAiAgentNode,
	): InstanceAiAgentNode {
		if (!persistedTree) return eventTree;

		return InstanceAiController.getTreeRichnessScore(persistedTree) >
			InstanceAiController.getTreeRichnessScore(eventTree)
			? persistedTree
			: eventTree;
	}

	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly gatewayService: InstanceAiGatewayService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly evalExecutionService: EvalExecutionService,
		private readonly evalAgentExecutionService: EvalAgentExecutionService,
		private readonly evalCredentialAllowlists: EvalThreadCredentialAllowlistService,
		private readonly evalThreadRestore: EvalThreadRestoreService,
		private readonly eventBus: InProcessEventBus,
		private readonly eventLog: DurableEventLog,
		private readonly durableLogMetrics: DurableLogMetrics,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly push: Push,
		private readonly urlService: UrlService,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly instanceAiErrorReporter: InstanceAiErrorReporterService,
		globalConfig: GlobalConfig,
	) {
		this.gatewayApiKey = globalConfig.instanceAi.gatewayApiKey;
		this.durableLogEnabled = globalConfig.instanceAi.durableLog;
	}

	private requireInstanceAiEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
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
			} catch (error) {
				if (error instanceof UnsupportedAttachmentError) {
					const summary = error.unsupported.map((u) => `${u.fileName} (${u.mimeType})`).join(', ');
					throw new BadRequestError(
						`Unsupported attachment type: ${summary}. Supported types include CSV, JSON, ` +
							'PDF, DOCX, XLSX, HTML, plain text, markdown, and images.',
					);
				}
				throw error;
			}
		}

		// One active run per thread
		if (this.instanceAiService.hasActiveRun(threadId)) {
			throw new ConflictError('A run is already active for this thread');
		}

		const runId = this.instanceAiService.startRun(
			req.user,
			threadId,
			payload.message,
			payload.attachments,
			payload.context,
			payload.timeZone,
			payload.pushRef,
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
		// When the thread didn't exist at connect time, another user could create
		// and own it before events start flowing. We re-check once on the first
		// event and close the stream if ownership changed. Events are buffered
		// until the check resolves to prevent leaking data during the async gap.
		let ownershipVerified = ownership === 'owned';
		let ownershipCheckInFlight = false;
		const pendingEvents: StoredEvent[] = [];
		const userId = req.user.id;

		// 1. Subscribe to live events before the async bootstrap below.
		//    hasSubscribers() must be true across the awaits that follow: in
		//    multi-main, sibling mains drop relayed events for threads without a
		//    local subscriber, so a relayed event arriving during an await would
		//    otherwise be lost for good. Events emitted while bootstrapping are
		//    NOT delivered here — they land in the event store and the replay in
		//    step 6 picks them up, avoiding duplicates.
		let bootstrapping = true;

		const deliver = (stored: StoredEvent) => {
			if (ownershipVerified) {
				this.writeSseEvent(res, stored);
				return;
			}

			// When the thread was not_found at connect time, re-validate ownership
			// on the first event. Buffer all events until the check resolves to
			// avoid leaking data during the async gap.
			pendingEvents.push(stored);

			if (ownershipCheckInFlight) return;
			ownershipCheckInFlight = true;

			void this.memoryService
				.checkThreadOwnership(userId, threadId)
				.then((currentOwnership) => {
					if (currentOwnership === 'other_user') {
						res.end();
						return;
					}
					ownershipVerified = true;
					for (const buffered of pendingEvents) {
						this.writeSseEvent(res, buffered);
					}
					pendingEvents.length = 0;
				})
				.catch(() => {
					pendingEvents.length = 0;
					res.end();
				});
		};

		const unsubscribe = this.eventBus.subscribe(threadId, (stored) => {
			if (bootstrapping) return;
			deliver(stored);
		});

		// Cleanup is registered before the async bootstrap so a client disconnect
		// (or an error response) during the awaits below doesn't leak the
		// subscription.
		let closed = false;
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
			await this.instanceAiService.replayUndeliveredTerminalOutcomes(threadId, {
				delivery: 'event',
			});
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

		// 5. Collect live message groups and fetch their persisted snapshots.
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
			if (!liveGroups.has(task.messageGroupId)) {
				liveGroups.set(task.messageGroupId, {
					runIds: this.instanceAiService.getRunIdsForMessageGroup(task.messageGroupId),
					status: 'background',
				});
			}
		}

		const persistedSnapshots = new Map<string, AgentTreeSnapshot | undefined>();
		for (const [groupId, group] of liveGroups) {
			persistedSnapshots.set(
				groupId,
				await this.memoryService.getLatestRunSnapshot(threadId, {
					messageGroupId: groupId,
					// Use the group's own latest runId — NOT the thread-global
					// activeRunId, which belongs to the current orchestrator turn and
					// would be wrong for background groups from older turns.
					runId: group.runIds.at(-1),
				}),
			);
		}

		// The client may have disconnected during the awaits above.
		if (closed) return;

		// 6b (used by both arms below). Emit one run-sync control frame for a live
		//     message group. Each frame uses a named SSE event type
		//     (event: run-sync) with NO id: field so the browser's lastEventId is
		//     unaffected and the replay cursor stays consistent.
		const writeRunSyncFrame = (
			groupId: string,
			group: { runIds: string[]; status: 'active' | 'suspended' | 'background' },
			runEvents: InstanceAiEvent[],
		) => {
			const persistedSnapshot = persistedSnapshots.get(groupId);
			if (runEvents.length === 0 && !persistedSnapshot) return;

			const eventTree = buildAgentTreeFromEvents(runEvents);
			const agentTree = InstanceAiController.selectBootstrapTree(
				eventTree,
				persistedSnapshot?.tree,
			);
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

		if (this.durableLogEnabled) {
			// 6. Replay missed events from the DURABLE log — survives restarts and is
			//    valid on any main (the table is in the shared DB). The reads are
			//    async, so unlike the old synchronous memory-store replay, live
			//    events can land mid-bootstrap: buffer them across every await (the
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
				// group renders fully even when the bus cache was evicted, the process
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
					writeRunSyncFrame(groupId, group, runEvents);
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
		} else {
			// 6. Replay missed events, emit run-sync frames, and flip to live delivery
			//    in one synchronous block. The event bus store and emitter are
			//    synchronous, so no event can slip between the replay and the live
			//    handler taking over. Events that arrived during the awaits above are
			//    already in the store (the early subscription in step 1 keeps relayed
			//    events flowing in multi-main) and are included in the replay here.
			const missed = this.eventBus.getEventsAfter(threadId, cursor);
			for (const stored of missed) {
				deliver(stored);
			}
			for (const [groupId, group] of liveGroups) {
				writeRunSyncFrame(groupId, group, this.eventBus.getEventsForRuns(threadId, group.runIds));
			}
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
		return this.settingsService.getAdminSettings();
	}

	@Put('/settings')
	@GlobalScope('instanceAi:manage')
	async updateAdminSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiAdminSettingsUpdateRequest,
	) {
		const result = await this.settingsService.updateAdminSettings(payload);
		await this.moduleRegistry.refreshModuleSettings('instance-ai');

		if (payload.enabled === false || payload.browserUseEnabled === false) {
			await this.browserSessionService.shutdown();
		}

		if (payload.enabled === false || payload.localGatewayDisabled === true) {
			const disconnectedUserIds = this.gatewayService.disconnectAllGateways();
			if (disconnectedUserIds.length > 0) {
				this.push.sendToUsers(
					{
						type: 'instanceAiGatewayStateChanged',
						data: {
							connected: false,
							directory: null,
							hostIdentifier: null,
							toolCategories: [],
						},
					},
					disconnectedUserIds,
				);
			}
		}

		return result;
	}

	// ── User preferences (per-user, self-service) ──────────────────────────

	@Get('/preferences')
	@GlobalScope('instanceAi:message')
	async getUserPreferences(req: AuthenticatedRequest) {
		return await this.settingsService.getUserPreferences(req.user);
	}

	@Put('/preferences')
	@GlobalScope('instanceAi:message')
	async updateUserPreferences(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiUserPreferencesUpdateRequest,
	) {
		const result = await this.settingsService.updateUserPreferences(req.user, payload);
		if (payload.localGatewayDisabled !== undefined) {
			await this.moduleRegistry.refreshModuleSettings('instance-ai');
		}
		return result;
	}

	@Get('/settings/credentials')
	@GlobalScope('instanceAi:message')
	async listModelCredentials(req: AuthenticatedRequest) {
		return await this.settingsService.listModelCredentials(req.user);
	}

	@Get('/settings/service-credentials')
	@GlobalScope('instanceAi:manage')
	async listServiceCredentials(req: AuthenticatedRequest) {
		return await this.settingsService.listServiceCredentials(req.user);
	}

	@Get('/threads')
	@GlobalScope('instanceAi:message')
	async listThreads(req: AuthenticatedRequest) {
		this.requireInstanceAiEnabled();
		return await this.memoryService.listThreads(req.user.id);
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
			return await this.memoryService.ensureThread(
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
		await this.instanceAiService.routeClearThreadState(threadId);
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
		// Flag on: durable authority, valid across restarts and mains. Flag off:
		// the shared sequence, so the cursor is valid against any main.
		const nextEventId = this.durableLogEnabled
			? await this.eventLog.getNextEventId(threadId)
			: await this.eventBus.getNextEventId(threadId);
		return { ...result, nextEventId };
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

	// ── Evaluation endpoints ──────────────────────────────────────────────────

	// Runs for minutes; the eval client (N8nClient) disables undici's 300s timeout for it.
	@Post('/eval/execute-with-llm-mock/:workflowId')
	@GlobalScope('instanceAi:eval')
	async executeWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body payload: InstanceAiEvalExecutionRequest,
	) {
		return await this.evalExecutionService.executeWithLlmMock(workflowId, req.user, payload);
	}

	// Runs for minutes; same client timeout handling as the workflow variant.
	@Post('/eval/execute-agent-with-llm-mock/:agentId')
	@GlobalScope('instanceAi:eval')
	async executeAgentWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: InstanceAiEvalAgentExecutionRequest,
	) {
		return await this.evalAgentExecutionService.executeWithLlmMock(agentId, req.user, payload);
	}

	/**
	 * Pin a build thread's credential view to a declared set. Only narrows:
	 * `list()` results are intersected with these IDs, so the caller cannot see
	 * anything they couldn't already access. The thread must exist — entries are
	 * cleared with the thread's state, so pins for never-created threads would
	 * be uncollectable.
	 */
	@Post('/eval/thread-credential-allowlist')
	@GlobalScope('instanceAi:eval')
	async setThreadCredentialAllowlist(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalCredentialAllowlistRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		this.evalCredentialAllowlists.set(payload.threadId, payload.credentialIds);
		return { ok: true };
	}

	/**
	 * Seed an existing (owned) thread with a previously exported conversation:
	 * recreate the workflow artifacts the history references (node credentials
	 * stripped — see `EvalThreadRestoreService`), then write the native message
	 * log verbatim. The thread then continues as if the conversation really
	 * happened, so an eval can drive the next turn live.
	 */
	@Post('/eval/restore-thread')
	@GlobalScope('instanceAi:eval')
	async restoreEvalThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalRestoreThreadRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		const projectId = await this.memoryService.getThreadProjectId(payload.threadId);
		if (!projectId) {
			throw new BadRequestError('Thread is not bound to a project');
		}

		const workflows = payload.workflows ?? [];
		// Data tables first: the workflows reference them, and their ids are
		// rewritten to the recreated tables' ids during workflow restore.
		const idMap = await this.evalThreadRestore.restoreDataTables(
			payload.dataTables ?? [],
			projectId,
			{ uniquifyNames: payload.uniquifyNames ?? true },
		);
		const dataTableIds = [...idMap.values()];
		// Roll back everything we created if a later step fails, so a partial
		// restore doesn't leak workflows/tables into the shared eval project.
		let restored = 0;
		let createdWorkflowIds: string[] = [];
		try {
			createdWorkflowIds = await this.evalThreadRestore.restoreWorkflows(
				workflows,
				projectId,
				idMap,
			);
			// A data-table-only seed (TRUST-311) sends no messages — skip the write.
			if (payload.messages.length > 0) {
				({ restored } = await this.memoryService.restoreThreadMessages(
					req.user.id,
					payload.threadId,
					payload.messages,
				));
			}
		} catch (error) {
			await this.evalThreadRestore.deleteWorkflows(createdWorkflowIds);
			await this.evalThreadRestore.deleteDataTables(dataTableIds, projectId);
			throw error;
		}
		return {
			ok: true,
			threadId: payload.threadId,
			restored,
			workflowIds: workflows.map((workflow) => workflow.id),
			dataTableIds,
		};
	}

	/**
	 * Reset an existing data table's rows to exactly the supplied set
	 * (clear-then-insert). The eval harness pre-creates a case's scenario data
	 * tables empty before the build turn (so the agent binds the real table id),
	 * then calls this per scenario to swap in that scenario's rows (TRUST-311
	 * follow-up). Auth + project scoping mirror restore-thread: the table must be
	 * in the thread's project.
	 */
	@Post('/eval/seed-data-table-rows')
	@GlobalScope('instanceAi:eval')
	async seedEvalDataTableRows(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalSeedDataTableRowsRequest,
	) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, payload.threadId);
		const projectId = await this.memoryService.getThreadProjectId(payload.threadId);
		if (!projectId) {
			throw new BadRequestError('Thread is not bound to a project');
		}
		await this.evalThreadRestore.reseedDataTableRows(payload.tableId, projectId, payload.rows);
		return { ok: true, tableId: payload.tableId, rowCount: payload.rows.length };
	}

	// ── Gateway endpoints (daemon ↔ server) ──────────────────────────────────

	@Post('/gateway/create-link')
	@GlobalScope('instanceAi:gateway')
	async createGatewayLink(req: AuthenticatedRequest) {
		await this.assertGatewayEnabled(req.user.id);
		const token = this.gatewayService.generatePairingToken(req.user.id);
		const expiresAt = this.gatewayService.getGatewayApiKeyExpiresAt(req.user.id, token);
		const ttlSeconds = expiresAt
			? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
			: null;
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const command = `npx @n8n/computer-use ${baseUrl} ${token}`;
		return { token, command, expiresAt: expiresAt?.toISOString() ?? null, ttlSeconds };
	}

	@Get('/gateway/events', { usesTemplates: true, skipAuth: true })
	async gatewayEvents(req: Request, res: FlushableResponse) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));
		await this.assertGatewayEnabled(userId);

		const gateway = this.gatewayService.getLocalGateway(userId);

		// If the grace-period timer already fired (e.g. after a long reconnect gap),
		// the gateway state is torn down. Reject so the daemon falls into its auth-error
		// reconnect branch, which re-uploads capabilities and re-establishes state.
		if (!gateway.isConnected) {
			throw new ForbiddenError('Local gateway not initialized');
		}

		// Daemon reconnected within the grace window — cancel the pending disconnect.
		this.gatewayService.clearDisconnectTimer(userId);

		(res as unknown as { compress: boolean }).compress = false;
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		const unsubscribeRequest = gateway.onRequest((event) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
			res.flush?.();
		});
		const unsubscribeDisconnect = gateway.onDisconnect((event) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
			res.flush?.();
			res.end();
		});

		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);

		let cleanedUp = false;
		const cleanup = () => {
			if (cleanedUp) return;
			cleanedUp = true;
			unsubscribeRequest();
			unsubscribeDisconnect();
			clearInterval(keepAlive);
			this.gatewayService.startDisconnectTimer(userId, () => {
				this.push.sendToUsers(
					{
						type: 'instanceAiGatewayStateChanged',
						data: {
							connected: false,
							directory: null,
							hostIdentifier: null,
							toolCategories: [],
						},
					},
					[userId],
				);
			});
		};
		res.once('close', cleanup);
		res.once('finish', cleanup);
	}

	@Post('/gateway/init', { skipAuth: true })
	async gatewayInit(req: Request, _res: Response, @Body payload: InstanceAiGatewayCapabilitiesDto) {
		const key = this.getGatewayKeyHeader(req);
		const userId = this.validateGatewayApiKey(key);
		await this.assertGatewayEnabled(userId);

		this.gatewayService.initGateway(userId, payload);
		this.gatewayService.applyToolPolicy(userId);

		const status = this.gatewayService.getGatewayStatus(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: {
					connected: status.connected,
					directory: status.directory,
					hostIdentifier: status.hostIdentifier,
					toolCategories: status.toolCategories,
				},
			},
			[userId],
		);

		// Try to consume a pairing token and upgrade to a session key
		const sessionKey = key ? this.gatewayService.consumePairingToken(userId, key) : null;
		if (sessionKey) {
			return { ok: true, sessionKey };
		}
		return { ok: true };
	}

	@Post('/gateway/disconnect', { skipAuth: true })
	gatewayDisconnect(req: Request) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));

		this.gatewayService.clearDisconnectTimer(userId);
		this.gatewayService.disconnectGateway(userId);
		this.gatewayService.clearActiveSessionKey(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
			},
			[userId],
		);
		return { ok: true };
	}

	@Post('/gateway/response/:requestId', { skipAuth: true })
	gatewayResponse(
		req: Request,
		_res: Response,
		@Param('requestId') requestId: string,
		@Body payload: InstanceAiFilesystemResponseDto,
	) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));

		const resolved = this.gatewayService.resolveGatewayRequest(
			userId,
			requestId,
			payload.result,
			payload.error,
		);
		if (!resolved) {
			throw new NotFoundError('Gateway request not found or already resolved');
		}
		return { ok: true };
	}

	@Post('/gateway/credentials', { skipAuth: true })
	async gatewayCreateCredential(
		req: Request,
		_res: Response,
		@Body payload: InstanceAiGatewayCreateCredentialDto,
	) {
		const user = await this.resolveGatewayUser(this.getGatewayKeyHeader(req));
		await this.assertGatewayEnabled(user.id);
		const credential = await this.credentialsService.createUnmanagedCredential(payload, user);
		return { credentialId: credential.id };
	}

	@Get('/gateway/status')
	@GlobalScope('instanceAi:gateway')
	async gatewayStatus(req: AuthenticatedRequest) {
		await this.assertGatewayEnabled(req.user.id);
		this.gatewayService.applyToolPolicy(req.user.id);
		return this.gatewayService.getGatewayStatus(req.user.id);
	}

	/**
	 * User-initiated gateway disconnect. Tears down the paired daemon session
	 * so its tools are no longer exposed to the agent, without changing the
	 * user's preference to disabled.
	 */
	@Post('/gateway/disconnect-session')
	@GlobalScope('instanceAi:gateway')
	async gatewayDisconnectSession(req: AuthenticatedRequest) {
		const userId = req.user.id;
		this.gatewayService.clearDisconnectTimer(userId);
		this.gatewayService.disconnectGateway(userId);
		this.gatewayService.clearActiveSessionKey(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
			},
			[userId],
		);
		return { ok: true };
	}

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
		if (!this.settingsService.getAdminSettings().browserUseEnabled) {
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

	/** Throw if the local gateway is disabled globally or for this user. */
	private async assertGatewayEnabled(userId: string): Promise<void> {
		if (await this.settingsService.isLocalGatewayDisabledForUser(userId)) {
			throw new ForbiddenError('Local gateway is disabled');
		}
	}

	/**
	 * Safely extract and validate the x-gateway-key header value.
	 * Headers can be string | string[] | undefined — take only the first value
	 * and validate against the shared gateway key schema.
	 */
	private getGatewayKeyHeader(req: Request): string | undefined {
		const raw = req.headers['x-gateway-key'];
		const value = Array.isArray(raw) ? raw[0] : raw;
		const parsed = instanceAiGatewayKeySchema.safeParse(value);
		return parsed.success ? parsed.data : undefined;
	}

	/**
	 * Validate the gateway API key from query param or header.
	 * Accepts: static env var key, one-time pairing token (init only), or active session key.
	 * Returns the userId associated with the key.
	 */
	private validateGatewayApiKey(key: string | undefined): string {
		if (!key) {
			throw new ForbiddenError('Missing API key');
		}
		const actual = Buffer.from(key);

		// Check static env var key — out of user-scoped flow, uses a sentinel userId
		if (this.gatewayApiKey) {
			const expected = Buffer.from(this.gatewayApiKey);
			if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
				return 'env-gateway';
			}
		}

		// Check per-user pairing token or session key via reverse lookup
		const userId = this.gatewayService.getUserIdForApiKey(key);
		if (userId) return userId;

		throw new ForbiddenError('Invalid API key');
	}

	/**
	 * Resolve a gateway API key to its associated User. Requires a user-scoped
	 * key — the static env-var key (which has no associated DB user) is rejected.
	 */
	private async resolveGatewayUser(key: string | undefined): Promise<User> {
		const userId = this.validateGatewayApiKey(key);
		if (userId === 'env-gateway') {
			throw new ForbiddenError('Credential creation requires a user-scoped gateway key');
		}
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role', 'role.scopes'],
		});
		if (!user) throw new ForbiddenError('Invalid API key');
		return user;
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
