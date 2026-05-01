import {
	InstanceAiConfirmRequestDto,
	InstanceAiFeedbackRequestDto,
	InstanceAiGatewayCapabilitiesDto,
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
	InstanceAiEvalSubAgentRequest,
} from '@n8n/api-types';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
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
import type { StoredEvent } from '@n8n/instance-ai';
import { buildAgentTreeFromEvents } from '@n8n/instance-ai';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { EvalExecutionService } from './eval/execution.service';
import { SubAgentEvalService } from './eval/sub-agent-eval.service';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiService } from './instance-ai.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Push } from '@/push';
import { UrlService } from '@/services/url.service';

type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

@RestController('/instance-ai')
export class InstanceAiController {
	private readonly gatewayApiKey: string;

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
		private readonly memoryService: InstanceAiMemoryService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly evalExecutionService: EvalExecutionService,
		private readonly subAgentEvalService: SubAgentEvalService,
		private readonly eventBus: InProcessEventBus,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly push: Push,
		private readonly urlService: UrlService,
		globalConfig: GlobalConfig,
	) {
		this.gatewayApiKey = globalConfig.instanceAi.gatewayApiKey;
	}

	private requireInstanceAiEnabled(): void {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
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

		// One active run per thread
		if (this.instanceAiService.hasActiveRun(threadId)) {
			throw new ConflictError('A run is already active for this thread');
		}

		const runId = this.instanceAiService.startRun(
			req.user,
			threadId,
			payload.message,
			payload.researchMode,
			payload.attachments,
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

		// 1. Set SSE headers.
		// Disable response compression — SSE streams small chunks where compression
		// overhead exceeds the benefit, and each Brotli compressor retains ~8.6 MB
		// of native memory for the lifetime of the connection.
		(res as unknown as { compress: boolean }).compress = false;
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		// 2. Determine replay cursor
		//    Last-Event-ID header (browser auto-reconnect) takes precedence over query param.
		//    Both are validated as non-negative integers; invalid values fall back to 0.
		const headerValue = req.headers['last-event-id'];
		const parsedHeader = headerValue ? parseInt(String(headerValue), 10) : NaN;
		const cursor =
			Number.isFinite(parsedHeader) && parsedHeader >= 0 ? parsedHeader : (query.lastEventId ?? 0);

		// 3. Replay missed events then subscribe in the same tick.
		//    Since InProcessEventBus is synchronous and single-threaded (Node.js
		//    event loop), there is no window for missed events between replay and
		//    subscribe when done in the same synchronous block.
		const missed = this.eventBus.getEventsAfter(threadId, cursor);
		for (const stored of missed) {
			this.writeSseEvent(res, stored);
		}

		// 3b. Bootstrap sync: emit one run-sync control frame per live message group.
		//     Multiple groups can be active simultaneously when a background task
		//     from an older turn outlives its original turn. Each frame uses named
		//     SSE event type (event: run-sync) with NO id: field so the browser's
		//     lastEventId is unaffected and replay cursor stays consistent.
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

		for (const [groupId, group] of liveGroups) {
			const runEvents = this.eventBus.getEventsForRuns(threadId, group.runIds);
			// Use the group's own latest runId — NOT the thread-global activeRunId,
			// which belongs to the current orchestrator turn and would be wrong for
			// background groups from older turns.
			const groupRunId = group.runIds.at(-1);
			const persistedSnapshot = await this.memoryService.getLatestRunSnapshot(threadId, {
				messageGroupId: groupId,
				runId: groupRunId,
			});
			if (runEvents.length === 0 && !persistedSnapshot) continue;

			const eventTree = buildAgentTreeFromEvents(runEvents);
			const agentTree = InstanceAiController.selectBootstrapTree(
				eventTree,
				persistedSnapshot?.tree,
			);
			res.write(
				`event: run-sync\ndata: ${JSON.stringify({
					runId: groupRunId,
					messageGroupId: groupId,
					runIds: group.runIds,
					agentTree,
					status: group.status,
					backgroundTasks: threadStatus.backgroundTasks,
				})}\n\n`,
			);
		}
		if (liveGroups.size > 0) res.flush?.();

		// 4. Subscribe to live events
		// When the thread was not_found at connect time, re-validate ownership on
		// the first event. Buffer all events until the check resolves to avoid
		// leaking data during the async gap.
		const unsubscribe = this.eventBus.subscribe(threadId, (stored) => {
			if (ownershipVerified) {
				this.writeSseEvent(res, stored);
				return;
			}

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
		});

		// 5. Keep-alive
		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);

		// 6. Cleanup on disconnect
		const cleanup = () => {
			unsubscribe();
			clearInterval(keepAlive);
		};
		req.once('close', cleanup);
		res.once('finish', cleanup);
	}

	@Post('/confirm/:requestId')
	@GlobalScope('instanceAi:message')
	async confirm(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('requestId') requestId: string,
		@Body body: InstanceAiConfirmRequestDto,
	) {
		this.requireInstanceAiEnabled();
		const resolved = await this.instanceAiService.resolveConfirmation(req.user.id, requestId, {
			approved: body.approved,
			credentialId: body.credentialId,
			credentials: body.credentials,
			nodeCredentials: body.nodeCredentials,
			autoSetup: body.autoSetup,
			userInput: body.userInput,
			domainAccessAction: body.domainAccessAction,
			action: body.action,
			nodeParameters: body.nodeParameters,
			testTriggerNode: body.testTriggerNode,
			answers: body.answers,
			resourceDecision: body.resourceDecision,
		});
		if (!resolved) {
			throw new NotFoundError('Confirmation request not found or not authorized');
		}
		return { ok: true };
	}

	@Post('/chat/:threadId/cancel')
	@GlobalScope('instanceAi:message')
	async cancel(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		this.requireInstanceAiEnabled();
		await this.assertThreadAccess(req.user.id, threadId);
		this.instanceAiService.cancelRun(threadId);
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
		this.instanceAiService.cancelBackgroundTask(threadId, taskId);
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
		this.instanceAiService.sendCorrectionToTask(threadId, taskId, payload.message);
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

		if (payload.enabled === false || payload.localGatewayDisabled === true) {
			const disconnectedUserIds = this.instanceAiService.disconnectAllGateways();
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
		const requestedThreadId = payload.threadId ?? randomUUID();
		await this.assertThreadAccess(req.user.id, requestedThreadId, { allowNew: true });
		return await this.memoryService.ensureThread(req.user.id, requestedThreadId);
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
		await this.instanceAiService.clearThreadState(threadId);
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

		// ?raw=true returns the old format for the thread inspector
		if (query.raw === 'true') {
			return await this.memoryService.getThreadMessages(req.user.id, threadId, {
				limit: query.limit,
				page: query.page,
			});
		}

		// Exclude snapshots for active/suspended runs — they have no matching
		// assistant message in Mastra memory yet and would misalign the
		// positional snapshot-to-message matching in parseStoredMessages.
		const threadStatus = this.instanceAiService.getThreadStatus(threadId);
		const activeRunId = this.instanceAiService.getActiveRunId(threadId);
		const excludeRunIds: string[] = [];
		if (activeRunId) excludeRunIds.push(activeRunId);
		for (const t of threadStatus.backgroundTasks) {
			if (t.status === 'running' && t.runId) excludeRunIds.push(t.runId);
		}

		const result = await this.memoryService.getRichMessages(req.user.id, threadId, {
			limit: query.limit,
			page: query.page,
			excludeRunIds: excludeRunIds.length > 0 ? excludeRunIds : undefined,
		});

		// Include the next SSE event ID so the frontend can skip past events
		// already covered by these historical messages (prevents duplicates)
		const nextEventId = this.eventBus.getNextEventId(threadId);
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

	// ── Evaluation endpoints ──────────────────────────────────────────────────

	@Post('/eval/execute-with-llm-mock/:workflowId')
	@GlobalScope('instanceAi:message')
	async executeWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body payload: InstanceAiEvalExecutionRequest,
	) {
		return await this.evalExecutionService.executeWithLlmMock(workflowId, req.user, payload);
	}

	@Post('/eval/run-sub-agent')
	@GlobalScope('instanceAi:message')
	async runSubAgentEval(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiEvalSubAgentRequest,
	) {
		if (process.env.E2E_TESTS !== 'true' || process.env.NODE_ENV === 'production') {
			throw new ForbiddenError('Sub-agent evaluation is not enabled');
		}
		return await this.subAgentEvalService.run(req.user, payload);
	}

	// ── Gateway endpoints (daemon ↔ server) ──────────────────────────────────

	@Post('/gateway/create-link')
	@GlobalScope('instanceAi:gateway')
	async createGatewayLink(req: AuthenticatedRequest) {
		await this.assertGatewayEnabled(req.user.id);
		const token = this.instanceAiService.generatePairingToken(req.user.id);
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const command = `npx @n8n/computer-use ${baseUrl} ${token}`;
		return { token, command };
	}

	@Get('/gateway/events', { usesTemplates: true, skipAuth: true })
	async gatewayEvents(req: Request, res: FlushableResponse) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));
		await this.assertGatewayEnabled(userId);

		const gateway = this.instanceAiService.getLocalGateway(userId);

		// If the grace-period timer already fired (e.g. after a long reconnect gap),
		// the gateway state is torn down. Reject so the daemon falls into its auth-error
		// reconnect branch, which re-uploads capabilities and re-establishes state.
		if (!gateway.isConnected) {
			throw new ForbiddenError('Local gateway not initialized');
		}

		// Daemon reconnected within the grace window — cancel the pending disconnect.
		this.instanceAiService.clearDisconnectTimer(userId);

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
			this.instanceAiService.startDisconnectTimer(userId, () => {
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
		req.once('close', cleanup);
		res.once('finish', cleanup);
	}

	@Post('/gateway/init', { skipAuth: true })
	async gatewayInit(req: Request, _res: Response, @Body payload: InstanceAiGatewayCapabilitiesDto) {
		const key = this.getGatewayKeyHeader(req);
		const userId = this.validateGatewayApiKey(key);
		await this.assertGatewayEnabled(userId);

		this.instanceAiService.initGateway(userId, payload);

		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: {
					connected: true,
					directory: payload.rootPath,
					hostIdentifier: payload.hostIdentifier ?? null,
					toolCategories: payload.toolCategories ?? [],
				},
			},
			[userId],
		);

		// Try to consume a pairing token and upgrade to a session key
		const sessionKey = key ? this.instanceAiService.consumePairingToken(userId, key) : null;
		if (sessionKey) {
			return { ok: true, sessionKey };
		}
		return { ok: true };
	}

	@Post('/gateway/disconnect', { skipAuth: true })
	gatewayDisconnect(req: Request) {
		const userId = this.validateGatewayApiKey(this.getGatewayKeyHeader(req));

		this.instanceAiService.clearDisconnectTimer(userId);
		this.instanceAiService.disconnectGateway(userId);
		this.instanceAiService.clearActiveSessionKey(userId);
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

		const resolved = this.instanceAiService.resolveGatewayRequest(
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

	@Get('/gateway/status')
	@GlobalScope('instanceAi:gateway')
	async gatewayStatus(req: AuthenticatedRequest) {
		await this.assertGatewayEnabled(req.user.id);
		return this.instanceAiService.getGatewayStatus(req.user.id);
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
		this.instanceAiService.clearDisconnectTimer(userId);
		this.instanceAiService.disconnectGateway(userId);
		this.instanceAiService.clearActiveSessionKey(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
			},
			[userId],
		);
		return { ok: true };
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

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
		const userId = this.instanceAiService.getUserIdForApiKey(key);
		if (userId) return userId;

		throw new ForbiddenError('Invalid API key');
	}

	private writeSseEvent(res: FlushableResponse, stored: StoredEvent): void {
		// No `event:` field — events are discriminated by data.type per streaming-protocol.md
		res.write(`id: ${stored.id}\ndata: ${JSON.stringify(stored.event)}\n\n`);
		res.flush?.();
	}
}
