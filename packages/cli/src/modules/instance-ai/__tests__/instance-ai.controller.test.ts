import { z } from 'zod';

jest.mock('@n8n/instance-ai', () => ({
	createMemory: jest.fn(),
	workflowLoopStateSchema: z.string(),
	attemptRecordSchema: z.object({}),
	workflowBuildOutcomeSchema: z.string(),
	buildAgentTreeFromEvents: jest.fn(() => ({
		agentId: 'agent-root',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
	})),
}));

jest.mock('../eval/execution.service', () => ({
	EvalExecutionService: jest.fn(),
}));

import type {
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiSendMessageRequest,
	InstanceAiCorrectTaskRequest,
	InstanceAiConfirmRequestDto,
	InstanceAiEnsureThreadRequest,
	InstanceAiThreadMessagesQuery,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiRenameThreadRequestDto,
	InstanceAiEnsureThreadResponse,
	InstanceAiThreadInfo,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadMessagesResponse,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Push } from '@/push';
import type { UrlService } from '@/services/url.service';

import type { EvalExecutionService } from '../eval/execution.service';
import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import type { LocalGateway } from '../filesystem/local-gateway';
import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiController } from '../instance-ai.controller';
import type { InstanceAiService } from '../instance-ai.service';

const USER_ID = 'user-1';
const THREAD_ID = 'thread-1';

const routeMetadata = Container.get(ControllerRegistryMetadata);

// Scope metadata helper, reads the decorator metadata that @GlobalScope writes at class-definition time.
function scopeOf(handlerName: string): { scope: Scope; globalOnly: boolean } | undefined {
	const route = routeMetadata.getRouteMetadata(
		InstanceAiController as unknown as Parameters<typeof routeMetadata.getRouteMetadata>[0],
		handlerName,
	);
	return route.accessScope;
}

