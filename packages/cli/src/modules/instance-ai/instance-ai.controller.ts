import type {
	InstanceAiSendMessageRequest,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesUpdateRequest,
} from '@n8n/api-types';
import {
	instanceAiGatewayCapabilitiesSchema,
	instanceAiFilesystemResponseSchema,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Put, Param } from '@n8n/decorators';
import type { StoredEvent } from '@n8n/instance-ai';
import type { Request, Response } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';

import { buildAgentTreeFromEvents } from './agent-tree-builder';
import { EvalExecutionService, type EvalExecutionOptions } from './eval-execution.service';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiService } from './instance-ai.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Push } from '@/push';

type FlushableResponse = Response & { flush?: () => void };

const KEEP_ALIVE_INTERVAL_MS = 15_000;

@RestController('/instance-ai')
export class InstanceAiController {
	private readonly gatewayApiKey: string;

	private readonly instanceBaseUrl: string;

	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly evalExecutionService: EvalExecutionService,
		private readonly eventBus: InProcessEventBus,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly push: Push,
		globalConfig: GlobalConfig,
	) {
		this.gatewayApiKey = globalConfig.instanceAi.gatewayApiKey;
		this.instanceBaseUrl = globalConfig.editorBaseUrl || `http://localhost:${globalConfig.port}`;
	}

	@Post('/chat/:threadId')
	async chat(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		const { message, researchMode, attachments } = req.body as InstanceAiSendMessageRequest;

		if (!message?.trim()) {
			throw new BadRequestError('Message is required');
		}

		// Verify the requesting user owns this thread (or it's new)
		await this.assertThreadAccess(req.user.id, threadId, { allowNew: true });

		// One active run per thread
		if (this.instanceAiService.hasActiveRun(threadId)) {
			throw new ConflictError('A run is already active for this thread');
		}

		const safeResearchMode = typeof researchMode === 'boolean' ? researchMode : undefined;
		const safeAttachments = Array.isArray(attachments) ? attachments : undefined;
		const runId = this.instanceAiService.startRun(
			req.user,
			threadId,
			message,
			safeResearchMode,
			safeAttachments,
		);
		return { runId };
	}

	// usesTemplates bypasses the send() wrapper so we can write SSE frames directly
	@Get('/events/:threadId', { usesTemplates: true })
	async events(
		req: AuthenticatedRequest<{}, {}, {}, { lastEventId?: string }>,
		res: FlushableResponse,
		@Param('threadId') threadId: string,
	) {
		// Verify the requesting user owns this thread before streaming events.
		// A thread that doesn't exist yet is allowed — the frontend opens the SSE
		// connection for new conversations before the first message creates the thread.
		const ownership = await this.memoryService.checkThreadOwnership(req.user.id, threadId);
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}

		// 1. Set SSE headers
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		// 2. Determine replay cursor
		//    Last-Event-ID header (auto-reconnect) or ?lastEventId query param
		const lastEventIdHeader = req.headers['last-event-id'];
		const lastEventIdQuery = req.query.lastEventId;
		const rawCursor = lastEventIdHeader ?? lastEventIdQuery;
		const cursor = rawCursor ? parseInt(String(rawCursor), 10) : 0;

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
			if (runEvents.length === 0) continue;

			const agentTree = buildAgentTreeFromEvents(runEvents);
			// Use the group's own latest runId — NOT the thread-global activeRunId,
			// which belongs to the current orchestrator turn and would be wrong for
			// background groups from older turns.
			const groupRunId = group.runIds.at(-1);
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
		const unsubscribe = this.eventBus.subscribe(threadId, (stored) => {
			this.writeSseEvent(res, stored);
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
	async confirm(req: AuthenticatedRequest, _res: Response, @Param('requestId') requestId: string) {
		const {
			approved,
			credentialId,
			credentials,
			autoSetup,
			mockCredentials,
			userInput,
			domainAccessAction,
		} = req.body as {
			approved: boolean;
			credentialId?: string;
			credentials?: Record<string, string>;
			autoSetup?: { credentialType: string };
			mockCredentials?: boolean;
			userInput?: string;
			domainAccessAction?: string;
		};
		const resolved = await this.instanceAiService.resolveConfirmation(req.user.id, requestId, {
			approved,
			credentialId,
			credentials,
			autoSetup,
			mockCredentials,
			userInput,
			domainAccessAction,
		});
		if (!resolved) {
			throw new NotFoundError('Confirmation request not found or not authorized');
		}
		return { ok: true };
	}

	@Post('/chat/:threadId/cancel')
	async cancel(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		await this.assertThreadAccess(req.user.id, threadId);
		this.instanceAiService.cancelRun(threadId);
		return { ok: true };
	}

	@Post('/chat/:threadId/tasks/:taskId/cancel')
	async cancelTask(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
	) {
		await this.assertThreadAccess(req.user.id, threadId);
		this.instanceAiService.cancelBackgroundTask(threadId, taskId);
		return { ok: true };
	}

	@Post('/chat/:threadId/tasks/:taskId/correct')
	async correctTask(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
	) {
		await this.assertThreadAccess(req.user.id, threadId);
		const { message } = req.body as { message?: string };
		if (!message?.trim()) {
			throw new BadRequestError('Correction message is required');
		}
		this.instanceAiService.sendCorrectionToTask(taskId, message);
		return { ok: true };
	}

	// ── Admin settings (owner/admin only) ──────────────────────────────────

	@Get('/settings')
	async getAdminSettings(req: AuthenticatedRequest) {
		this.assertAdmin(req);
		return this.settingsService.getAdminSettings();
	}

	@Put('/settings')
	async updateAdminSettings(req: AuthenticatedRequest) {
		this.assertAdmin(req);
		const body = req.body as InstanceAiAdminSettingsUpdateRequest;
		return await this.settingsService.updateAdminSettings(body);
	}

	// ── User preferences (per-user, self-service) ──────────────────────────

	@Get('/preferences')
	async getUserPreferences(req: AuthenticatedRequest) {
		return await this.settingsService.getUserPreferences(req.user);
	}

	@Put('/preferences')
	async updateUserPreferences(req: AuthenticatedRequest) {
		const body = req.body as InstanceAiUserPreferencesUpdateRequest;
		const result = await this.settingsService.updateUserPreferences(req.user, body);
		if (body.filesystemDisabled !== undefined) {
			await this.moduleRegistry.refreshModuleSettings('instance-ai');
		}
		return result;
	}

	@Get('/settings/credentials')
	async listModelCredentials(req: AuthenticatedRequest) {
		return await this.settingsService.listModelCredentials(req.user);
	}

	@Get('/settings/service-credentials')
	async listServiceCredentials(req: AuthenticatedRequest) {
		this.assertAdmin(req);
		return await this.settingsService.listServiceCredentials(req.user);
	}

	@Get('/memory/:threadId')
	async getMemory(req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		return await this.memoryService.getWorkingMemory(req.user.id, threadId);
	}

	@Put('/memory/:threadId')
	async updateMemory(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		const { content } = req.body as { content: string };
		if (typeof content !== 'string') {
			throw new BadRequestError('Content is required');
		}
		await this.memoryService.updateWorkingMemory(req.user.id, threadId, content);
		return { ok: true };
	}

	@Get('/threads')
	async listThreads(req: AuthenticatedRequest) {
		return await this.memoryService.listThreads(req.user.id);
	}

	@Post('/threads')
	async ensureThread(req: AuthenticatedRequest) {
		const { threadId } = req.body as { threadId?: string };
		const requestedThreadId =
			typeof threadId === 'string' && threadId.trim().length > 0 ? threadId : randomUUID();

		await this.assertThreadAccess(req.user.id, requestedThreadId, { allowNew: true });
		return await this.memoryService.ensureThread(req.user.id, requestedThreadId);
	}

	@Get('/threads/:threadId/messages')
	async getThreadMessages(
		req: AuthenticatedRequest<{}, {}, {}, { limit?: string; page?: string; raw?: string }>,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		// ?raw=true returns the old format for the thread inspector
		if (req.query.raw === 'true') {
			return await this.memoryService.getThreadMessages(req.user.id, threadId, {
				limit: req.query.limit ? Number(req.query.limit) : 50,
				page: req.query.page ? Number(req.query.page) : 0,
			});
		}

		const result = await this.memoryService.getRichMessages(req.user.id, threadId, {
			limit: req.query.limit ? Number(req.query.limit) : 50,
			page: req.query.page ? Number(req.query.page) : 0,
		});

		// Include the next SSE event ID so the frontend can skip past events
		// already covered by these historical messages (prevents duplicates)
		const nextEventId = this.eventBus.getNextEventId(threadId);
		return { ...result, nextEventId };
	}

	@Get('/threads/:threadId/status')
	async getThreadStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		// Allow new threads — the frontend polls status before the first message is sent
		await this.assertThreadAccess(req.user.id, threadId, { allowNew: true });
		return this.instanceAiService.getThreadStatus(threadId);
	}

	@Get('/threads/:threadId/context')
	async getThreadContext(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		return await this.memoryService.getThreadContext(req.user.id, threadId);
	}

	// ── Evaluation endpoints ──────────────────────────────────────────────────

	@Post('/eval/execute-with-llm-mock/:workflowId')
	async executeWithLlmMock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		const options = req.body as EvalExecutionOptions;

		return await this.evalExecutionService.executeWithLlmMock(workflowId, req.user, options);
	}

	// ── Gateway endpoints (daemon ↔ server) ──────────────────────────────────

	@Post('/gateway/create-link')
	async createGatewayLink(req: AuthenticatedRequest) {
		const token = this.instanceAiService.generatePairingToken(req.user.id);
		const baseUrl = this.instanceBaseUrl.replace(/\/$/, '');
		const command = `npx @n8n/fs-proxy ${baseUrl} ${token}`;
		return { token, command };
	}

	@Get('/gateway/events', { usesTemplates: true, skipAuth: true })
	async gatewayEvents(req: Request<{}, {}, {}, { apiKey?: string }>, res: FlushableResponse) {
		const userId = this.validateGatewayApiKey(req.query.apiKey);

		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		const gateway = this.instanceAiService.getLocalGateway(userId);
		const unsubscribe = gateway.onRequest((event) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
			res.flush?.();
		});

		const keepAlive = setInterval(() => {
			res.write(': ping\n\n');
			res.flush?.();
		}, KEEP_ALIVE_INTERVAL_MS);

		const cleanup = () => {
			unsubscribe();
			clearInterval(keepAlive);
			this.instanceAiService.startDisconnectTimer(userId, () => {
				this.push.sendToUsers(
					{ type: 'instanceAiGatewayStateChanged', data: { connected: false, directory: null } },
					[userId],
				);
			});
		};
		req.once('close', cleanup);
		res.once('finish', cleanup);
	}

	@Post('/gateway/init', { skipAuth: true })
	gatewayInit(req: Request) {
		const key = req.headers['x-gateway-key'] as string | undefined;
		const userId = this.validateGatewayApiKey(key);

		const parsed = instanceAiGatewayCapabilitiesSchema.safeParse(req.body);
		if (!parsed.success) {
			throw new BadRequestError(parsed.error.message);
		}
		this.instanceAiService.initGateway(userId, parsed.data);

		this.push.sendToUsers(
			{
				type: 'instanceAiGatewayStateChanged',
				data: { connected: true, directory: parsed.data.rootPath },
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
		const userId = this.validateGatewayApiKey(req.headers['x-gateway-key'] as string | undefined);

		this.instanceAiService.clearDisconnectTimer(userId);
		this.instanceAiService.disconnectGateway(userId);
		this.instanceAiService.clearActiveSessionKey(userId);
		this.push.sendToUsers(
			{ type: 'instanceAiGatewayStateChanged', data: { connected: false, directory: null } },
			[userId],
		);
		return { ok: true };
	}

	@Post('/gateway/response/:requestId', { skipAuth: true })
	gatewayResponse(req: Request, _res: Response, @Param('requestId') requestId: string) {
		const userId = this.validateGatewayApiKey(req.headers['x-gateway-key'] as string | undefined);

		const parsed = instanceAiFilesystemResponseSchema.safeParse(req.body);
		if (!parsed.success) {
			throw new BadRequestError(parsed.error.message);
		}
		const resolved = this.instanceAiService.resolveGatewayRequest(
			userId,
			requestId,
			parsed.data.result,
			parsed.data.error,
		);
		if (!resolved) {
			throw new NotFoundError('Gateway request not found or already resolved');
		}
		return { ok: true };
	}

	@Get('/gateway/status')
	async gatewayStatus(req: AuthenticatedRequest) {
		return this.instanceAiService.getGatewayStatus(req.user.id);
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

	/** Verify the requesting user is an instance owner or admin. */
	private assertAdmin(req: AuthenticatedRequest): void {
		const slug = req.user.role?.slug;
		if (slug !== 'global:owner' && slug !== 'global:admin') {
			throw new ForbiddenError('Admin access required');
		}
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
