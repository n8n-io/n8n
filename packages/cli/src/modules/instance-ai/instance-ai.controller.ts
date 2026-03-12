import { timingSafeEqual } from 'node:crypto';
import { AuthenticatedRequest } from '@n8n/db';
import { GlobalConfig } from '@n8n/config';
import { RestController, Get, Post, Put, Param } from '@n8n/decorators';
import type { InstanceAiSendMessageRequest, InstanceAiSettingsUpdateRequest } from '@n8n/api-types';
import {
	instanceAiGatewayCapabilitiesSchema,
	instanceAiFilesystemResponseSchema,
} from '@n8n/api-types';
import type { StoredEvent } from '@n8n/instance-ai';
import type { Request, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Push } from '@/push';
import { ModuleRegistry } from '@n8n/backend-common';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiService } from './instance-ai.service';

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
		const { message, researchMode } = req.body as InstanceAiSendMessageRequest;

		if (!message?.trim()) {
			throw new BadRequestError('Message is required');
		}

		// One active run per thread
		if (this.instanceAiService.hasActiveRun(threadId)) {
			throw new ConflictError('A run is already active for this thread');
		}

		const safeResearchMode = typeof researchMode === 'boolean' ? researchMode : undefined;
		const runId = this.instanceAiService.startRun(req.user, threadId, message, safeResearchMode);
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
		const { approved, credentialId, credentials, autoSetup, userInput } = req.body as {
			approved: boolean;
			credentialId?: string;
			credentials?: Record<string, string>;
			autoSetup?: { credentialType: string };
			userInput?: string;
		};
		const resolved = await this.instanceAiService.resolveConfirmation(req.user.id, requestId, {
			approved,
			credentialId,
			credentials,
			autoSetup,
			userInput,
		});
		if (!resolved) {
			throw new NotFoundError('Confirmation request not found or not authorized');
		}
		return { ok: true };
	}

	@Post('/chat/:threadId/cancel')
	async cancel(_req: AuthenticatedRequest, _res: Response, @Param('threadId') threadId: string) {
		this.instanceAiService.cancelRun(threadId);
		return { ok: true };
	}

	@Post('/chat/:threadId/tasks/:taskId/cancel')
	async cancelTask(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
		@Param('taskId') taskId: string,
	) {
		this.instanceAiService.cancelBackgroundTask(threadId, taskId);
		return { ok: true };
	}

	@Post('/chat/:threadId/tasks/:taskId/correct')
	async correctTask(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') _threadId: string,
		@Param('taskId') taskId: string,
	) {
		const { message } = req.body as { message?: string };
		if (!message?.trim()) {
			throw new BadRequestError('Correction message is required');
		}
		this.instanceAiService.sendCorrectionToTask(taskId, message);
		return { ok: true };
	}

	@Get('/settings')
	async getSettings(req: AuthenticatedRequest) {
		return await this.settingsService.getSettings(req.user);
	}

	@Put('/settings')
	async updateSettings(req: AuthenticatedRequest) {
		const body = req.body as InstanceAiSettingsUpdateRequest;
		const result = await this.settingsService.updateSettings(req.user, body);
		if (body.filesystemDisabled !== undefined) {
			await this.moduleRegistry.refreshModuleSettings('instance-ai');
		}
		return result;
	}

	@Get('/settings/credentials')
	async listModelCredentials(req: AuthenticatedRequest) {
		return await this.settingsService.listModelCredentials(req.user);
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
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
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

	// ── Gateway endpoints (daemon ↔ server) ──────────────────────────────────

	@Post('/gateway/create-link')
	async createGatewayLink(_req: AuthenticatedRequest) {
		const token = this.instanceAiService.generatePairingToken();
		const baseUrl = this.instanceBaseUrl.replace(/\/$/, '');
		const command = `npx @n8n/fs-proxy ${baseUrl} ${token}`;
		return { token, command };
	}

	@Get('/gateway/events', { usesTemplates: true, skipAuth: true })
	async gatewayEvents(req: Request<{}, {}, {}, { apiKey?: string }>, res: FlushableResponse) {
		this.validateGatewayApiKey(req.query.apiKey);

		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders();

		const gateway = this.instanceAiService.getLocalGateway();
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
			this.instanceAiService.startDisconnectTimer(() => {
				void this.moduleRegistry
					.refreshModuleSettings('instance-ai')
					.then(() => {
						this.push.broadcast({
							type: 'instanceAiGatewayStateChanged',
							data: { connected: false, directory: null },
						});
					})
					.catch(() => {});
			});
		};
		req.once('close', cleanup);
		res.once('finish', cleanup);
	}

	@Post('/gateway/init', { skipAuth: true })
	async gatewayInit(req: Request) {
		const key = req.headers['x-gateway-key'] as string | undefined;
		this.validateGatewayApiKey(key);

		const parsed = instanceAiGatewayCapabilitiesSchema.safeParse(req.body);
		if (!parsed.success) {
			throw new BadRequestError(parsed.error.message);
		}
		this.instanceAiService.initGateway(parsed.data);
		await this.moduleRegistry.refreshModuleSettings('instance-ai');

		this.push.broadcast({
			type: 'instanceAiGatewayStateChanged',
			data: { connected: true, directory: parsed.data.rootPath },
		});

		// Try to consume a pairing token and upgrade to a session key
		const sessionKey = key ? this.instanceAiService.consumePairingToken(key) : null;
		if (sessionKey) {
			return { ok: true, sessionKey };
		}
		return { ok: true };
	}

	@Post('/gateway/disconnect', { skipAuth: true })
	async gatewayDisconnect(req: Request) {
		this.validateGatewayApiKey(req.headers['x-gateway-key'] as string | undefined);

		this.instanceAiService.clearDisconnectTimer();
		this.instanceAiService.disconnectGateway();
		this.instanceAiService.clearActiveSessionKey();
		await this.moduleRegistry.refreshModuleSettings('instance-ai');
		this.push.broadcast({
			type: 'instanceAiGatewayStateChanged',
			data: { connected: false, directory: null },
		});
		return { ok: true };
	}

	@Post('/gateway/response/:requestId', { skipAuth: true })
	async gatewayResponse(req: Request, _res: Response, @Param('requestId') requestId: string) {
		this.validateGatewayApiKey(req.headers['x-gateway-key'] as string | undefined);

		const parsed = instanceAiFilesystemResponseSchema.safeParse(req.body);
		if (!parsed.success) {
			throw new BadRequestError(parsed.error.message);
		}
		const resolved = this.instanceAiService.resolveGatewayRequest(
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
	async gatewayStatus(_req: AuthenticatedRequest) {
		return this.instanceAiService.getGatewayStatus();
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	/**
	 * Validate the gateway API key from query param or header.
	 * Accepts: static env var key, one-time pairing token (init only), or active session key.
	 */
	private validateGatewayApiKey(key: string | undefined): void {
		if (!key) {
			throw new ForbiddenError('Missing API key');
		}
		const actual = Buffer.from(key);

		// Check static env var key
		if (this.gatewayApiKey) {
			const expected = Buffer.from(this.gatewayApiKey);
			if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
				return;
			}
		}

		// Check one-time pairing token (valid until consumed on init)
		const pairingToken = this.instanceAiService.getPairingToken();
		if (pairingToken) {
			const expected = Buffer.from(pairingToken);
			if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
				return;
			}
		}

		// Check active session key (issued after pairing token is consumed)
		const sessionKey = this.instanceAiService.getActiveSessionKey();
		if (sessionKey) {
			const expected = Buffer.from(sessionKey);
			if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
				return;
			}
		}

		throw new ForbiddenError('Invalid API key');
	}

	private writeSseEvent(res: FlushableResponse, stored: StoredEvent): void {
		// No `event:` field — events are discriminated by data.type per streaming-protocol.md
		res.write(`id: ${stored.id}\ndata: ${JSON.stringify(stored.event)}\n\n`);
		res.flush?.();
	}
}