describe('InstanceAiController', () => {
	const instanceAiService = mock<InstanceAiService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const eventBus = mock<InProcessEventBus>();
	const moduleRegistry = mock<ModuleRegistry>();
	const push = mock<Push>();
	const urlService = mock<UrlService>();
	const globalConfig = mock<GlobalConfig>({
		instanceAi: { gatewayApiKey: 'static-key' },
		editorBaseUrl: 'http://localhost:5678',
		port: 5678,
	});

	const controller = new InstanceAiController(
		instanceAiService,
		memoryService,
		settingsService,
		mock<EvalExecutionService>(),
		eventBus,
		moduleRegistry,
		push,
		urlService,
		globalConfig,
	);

	const req = mock<AuthenticatedRequest>({ user: { id: USER_ID } });
	const res = mock<Response>();

	beforeEach(() => {
		jest.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
	});

	describe('chat', () => {
		const payload = mock<InstanceAiSendMessageRequest>({
			message: 'hello',
			researchMode: false,
			timeZone: 'Europe/Helsinki',
		});

		it('should require instanceAi:message scope', () => {
			expect(scopeOf('chat')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should start a run and return runId', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-1');

			const result = await controller.chat(req, res, THREAD_ID, payload);

			expect(result).toEqual({ runId: 'run-1' });
			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payload.message,
				payload.researchMode,
				payload.attachments,
				payload.timeZone,
				payload.pushRef,
			);
		});

		it('should allow new threads', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-1');

			await expect(controller.chat(req, res, THREAD_ID, payload)).resolves.toEqual({
				runId: 'run-1',
			});
		});

		it('should forward pushRef to startRun', async () => {
			const payloadWithPushRef = mock<InstanceAiSendMessageRequest>({
				message: 'build me a workflow',
				pushRef: 'iframe-push-ref-123',
				timeZone: 'UTC',
			});
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-2');

			await controller.chat(req, res, THREAD_ID, payloadWithPushRef);

			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payloadWithPushRef.message,
				payloadWithPushRef.researchMode,
				payloadWithPushRef.attachments,
				payloadWithPushRef.timeZone,
				'iframe-push-ref-123',
			);
		});

		it('should throw ConflictError when a run is already active', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(true);

			await expect(controller.chat(req, res, THREAD_ID, payload)).rejects.toThrow(ConflictError);
		});

		it('should throw ForbiddenError when thread belongs to another user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.chat(req, res, THREAD_ID, payload)).rejects.toThrow(ForbiddenError);
		});
	});

	describe('events', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('events')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should bootstrap run-sync from the richer persisted snapshot when live events are incomplete', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			eventBus.getEventsAfter.mockReturnValue([]);
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: true,
				isSuspended: false,
				backgroundTasks: [],
			} as never);
			instanceAiService.getMessageGroupId.mockReturnValue('mg-1');
			instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);
			eventBus.getEventsForRuns.mockReturnValue([
				{
					type: 'run-start',
					runId: 'run-1',
					agentId: 'agent-root',
					payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
				},
			] as never);
			memoryService.getLatestRunSnapshot.mockResolvedValue({
				runId: 'run-1',
				messageGroupId: 'mg-1',
				runIds: ['run-1'],
				tree: {
					agentId: 'agent-root',
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [
						{
							agentId: 'agent-planner-1',
							role: 'planner',
							status: 'active',
							textContent: '',
							reasoning: '',
							toolCalls: [],
							children: [],
							timeline: [],
							planItems: [
								{
									id: 'task-1',
									title: 'Build workflow',
									kind: 'build-workflow',
									spec: 'Create the workflow',
									deps: [],
								},
							],
						},
					],
					timeline: [{ type: 'child', agentId: 'agent-planner-1' }],
				},
			});

			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: jest.fn(),
				flushHeaders: jest.fn(),
				write: jest.fn(),
				end: jest.fn(),
				flush: jest.fn(),
			});
			eventBus.subscribe.mockReturnValue(jest.fn());

			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: jest.fn(),
			});

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			const runSyncFrame = (sseRes.write as jest.Mock).mock.calls
				.map(([frame]) => String(frame))
				.find((frame) => frame.startsWith('event: run-sync'));

			expect(runSyncFrame).toContain('"agent-planner-1"');
			expect(runSyncFrame).toContain('"planItems"');
		});

		it('should close SSE stream when thread ownership changes after pre-creation subscribe', async () => {
			// Simulate: thread does not exist at connect time
			memoryService.checkThreadOwnership.mockResolvedValueOnce('not_found');

			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: jest.fn(),
				flushHeaders: jest.fn(),
				write: jest.fn(),
				end: jest.fn(),
				flush: jest.fn(),
			});

			// Capture the subscribe handler
			let subscribeHandler: ((stored: { id: number; event: unknown }) => void) | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				subscribeHandler = handler as typeof subscribeHandler;
				return jest.fn();
			});
			eventBus.getEventsAfter.mockReturnValue([]);
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [],
			} as never);

			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: jest.fn(),
			});

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			// Now simulate: another user created the thread, so ownership is 'other_user'
			memoryService.checkThreadOwnership.mockResolvedValueOnce('other_user');

			// Fire an event through the subscriber
			subscribeHandler!({
				id: 1,
				event: { type: 'text-delta', runId: 'r1', agentId: 'a1', payload: { text: 'secret' } },
			});

			// Allow the async ownership check to resolve
			await new Promise((resolve) => setImmediate(resolve));

			// The stream should be closed, not written to
			expect(sseRes.end).toHaveBeenCalled();
		});

		it('should close SSE stream when deferred ownership check rejects', async () => {
			memoryService.checkThreadOwnership.mockResolvedValueOnce('not_found');

			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: jest.fn(),
				flushHeaders: jest.fn(),
				write: jest.fn(),
				end: jest.fn(),
				flush: jest.fn(),
			});

			let subscribeHandler: ((stored: { id: number; event: unknown }) => void) | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				subscribeHandler = handler as typeof subscribeHandler;
				return jest.fn();
			});
			eventBus.getEventsAfter.mockReturnValue([]);
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [],
			} as never);

			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: jest.fn(),
			});

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			// Make the deferred ownership check reject with an error
			memoryService.checkThreadOwnership.mockRejectedValueOnce(new Error('DB connection lost'));

			subscribeHandler!({
				id: 1,
				event: { type: 'text-delta', runId: 'r1', agentId: 'a1', payload: { text: 'data' } },
			});

			await new Promise((resolve) => setImmediate(resolve));

			expect(sseRes.end).toHaveBeenCalled();
		});
	});

	describe('cancel', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('cancel')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should cancel the run', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.cancel(req, res, THREAD_ID);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.cancelRun).toHaveBeenCalledWith(THREAD_ID);
		});

		it('should throw ForbiddenError for other user thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.cancel(req, res, THREAD_ID)).rejects.toThrow(ForbiddenError);
		});

		it('should throw NotFoundError for missing thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.cancel(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
		});
	});

	describe('cancelTask', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('cancelTask')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should cancel the background task', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.cancelTask(req, res, THREAD_ID, 'task-1');

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.cancelBackgroundTask).toHaveBeenCalledWith(THREAD_ID, 'task-1');
		});
	});

	describe('correctTask', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('correctTask')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should send correction to the task', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const payload = mock<InstanceAiCorrectTaskRequest>({ message: 'fix this' });

			const result = await controller.correctTask(req, res, THREAD_ID, 'task-1', payload);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.sendCorrectionToTask).toHaveBeenCalledWith(
				THREAD_ID,
				'task-1',
				'fix this',
			);
		});
	});

	describe('confirm', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('confirm')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should resolve confirmation', async () => {
			instanceAiService.resolveConfirmation.mockResolvedValue(true);
			const body = mock<InstanceAiConfirmRequestDto>({ approved: true });

			const result = await controller.confirm(req, res, 'req-1', body);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.resolveConfirmation).toHaveBeenCalledWith(
				USER_ID,
				'req-1',
				expect.objectContaining({ approved: true }),
			);
		});

		it('should pass resourceDecision through to resolveConfirmation', async () => {
			instanceAiService.resolveConfirmation.mockResolvedValue(true);
			const body = mock<InstanceAiConfirmRequestDto>({
				approved: true,
				resourceDecision: 'allowOnce',
			});

			await controller.confirm(req, res, 'req-1', body);

			expect(instanceAiService.resolveConfirmation).toHaveBeenCalledWith(
				USER_ID,
				'req-1',
				expect.objectContaining({ resourceDecision: 'allowOnce' }),
			);
		});

		it('should throw NotFoundError when confirmation not found', async () => {
			instanceAiService.resolveConfirmation.mockResolvedValue(false);
			const body = mock<InstanceAiConfirmRequestDto>({ approved: false });

			await expect(controller.confirm(req, res, 'req-1', body)).rejects.toThrow(NotFoundError);
		});
	});

	describe('getAdminSettings', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('getAdminSettings')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});
	});

	describe('updateAdminSettings', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('updateAdminSettings')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});

		it('should disconnect all gateways when enabled is set to false', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({} as never);
			instanceAiService.disconnectAllGateways.mockReturnValue(['user-a', 'user-b']);
			const payload = { enabled: false } as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(instanceAiService.disconnectAllGateways).toHaveBeenCalled();
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'instanceAiGatewayStateChanged',
					data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
				}),
				['user-a', 'user-b'],
			);
		});

		it('should disconnect all gateways when localGatewayDisabled is set to true', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({} as never);
			instanceAiService.disconnectAllGateways.mockReturnValue(['user-c']);
			const payload = { localGatewayDisabled: true } as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(instanceAiService.disconnectAllGateways).toHaveBeenCalled();
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'instanceAiGatewayStateChanged',
				}),
				['user-c'],
			);
		});

		it('should not disconnect gateways when enabling features', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({} as never);
			const payload = {
				enabled: true,
				localGatewayDisabled: false,
			} as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(instanceAiService.disconnectAllGateways).not.toHaveBeenCalled();
		});
	});

	describe('getUserPreferences', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('getUserPreferences')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});
	});

	describe('updateUserPreferences', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('updateUserPreferences')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});

		it('should refresh module settings when localGatewayDisabled changes', async () => {
			const payload = mock<InstanceAiUserPreferencesUpdateRequest>({
				localGatewayDisabled: true,
			});
			settingsService.updateUserPreferences.mockResolvedValue(
				mock<InstanceAiUserPreferencesResponse>(),
			);

			await controller.updateUserPreferences(req, res, payload);

			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
		});

		it('should not refresh module settings when localGatewayDisabled is not in payload', async () => {
			const payload = mock<InstanceAiUserPreferencesUpdateRequest>({
				localGatewayDisabled: undefined,
			});
			settingsService.updateUserPreferences.mockResolvedValue(
				mock<InstanceAiUserPreferencesResponse>(),
			);

			await controller.updateUserPreferences(req, res, payload);

			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
		});
	});

	describe('listModelCredentials', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('listModelCredentials')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});
	});

	describe('listServiceCredentials', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('listServiceCredentials')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});
	});

	describe('listThreads', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('listThreads')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});
	});

	describe('ensureThread', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('ensureThread')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should create thread with provided threadId', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			const threadResult = mock<InstanceAiEnsureThreadResponse>();
			memoryService.ensureThread.mockResolvedValue(threadResult);
			const payload = mock<InstanceAiEnsureThreadRequest>({ threadId: 'custom-id' });

			const result = await controller.ensureThread(req, res, payload);

			expect(result).toBe(threadResult);
			expect(memoryService.ensureThread).toHaveBeenCalledWith(USER_ID, 'custom-id');
		});

		it('should generate a UUID when threadId is not provided', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			memoryService.ensureThread.mockResolvedValue(mock<InstanceAiEnsureThreadResponse>());
			const payload = mock<InstanceAiEnsureThreadRequest>({ threadId: undefined });

			await controller.ensureThread(req, res, payload);

			// The controller generates a UUID — just verify ensureThread was called with some string
			expect(memoryService.ensureThread).toHaveBeenCalledWith(USER_ID, expect.any(String));
		});
	});

	describe('deleteThread', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('deleteThread')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should delete thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.deleteThread(req, res, THREAD_ID);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.clearThreadState).toHaveBeenCalledWith(THREAD_ID);
			expect(memoryService.deleteThread).toHaveBeenCalledWith(THREAD_ID);
		});

		it('should throw ForbiddenError for other user thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.deleteThread(req, res, THREAD_ID)).rejects.toThrow(ForbiddenError);
		});

		it('should throw NotFoundError for missing thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.deleteThread(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
		});
	});

	describe('renameThread', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('renameThread')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should rename thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const threadObj = mock<InstanceAiThreadInfo>();
			memoryService.updateThread.mockResolvedValue(threadObj);
			const payload = mock<InstanceAiRenameThreadRequestDto>({ title: 'New Title' });

			const result = await controller.renameThread(req, res, THREAD_ID, payload);

			expect(result).toEqual({ thread: threadObj });
			expect(memoryService.updateThread).toHaveBeenCalledWith(
				THREAD_ID,
				expect.objectContaining({ title: 'New Title' }),
			);
		});
	});

	describe('getThreadMessages', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('getThreadMessages')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});

		it('should return rich messages with nextEventId', async () => {
			const richResult = mock<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>>();
			memoryService.getRichMessages.mockResolvedValue(richResult);
			eventBus.getNextEventId.mockReturnValue(42);
			const query = mock<InstanceAiThreadMessagesQuery>({
				limit: 50,
				page: 0,
				raw: undefined,
			});

			const result = await controller.getThreadMessages(req, res, THREAD_ID, query);

			expect(result).toMatchObject({ nextEventId: 42 });
			expect(memoryService.getRichMessages).toHaveBeenCalledWith(USER_ID, THREAD_ID, {
				limit: 50,
				page: 0,
			});
		});

		it('should return raw messages when raw=true', async () => {
			const rawResult = mock<InstanceAiThreadMessagesResponse>();
			memoryService.getThreadMessages.mockResolvedValue(rawResult);
			const query = mock<InstanceAiThreadMessagesQuery>({
				limit: 50,
				page: 0,
				raw: 'true',
			});

			const result = await controller.getThreadMessages(req, res, THREAD_ID, query);

			expect(result).toBe(rawResult);
			expect(memoryService.getThreadMessages).toHaveBeenCalledWith(USER_ID, THREAD_ID, {
				limit: 50,
				page: 0,
			});
			expect(memoryService.getRichMessages).not.toHaveBeenCalled();
		});
	});

	describe('getThreadStatus', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('getThreadStatus')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});
	});

	describe('createGatewayLink', () => {
		it('should require instanceAi:gateway scope', () => {
			expect(scopeOf('createGatewayLink')).toEqual({
				scope: 'instanceAi:gateway',
				globalOnly: true,
			});
		});

		it('should return token and command', async () => {
			instanceAiService.generatePairingToken.mockReturnValue('pairing-token');
			urlService.getInstanceBaseUrl.mockReturnValue('https://myinstance.n8n.cloud');

			const result = await controller.createGatewayLink(req);

			expect(result).toEqual({
				token: 'pairing-token',
				command: 'npx @n8n/computer-use https://myinstance.n8n.cloud pairing-token',
			});
			expect(instanceAiService.generatePairingToken).toHaveBeenCalledWith(USER_ID);
		});
	});

	describe('gatewayInit', () => {
		const makeGatewayReq = (key: string | undefined, body: unknown) =>
			({ headers: key ? { 'x-gateway-key': key } : {}, body }) as unknown as Request;

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayInit')).toBeUndefined();
		});

		it('should initialize gateway with valid key and body', async () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			instanceAiService.consumePairingToken.mockReturnValue(null);
			const gatewayReq = makeGatewayReq('session-key', { rootPath: '/home/user' });
			const payload = { rootPath: '/home/user', tools: [], toolCategories: [] };

			const result = await controller.gatewayInit(gatewayReq, res, payload);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.initGateway).toHaveBeenCalledWith(
				USER_ID,
				expect.objectContaining({ rootPath: '/home/user' }),
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'instanceAiGatewayStateChanged',
					data: {
						connected: true,
						directory: '/home/user',
						hostIdentifier: null,
						toolCategories: [],
					},
				}),
				[USER_ID],
			);
		});

		it('should return sessionKey when pairing token is consumed', async () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			instanceAiService.consumePairingToken.mockReturnValue('new-session-key');
			const gatewayReq = makeGatewayReq('pairing-token', { rootPath: '/tmp' });

			const result = await controller.gatewayInit(gatewayReq, res, {
				rootPath: '/tmp',
				tools: [],
				toolCategories: [],
			});

			expect(result).toEqual({ ok: true, sessionKey: 'new-session-key' });
		});

		it('should accept static env var key', async () => {
			instanceAiService.consumePairingToken.mockReturnValue(null);
			const gatewayReq = makeGatewayReq('static-key', { rootPath: '/tmp' });

			const result = await controller.gatewayInit(gatewayReq, res, {
				rootPath: '/tmp',
				tools: [],
				toolCategories: [],
			});

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.initGateway).toHaveBeenCalledWith('env-gateway', expect.anything());
		});

		it('should throw ForbiddenError with missing API key', async () => {
			const gatewayReq = makeGatewayReq(undefined, { rootPath: '/tmp' });

			await expect(
				controller.gatewayInit(gatewayReq, res, {
					rootPath: '/tmp',
					tools: [],
					toolCategories: [],
				}),
			).rejects.toThrow(ForbiddenError);
		});

		it('should throw ForbiddenError with invalid API key', async () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(undefined);
			const gatewayReq = makeGatewayReq('wrong-key', { rootPath: '/tmp' });

			await expect(
				controller.gatewayInit(gatewayReq, res, {
					rootPath: '/tmp',
					tools: [],
					toolCategories: [],
				}),
			).rejects.toThrow(ForbiddenError);
		});
	});

	describe('gatewayEvents', () => {
		const makeGatewayReq = (key: string) =>
			({
				headers: { 'x-gateway-key': key },
				once: jest.fn(),
			}) as unknown as Request;

		const makeFlushableRes = () => {
			const res = {
				setHeader: jest.fn(),
				flushHeaders: jest.fn(),
				write: jest.fn(),
				flush: jest.fn(),
				once: jest.fn(),
			};
			return res as unknown as Parameters<typeof controller.gatewayEvents>[1];
		};

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayEvents')).toBeUndefined();
		});

		it('should reject with ForbiddenError when the gateway has not been initialized', async () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			instanceAiService.getLocalGateway.mockReturnValue(mock<LocalGateway>({ isConnected: false }));

			await expect(
				controller.gatewayEvents(makeGatewayReq('session-key'), makeFlushableRes()),
			).rejects.toThrow(ForbiddenError);

			expect(instanceAiService.clearDisconnectTimer).not.toHaveBeenCalled();
		});

		it('should clear a pending disconnect timer when SSE reconnects while still connected', async () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			const gateway = mock<LocalGateway>({ isConnected: true });
			gateway.onRequest.mockReturnValue(() => {});
			instanceAiService.getLocalGateway.mockReturnValue(gateway);

			await controller.gatewayEvents(makeGatewayReq('session-key'), makeFlushableRes());

			expect(instanceAiService.clearDisconnectTimer).toHaveBeenCalledWith(USER_ID);
		});
	});

	describe('gatewayResponse', () => {
		const makeGatewayReq = (key: string, body: unknown) =>
			({ headers: { 'x-gateway-key': key }, body }) as unknown as Request;

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayResponse')).toBeUndefined();
		});

		it('should resolve gateway request', () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			instanceAiService.resolveGatewayRequest.mockReturnValue(true);
			const gatewayReq = makeGatewayReq('session-key', { result: { content: [] } });

			const result = controller.gatewayResponse(gatewayReq, res, 'req-1', {
				result: { content: [] },
			});

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.resolveGatewayRequest).toHaveBeenCalledWith(
				USER_ID,
				'req-1',
				{ content: [] },
				undefined,
			);
		});

		it('should throw NotFoundError when request not found', () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			instanceAiService.resolveGatewayRequest.mockReturnValue(false);
			const gatewayReq = makeGatewayReq('session-key', { result: { content: [] } });

			expect(() =>
				controller.gatewayResponse(gatewayReq, res, 'req-1', { result: { content: [] } }),
			).toThrow(NotFoundError);
		});
	});

	describe('gatewayDisconnect', () => {
		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayDisconnect')).toBeUndefined();
		});

		it('should disconnect gateway and send push notification', () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			const gatewayReq = {
				headers: { 'x-gateway-key': 'session-key' },
			} as unknown as Request;

			const result = controller.gatewayDisconnect(gatewayReq);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.clearDisconnectTimer).toHaveBeenCalledWith(USER_ID);
			expect(instanceAiService.disconnectGateway).toHaveBeenCalledWith(USER_ID);
			expect(instanceAiService.clearActiveSessionKey).toHaveBeenCalledWith(USER_ID);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiGatewayStateChanged',
					data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
				},
				[USER_ID],
			);
		});
	});

	describe('gatewayStatus', () => {
		it('should require instanceAi:gateway scope', () => {
			expect(scopeOf('gatewayStatus')).toEqual({
				scope: 'instanceAi:gateway',
				globalOnly: true,
			});
		});
	});

	describe('getGatewayKeyHeader', () => {
		it('should extract first element from array header', () => {
			instanceAiService.getUserIdForApiKey.mockReturnValue(USER_ID);
			instanceAiService.resolveGatewayRequest.mockReturnValue(true);
			const gatewayReq = {
				headers: { 'x-gateway-key': ['key1', 'key2'] },
				body: { result: { content: [] } },
			} as unknown as Request;

			controller.gatewayResponse(gatewayReq, res, 'req-1', { result: { content: [] } });

			// validateGatewayApiKey receives 'key1' (the first element)
			expect(instanceAiService.getUserIdForApiKey).toHaveBeenCalledWith('key1');
		});
	});
});
