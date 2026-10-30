import type { Mock } from 'vitest';
import { z } from 'zod';

vi.mock('@n8n/instance-ai', () => {
	return {
		workflowLoopStateSchema: z.string(),
		attemptRecordSchema: z.object({}),
		workflowBuildOutcomeSchema: z.string(),
		buildAgentTreeFromEvents: vi.fn(() => ({
			agentId: 'agent-root',
			role: 'orchestrator',
			status: 'active',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [],
			timeline: [],
		})),
	};
});

// The controller imports validation helpers via the parsers subpath so they
// don't pull in native agent. Re-export the real implementation for the test.
vi.mock('@n8n/instance-ai/parsers', async () => await vi.importActual('@n8n/instance-ai/parsers'));

import type {
	AiPreferenceDto,
	InstanceAiPreferenceCardEvent,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiSendMessageRequest,
	InstanceAiCorrectTaskRequest,
	InstanceAiConfirmRequest,
	InstanceAiEnsureThreadRequest,
	InstanceAiThreadMessagesQuery,
	InstanceAiRenameThreadRequestDto,
	InstanceAiEnsureThreadResponse,
	InstanceAiThreadInfo,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadMessagesResponse,
	AssistantThreadTabsState,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import { buildAgentTreeFromEvents } from '@n8n/instance-ai';
import {
	InstanceAiPersistPendingAgentRequest,
	AssistantThreadTabsRequestDto,
	MAX_ATTACHMENT_BASE64_BYTES,
	MAX_TOTAL_ATTACHMENT_BASE64_BYTES,
} from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { ProjectService } from '@/services/project.service.ee';

import type { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';
import type { DurableEventLog } from '../event-bus/durable-event-log';
import type { DurableLogMetrics } from '../event-bus/durable-log-metrics';
import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import type { InstanceAiOnboardingService } from '../onboarding';
import type { InstanceAiPendingAgentService } from '../instance-ai-pending-agent.service';
import type { InstanceAiPreferenceCardService } from '../instance-ai-preference-card.service';
import type { InstanceAiThreadTabsService } from '../instance-ai-thread-tabs.service';
import type { InstanceAiModelCatalogService } from '../instance-ai-model-catalog.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiController } from '../instance-ai.controller';
import type { InstanceAiService } from '../instance-ai.service';
import type { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';

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
	const browserSessionService = mock<InstanceAiBrowserSessionService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const pendingAgentService = mock<InstanceAiPendingAgentService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const modelCatalogService = mock<InstanceAiModelCatalogService>();
	const eventBus = mock<InProcessEventBus>();
	const eventLog = mock<DurableEventLog>();
	const durableLogMetrics = mock<DurableLogMetrics>();
	const moduleRegistry = mock<ModuleRegistry>();
	const publisher = mock<Publisher>();

	const projectService = mock<ProjectService>();
	const instanceAiErrorReporter = mock<InstanceAiErrorReporterService>();

	const preferenceCardService = mock<InstanceAiPreferenceCardService>();
	const onboarding = mock<InstanceAiOnboardingService>();
	const threadTabsService = mock<InstanceAiThreadTabsService>();
	const globalConfig = mock<GlobalConfig>({ instanceAi: { evalInstance: false } });

	const controller = new InstanceAiController(
		instanceAiService,
		browserSessionService,
		memoryService,
		onboarding,
		pendingAgentService,
		settingsService,
		modelCatalogService,
		eventBus,
		eventLog,
		durableLogMetrics,
		moduleRegistry,
		projectService,
		instanceAiErrorReporter,
		publisher,
		preferenceCardService,
		globalConfig,
		threadTabsService,
	);

	const req = mock<AuthenticatedRequest>({ user: { id: USER_ID } });
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		// SSE replay reads the durable log; default to an empty thread so tests
		// only stub what they exercise.
		eventLog.getEventsAfter.mockResolvedValue([]);
		eventLog.getEventsForRuns.mockResolvedValue([]);
		eventLog.getOpenSegments.mockReturnValue([]);
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
		settingsService.isModelConfigured.mockResolvedValue(true);
	});

	describe('chat', () => {
		const payload = mock<InstanceAiSendMessageRequest>({
			observerThresholdTokens: undefined,
			message: 'hello',
			timeZone: 'Europe/Helsinki',
			attachments: undefined,
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
		});

		it('should forward thread artifacts to startRun', async () => {
			const payloadWithArtifacts = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'Change this',
				timeZone: 'UTC',
				attachments: undefined,
				threadArtifacts: {
					artifacts: [{ type: 'workflow', id: 'wf-1', name: 'WhatsApp FAQ Auto-Responder' }],
					activeId: 'wf-1',
				},
			});
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-6');

			await controller.chat(req, res, THREAD_ID, payloadWithArtifacts);

			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payloadWithArtifacts.message,
				payloadWithArtifacts.attachments,
				payloadWithArtifacts.context,
				payloadWithArtifacts.timeZone,
				payloadWithArtifacts.pushRef,
				payloadWithArtifacts.mode,
				payloadWithArtifacts.promptVersion,
				payloadWithArtifacts.browserUseAvailable,
				payloadWithArtifacts.threadArtifacts,
				payloadWithArtifacts.observerThresholdTokens,
			);
		});

		describe('observer threshold override', () => {
			const overridePayload = mock<InstanceAiSendMessageRequest>({
				message: 'build',
				attachments: undefined,
				observerThresholdTokens: 1000,
			});

			const manageReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID, role: { scopes: [{ slug: 'instanceAi:manage' }] } },
			});
			const messageReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID, role: { scopes: [{ slug: 'instanceAi:message' }] } },
			});

			beforeEach(() => {
				memoryService.checkThreadOwnership.mockResolvedValue('owned');
				instanceAiService.hasActiveRun.mockReturnValue(false);
			});

			afterEach(() => {
				globalConfig.instanceAi.evalInstance = false;
			});

			it('forwards the override on an eval instance for a caller with instanceAi:manage', async () => {
				globalConfig.instanceAi.evalInstance = true;
				instanceAiService.startRun.mockReturnValue('run-7');

				await controller.chat(manageReq, res, THREAD_ID, overridePayload);

				const args = instanceAiService.startRun.mock.calls[0];
				expect(args[args.length - 1]).toBe(1000);
			});

			it('rejects the override on an eval instance for a caller without instanceAi:manage', async () => {
				globalConfig.instanceAi.evalInstance = true;

				await expect(controller.chat(messageReq, res, THREAD_ID, overridePayload)).rejects.toThrow(
					ForbiddenError,
				);
				expect(instanceAiService.startRun).not.toHaveBeenCalled();
			});

			it('rejects the override on an instance that is not an eval instance', async () => {
				globalConfig.instanceAi.evalInstance = false;

				await expect(controller.chat(manageReq, res, THREAD_ID, overridePayload)).rejects.toThrow(
					ForbiddenError,
				);
				expect(instanceAiService.startRun).not.toHaveBeenCalled();
			});
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
				observerThresholdTokens: undefined,
				message: 'build me a workflow',
				pushRef: 'iframe-push-ref-123',
				timeZone: 'UTC',
				attachments: undefined,
			});
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-2');

			await controller.chat(req, res, THREAD_ID, payloadWithPushRef);

			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payloadWithPushRef.message,
				payloadWithPushRef.attachments,
				payloadWithPushRef.context,
				payloadWithPushRef.timeZone,
				'iframe-push-ref-123',
				payloadWithPushRef.mode,
				payloadWithPushRef.promptVersion,
				payloadWithPushRef.browserUseAvailable,
				payloadWithPushRef.threadArtifacts,
				payloadWithPushRef.observerThresholdTokens,
			);
		});

		it('should forward the build mode and prompt version to startRun', async () => {
			const payloadWithMode = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'build me a workflow',
				timeZone: 'UTC',
				attachments: undefined,
				mode: 'progressive',
				promptVersion: 'progressive@1',
			});
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-5');

			await controller.chat(req, res, THREAD_ID, payloadWithMode);

			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payloadWithMode.message,
				payloadWithMode.attachments,
				payloadWithMode.context,
				payloadWithMode.timeZone,
				payloadWithMode.pushRef,
				'progressive',
				'progressive@1',
				payloadWithMode.browserUseAvailable,
				payloadWithMode.threadArtifacts,
				payloadWithMode.observerThresholdTokens,
			);
		});

		it('should forward handoff context to startRun', async () => {
			const payloadWithContext = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'How do I set up Gmail OAuth?',
				context: {
					source: 'credential-modal',
					credential: {
						credentialType: 'gmailOAuth2',
						displayName: 'Gmail OAuth2 API',
						documentationUrl:
							'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
					},
				},
				timeZone: 'UTC',
				attachments: undefined,
			});
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-3');

			await controller.chat(req, res, THREAD_ID, payloadWithContext);

			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payloadWithContext.message,
				payloadWithContext.attachments,
				payloadWithContext.context,
				payloadWithContext.timeZone,
				payloadWithContext.pushRef,
				payloadWithContext.mode,
				payloadWithContext.promptVersion,
				payloadWithContext.browserUseAvailable,
				payloadWithContext.threadArtifacts,
				payloadWithContext.observerThresholdTokens,
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

		it('should refuse the run when no model is configured', async () => {
			settingsService.isModelConfigured.mockResolvedValue(false);
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);

			await expect(controller.chat(req, res, THREAD_ID, payload)).rejects.toMatchObject({
				message: expect.stringContaining('no model configured'),
			});
			expect(instanceAiService.startRun).not.toHaveBeenCalled();
		});

		it('should reject unsupported attachment types before starting a run', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			const badPayload = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'see attached',
				attachments: [
					{ type: 'file', data: '', mimeType: 'application/zip', fileName: 'archive.zip' },
				],
				timeZone: 'UTC',
			});

			await expect(controller.chat(req, res, THREAD_ID, badPayload)).rejects.toMatchObject({
				message: expect.stringContaining('archive.zip'),
			});
			expect(instanceAiService.startRun).not.toHaveBeenCalled();
		});

		it('should accept supported attachment types and start the run', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-3');
			const goodPayload = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'see attached',
				attachments: [
					{ type: 'file', data: '', mimeType: 'application/pdf', fileName: 'doc.pdf' },
					{ type: 'file', data: '', mimeType: 'image/png', fileName: 'photo.png' },
				],
				timeZone: 'UTC',
			});

			await expect(controller.chat(req, res, THREAD_ID, goodPayload)).resolves.toEqual({
				runId: 'run-3',
			});
			expect(instanceAiService.startRun).toHaveBeenCalled();
		});

		it('should accept a nodes attachment with multiple sets and forward it intact', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			instanceAiService.startRun.mockReturnValue('run-4');
			const sets = [
				{ nodes: [{ id: 'n1', name: 'HTTP Request' }] },
				{
					nodes: [
						{ id: 'n2', name: 'Set' },
						{ id: 'n3', name: 'IF' },
					],
					inputNode: { id: 'n1', name: 'HTTP Request' },
					canvasGroupId: 'g1',
				},
			];
			const nodesPayload = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'what do these nodes do?',
				timeZone: 'UTC',
			});
			// Assigned post-construction — vitest-mock-extended's deep merge loses
			// values inside doubly-nested arrays (sets[].nodes[]) when passed through
			// the constructor.
			nodesPayload.attachments = [{ type: 'nodes', workflowId: 'wf1', sets }];

			await expect(controller.chat(req, res, THREAD_ID, nodesPayload)).resolves.toEqual({
				runId: 'run-4',
			});
			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				nodesPayload.message,
				[{ type: 'nodes', workflowId: 'wf1', sets }],
				nodesPayload.context,
				nodesPayload.timeZone,
				nodesPayload.pushRef,
				nodesPayload.mode,
				nodesPayload.promptVersion,
				nodesPayload.browserUseAvailable,
				nodesPayload.threadArtifacts,
				nodesPayload.observerThresholdTokens,
			);
		});

		it('should reject an oversized attachment before starting a run', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			const oversizedPayload = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'see screenshot',
				attachments: [
					{
						type: 'file',
						data: 'A'.repeat(MAX_ATTACHMENT_BASE64_BYTES + 1),
						mimeType: 'image/png',
						fileName: 'screenshot.png',
					},
				],
				timeZone: 'UTC',
			});

			await expect(controller.chat(req, res, THREAD_ID, oversizedPayload)).rejects.toMatchObject({
				message: expect.stringContaining('screenshot.png'),
			});
			expect(instanceAiService.startRun).not.toHaveBeenCalled();
		});

		it('should reject a combined payload over the total budget before starting a run', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.hasActiveRun.mockReturnValue(false);
			const halfBudget = Math.floor(MAX_TOTAL_ATTACHMENT_BASE64_BYTES / 2) + 1;
			const payloadOverBudget = mock<InstanceAiSendMessageRequest>({
				observerThresholdTokens: undefined,
				message: 'two screenshots',
				attachments: [
					{
						type: 'file',
						data: 'A'.repeat(halfBudget),
						mimeType: 'image/png',
						fileName: 'a.png',
					},
					{
						type: 'file',
						data: 'A'.repeat(halfBudget),
						mimeType: 'image/png',
						fileName: 'b.png',
					},
				],
				timeZone: 'UTC',
			});

			await expect(controller.chat(req, res, THREAD_ID, payloadOverBudget)).rejects.toThrow(
				BadRequestError,
			);
			expect(instanceAiService.startRun).not.toHaveBeenCalled();
		});
	});

	describe('events', () => {
		// Bootstrap fixtures: one live run on group mg-1, and a request/response
		// pair the handler can write to.
		const RUN_START = {
			type: 'run-start',
			runId: 'run-1',
			agentId: 'a1',
			payload: { messageGroupId: 'mg-1' },
		};
		function stubLiveRun(runEvents: unknown[] = []): void {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: true,
				isSuspended: false,
				backgroundTasks: [],
			} as never);
			instanceAiService.getMessageGroupId.mockReturnValue('mg-1');
			instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);
			eventLog.getEventsForRuns.mockResolvedValue(runEvents as never);
		}
		function sseIo(once: Mock = vi.fn()) {
			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: vi.fn(),
				flushHeaders: vi.fn(),
				write: vi.fn(),
				end: vi.fn(),
				flush: vi.fn(),
			});
			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: once as never,
			});
			const frames = () => (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
			return { sseReq, sseRes, frames };
		}

		it('should require instanceAi:message scope', () => {
			expect(scopeOf('events')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should replay events that arrive while bootstrap log reads are in flight', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: true,
				isSuspended: false,
				backgroundTasks: [],
			} as never);
			instanceAiService.getMessageGroupId.mockReturnValue('mg-1');
			instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);
			eventLog.getEventsAfter.mockResolvedValue([]);

			let subscribeHandler: ((stored: { id: number; event: unknown }) => void) | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				// The bootstrap also registers a buffering subscription; the live
				// delivery handler is the first one.
				subscribeHandler ??= handler as (stored: { id: number; event: unknown }) => void;
				return vi.fn();
			});

			// While the run-sync tree read is in flight, a relayed event arrives:
			// the early subscription keeps it flowing into the store, and the replay
			// after the await must pick it up exactly once.
			const midAwaitEvent = {
				id: 7,
				event: { type: 'run-finish', runId: 'run-1', agentId: 'a1', payload: {} },
			};
			eventLog.getEventsForRuns.mockImplementation(async () => {
				subscribeHandler!(midAwaitEvent);
				eventLog.getEventsAfter.mockResolvedValue([midAwaitEvent] as never);
				return [];
			});

			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: vi.fn(),
				flushHeaders: vi.fn(),
				write: vi.fn(),
				end: vi.fn(),
				flush: vi.fn(),
			});
			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: vi.fn(),
			});

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			// Subscription must be registered before the async bootstrap starts, so
			// sibling mains keep relaying events for this thread during the awaits.
			expect(eventBus.subscribe.mock.invocationCallOrder[0]).toBeLessThan(
				(eventLog.getEventsAfter as Mock).mock.invocationCallOrder[0],
			);

			const eventFrames = (sseRes.write as Mock).mock.calls
				.map(([frame]) => String(frame))
				.filter((frame) => frame.includes('run-finish'));
			expect(eventFrames).toEqual([`id: 7\ndata: ${JSON.stringify(midAwaitEvent.event)}\n\n`]);
		});

		it('should replay events that arrive while the run-sync confirmation check is in flight', async () => {
			stubLiveRun([RUN_START]);
			let liveHandler: ((stored: { id: number; event: unknown }) => void) | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				// The bootstrap also registers a buffering subscription; the live
				// delivery handler is the first one.
				liveHandler ??= handler as (stored: { id: number; event: unknown }) => void;
				return vi.fn();
			});
			// While the pending-row check is in flight, a relayed event arrives:
			// the bootstrap must hold it and deliver it exactly once, after the frame.
			const midAwaitEvent = {
				id: 7,
				event: { type: 'run-finish', runId: 'run-1', agentId: 'a1', payload: {} },
			};
			memoryService.flagExpiredConfirmations.mockImplementationOnce(async () => {
				liveHandler!(midAwaitEvent);
				eventLog.getEventsAfter.mockResolvedValue([midAwaitEvent] as never);
			});
			const { sseReq, sseRes, frames } = sseIo();

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			const written = frames();
			const runSyncIndex = written.findIndex((frame) => frame.startsWith('event: run-sync\n'));
			const runFinishFrames = written.filter((frame) => frame.includes('run-finish'));
			expect(runSyncIndex).toBeGreaterThanOrEqual(0);
			expect(runFinishFrames).toEqual([`id: 7\ndata: ${JSON.stringify(midAwaitEvent.event)}\n\n`]);
			expect(written.indexOf(runFinishFrames[0])).toBeGreaterThan(runSyncIndex);
		});

		it('should settle confirmation cards the server no longer holds before writing the run-sync frame', async () => {
			stubLiveRun([RUN_START]);
			eventBus.subscribe.mockReturnValue(vi.fn());
			// The fold only knows the card was requested. The run has since resumed
			// (the pending row is gone), which is what the flagging reports.
			vi.mocked(buildAgentTreeFromEvents).mockReturnValueOnce({
				agentId: 'a1',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						args: {},
						isLoading: true,
						confirmation: { requestId: 'req-1', severity: 'info', message: 'Create workflow?' },
					},
				],
				children: [],
				timeline: [],
			} as never);
			memoryService.flagExpiredConfirmations.mockImplementationOnce(async (messages) => {
				for (const message of messages) {
					for (const tc of message.agentTree?.toolCalls ?? []) {
						if (tc.confirmation) tc.confirmation.expired = true;
					}
				}
			});
			const { sseReq, sseRes, frames } = sseIo();

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			const runSyncFrame = frames().find((frame) => frame.startsWith('event: run-sync\n'));
			expect(runSyncFrame).toBeDefined();
			const { agentTree } = JSON.parse(runSyncFrame!.slice('event: run-sync\ndata: '.length)) as {
				agentTree: {
					toolCalls: Array<{ confirmation?: { requestId: string; expired?: boolean } }>;
				};
			};
			expect(agentTree.toolCalls[0].confirmation).toEqual(
				expect.objectContaining({ requestId: 'req-1', expired: true }),
			);
		});

		it('should clean up the subscription when the client disconnects during bootstrap', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: true,
				isSuspended: false,
				backgroundTasks: [],
			} as never);
			instanceAiService.getMessageGroupId.mockReturnValue('mg-1');
			instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);
			eventLog.getEventsForRuns.mockResolvedValue([]);

			const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];
			eventBus.subscribe.mockImplementation(() => {
				const unsubscribe = vi.fn();
				unsubscribers.push(unsubscribe);
				return unsubscribe;
			});

			let closeHandler: (() => void) | undefined;
			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: vi.fn((event: string, handler: () => void) => {
					if (event === 'close') closeHandler = handler;
				}) as never,
			});
			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: vi.fn(),
				flushHeaders: vi.fn(),
				write: vi.fn(),
				end: vi.fn(),
				flush: vi.fn(),
			});

			// The client disconnects while the replay read is in flight.
			eventLog.getEventsAfter.mockImplementation(async () => {
				closeHandler!();
				return [
					{ id: 1, event: { type: 'text-delta', runId: 'run-1', agentId: 'a1', payload: {} } },
				] as never;
			});

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			// Both the live subscription (via the close handler) and the temporary
			// buffering subscription (via the bootstrap finally) are removed.
			expect(unsubscribers).toHaveLength(2);
			expect(unsubscribers[0]).toHaveBeenCalledTimes(1);
			expect(unsubscribers[1]).toHaveBeenCalledTimes(1);
			expect(sseRes.write).not.toHaveBeenCalled();
		});

		it('should write no run-sync frame when the client disconnects during the confirmation check', async () => {
			stubLiveRun([RUN_START]);
			const unsubscribers: Mock[] = [];
			eventBus.subscribe.mockImplementation(() => {
				const unsubscribe = vi.fn();
				unsubscribers.push(unsubscribe);
				return unsubscribe;
			});
			let closeHandler: (() => void) | undefined;
			const { sseReq, sseRes } = sseIo(
				vi.fn((event: string, handler: () => void) => {
					if (event === 'close') closeHandler = handler;
				}),
			);
			// The client disconnects while the pending-row check is in flight.
			memoryService.flagExpiredConfirmations.mockImplementationOnce(async () => {
				closeHandler!();
			});

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			// Both the live subscription (via the close handler) and the temporary
			// buffering subscription (via the bootstrap finally) are removed.
			expect(unsubscribers).toHaveLength(2);
			expect(unsubscribers[0]).toHaveBeenCalledTimes(1);
			expect(unsubscribers[1]).toHaveBeenCalledTimes(1);
			expect(sseRes.write).not.toHaveBeenCalled();
		});

		it('should close SSE stream when thread ownership changes after pre-creation subscribe', async () => {
			// Simulate: thread does not exist at connect time
			memoryService.checkThreadOwnership.mockResolvedValueOnce('not_found');

			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: vi.fn(),
				flushHeaders: vi.fn(),
				write: vi.fn(),
				end: vi.fn(),
				flush: vi.fn(),
			});

			// Capture the subscribe handler
			let subscribeHandler: ((stored: { id: number; event: unknown }) => void) | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				// The bootstrap also registers a buffering subscription; the live
				// delivery handler is the first one.
				subscribeHandler ??= handler as (stored: { id: number; event: unknown }) => void;
				return vi.fn();
			});
			eventLog.getEventsAfter.mockResolvedValue([]);
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [],
			} as never);

			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: vi.fn(),
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
			expect(sseRes.write).not.toHaveBeenCalled();
		});

		it('checks ownership before a bootstrap frame for a thread created after subscription', async () => {
			stubLiveRun([RUN_START]);
			memoryService.checkThreadOwnership
				.mockResolvedValueOnce('not_found')
				.mockResolvedValueOnce('other_user');
			eventBus.subscribe.mockReturnValue(vi.fn());
			const { sseReq, sseRes } = sseIo();

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			expect(sseRes.end).toHaveBeenCalled();
			expect(sseRes.write).not.toHaveBeenCalled();
		});

		it('refuses an existing internal thread before subscribing or reading events', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');
			const { sseReq, sseRes } = sseIo();

			await expect(
				controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never),
			).rejects.toThrow(ForbiddenError);

			expect(eventBus.subscribe).not.toHaveBeenCalled();
			expect(eventLog.getEventsAfter).not.toHaveBeenCalled();
		});

		it('checks ownership before replaying producer events to a precreation subscription', async () => {
			stubLiveRun([RUN_START]);
			memoryService.checkThreadOwnership
				.mockResolvedValueOnce('not_found')
				.mockResolvedValueOnce('other_user');
			eventBus.subscribe.mockReturnValue(vi.fn());
			eventLog.getEventsAfter.mockResolvedValueOnce([{ id: 1, event: RUN_START }] as never);
			const { sseReq, sseRes } = sseIo();

			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);

			expect(sseRes.end).toHaveBeenCalled();
			expect(sseRes.write).not.toHaveBeenCalled();
		});

		it('preserves event order when ownership resolves during live delivery', async () => {
			const ownership = createDeferredPromise<'owned'>();
			memoryService.checkThreadOwnership
				.mockResolvedValueOnce('not_found')
				.mockReturnValueOnce(ownership.promise);
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [],
			});
			type Subscriber = Parameters<InProcessEventBus['subscribe']>[1];
			let deliver: Subscriber | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				deliver ??= handler;
				return vi.fn();
			});
			const { sseReq, sseRes, frames } = sseIo();
			await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: undefined } as never);
			const emit = (id: number) =>
				deliver?.({
					id,
					event: {
						type: 'text-delta',
						runId: 'run-1',
						agentId: 'a1',
						payload: { text: String(id) },
					},
				});
			emit(1);
			emit(2);
			const incoming = ownership.promise.then(() => emit(3));

			ownership.resolve('owned');
			await incoming;

			expect(frames().map((frame) => frame.match(/^id: (\d+)/)?.[1])).toEqual(['1', '2', '3']);
			expect(memoryService.checkThreadOwnership).toHaveBeenCalledTimes(2);
		});

		it('should close SSE stream when deferred ownership check rejects', async () => {
			memoryService.checkThreadOwnership.mockResolvedValueOnce('not_found');

			const sseRes = mock<Response & { flush?: () => void }>({
				setHeader: vi.fn(),
				flushHeaders: vi.fn(),
				write: vi.fn(),
				end: vi.fn(),
				flush: vi.fn(),
			});

			let subscribeHandler: ((stored: { id: number; event: unknown }) => void) | undefined;
			eventBus.subscribe.mockImplementation((_threadId, handler) => {
				// The bootstrap also registers a buffering subscription; the live
				// delivery handler is the first one.
				subscribeHandler ??= handler as (stored: { id: number; event: unknown }) => void;
				return vi.fn();
			});
			eventLog.getEventsAfter.mockResolvedValue([]);
			instanceAiService.getThreadStatus.mockReturnValue({
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [],
			} as never);

			const sseReq = mock<AuthenticatedRequest>({
				user: { id: USER_ID },
				headers: {},
				once: vi.fn(),
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

	describe('thread access boundary', () => {
		const calls: Array<[string, () => Promise<unknown>]> = [
			['thread details', async () => await controller.getThread(req, res, THREAD_ID)],
			['messages', async () => await controller.getThreadMessages(req, res, THREAD_ID, mock())],
			[
				'raw messages and attachments',
				async () =>
					await controller.getThreadMessages(
						req,
						res,
						THREAD_ID,
						mock<InstanceAiThreadMessagesQuery>({ raw: 'true' }),
					),
			],
			['status', async () => await controller.getThreadStatus(req, res, THREAD_ID)],
			['artifact tabs', async () => await controller.getThreadTabs(req, res, THREAD_ID)],
			['debug data', async () => await controller.listThreadDebugRuns(req, res, THREAD_ID)],
			['run debug data', async () => await controller.getRunDebug(req, res, 'run-1')],
			['cancellation', async () => await controller.cancel(req, res, THREAD_ID)],
			[
				'metadata updates',
				async () =>
					await controller.renameThread(req, res, THREAD_ID, mock({ title: 'New title' })),
			],
			[
				'chat continuation',
				async () => await controller.chat(req, res, THREAD_ID, mock({ message: 'Continue' })),
			],
		];

		it.each(calls)(
			'rejects %s when the actor does not own the storage resource',
			async (_name, call) => {
				memoryService.checkThreadOwnership.mockResolvedValue('other_user');
				instanceAiService.isRunDebugEnabled.mockReturnValue(true);
				instanceAiService.getRunDebug.mockReturnValue(mock({ threadId: THREAD_ID }));

				await expect(call()).rejects.toThrow(ForbiddenError);

				expect(memoryService.checkThreadOwnership).toHaveBeenCalledWith(USER_ID, THREAD_ID);
				expect(instanceAiService.startRun).not.toHaveBeenCalled();
				expect(instanceAiService.routeCancelRun).not.toHaveBeenCalled();
				expect(memoryService.updateThread).not.toHaveBeenCalled();
			},
		);
	});

	describe('cancel', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('cancel')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should cancel the run', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.cancel(req, res, THREAD_ID);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.routeCancelRun).toHaveBeenCalledWith(THREAD_ID);
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

	describe('feedback', () => {
		const RESPONSE_ID = 'mg-1';

		it('should require instanceAi:message scope', () => {
			expect(scopeOf('feedback')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should forward the payload to the service and return { ok: true }', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.submitLangsmithFeedback.mockResolvedValue(undefined);

			const payload = { rating: 'up' as const, comment: 'great' };
			const result = await controller.feedback(req, res, THREAD_ID, RESPONSE_ID, payload);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.submitLangsmithFeedback).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				RESPONSE_ID,
				payload,
			);
		});

		it('should not await the service call so LangSmith latency never blocks the response', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			let resolveService: () => void = () => {};
			instanceAiService.submitLangsmithFeedback.mockReturnValue(
				new Promise<void>((resolve) => {
					resolveService = resolve;
				}),
			);

			const start = Date.now();
			await controller.feedback(req, res, THREAD_ID, RESPONSE_ID, { rating: 'down' });
			expect(Date.now() - start).toBeLessThan(50);
			resolveService();
		});

		it('should throw ForbiddenError for other user thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(
				controller.feedback(req, res, THREAD_ID, RESPONSE_ID, { rating: 'up' }),
			).rejects.toThrow(ForbiddenError);
			expect(instanceAiService.submitLangsmithFeedback).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError for missing thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(
				controller.feedback(req, res, THREAD_ID, RESPONSE_ID, { rating: 'up' }),
			).rejects.toThrow(NotFoundError);
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
			expect(instanceAiService.routeCancelBackgroundTask).toHaveBeenCalledWith(THREAD_ID, 'task-1');
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
			expect(instanceAiService.routeCorrectionToTask).toHaveBeenCalledWith(
				THREAD_ID,
				'task-1',
				'fix this',
			);
		});
	});

	describe('preference card routes', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('undoPreference')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
			expect(scopeOf('editPreference')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});

		const undoneEvent: InstanceAiPreferenceCardEvent = {
			type: 'preference-card',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
			payload: { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'undone' },
		};

		it('undo checks thread access, then returns the published fact', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			preferenceCardService.undo.mockResolvedValue(undoneEvent);
			const payload = { runId: 'run-1', toolCallId: 'tc-1' };

			const result = await controller.undoPreference(req, res, THREAD_ID, 'pref-1', payload);

			expect(result).toEqual({ ok: true, event: undoneEvent });
			expect(memoryService.checkThreadOwnership).toHaveBeenCalledWith(USER_ID, THREAD_ID);
			expect(preferenceCardService.undo).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				'pref-1',
				payload,
			);
		});

		it('undo refuses a thread that belongs to another user before touching the row', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(
				controller.undoPreference(req, res, THREAD_ID, 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
				}),
			).rejects.toThrow(ForbiddenError);
			expect(preferenceCardService.undo).not.toHaveBeenCalled();
		});

		it('undo reports a missing thread before touching the row', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(
				controller.undoPreference(req, res, THREAD_ID, 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
				}),
			).rejects.toThrow(NotFoundError);
			expect(preferenceCardService.undo).not.toHaveBeenCalled();
		});

		it('edit refuses a thread that belongs to another user before touching the row', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(
				controller.editPreference(req, res, THREAD_ID, 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
					content: 'Keep replies brief.',
					scope: 'user' as const,
					userId: USER_ID,
					projectId: null,
				}),
			).rejects.toThrow(ForbiddenError);
			expect(preferenceCardService.edit).not.toHaveBeenCalled();
		});

		it('edit reports a missing thread before touching the row', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(
				controller.editPreference(req, res, THREAD_ID, 'pref-1', {
					runId: 'run-1',
					toolCallId: 'tc-1',
					content: 'Keep replies brief.',
					scope: 'user' as const,
					userId: USER_ID,
					projectId: null,
				}),
			).rejects.toThrow(NotFoundError);
			expect(preferenceCardService.edit).not.toHaveBeenCalled();
		});

		it('edit checks thread access, then returns the preference with the published fact', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const payload = {
				runId: 'run-1',
				toolCallId: 'tc-1',
				content: 'Keep replies brief.',
				scope: 'user' as const,
				userId: USER_ID,
				projectId: null,
			};
			const editedEvent: InstanceAiPreferenceCardEvent = {
				...undoneEvent,
				payload: { ...undoneEvent.payload, state: 'edited', content: 'Keep replies brief.' },
			};
			preferenceCardService.edit.mockResolvedValue({
				preference: mock<AiPreferenceDto>({ id: 'pref-1', content: 'Keep replies brief.' }),
				event: editedEvent,
			});

			const result = await controller.editPreference(req, res, THREAD_ID, 'pref-1', payload);

			expect(memoryService.checkThreadOwnership).toHaveBeenCalledWith(USER_ID, THREAD_ID);
			expect(preferenceCardService.edit).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				'pref-1',
				payload,
			);
			expect(result.preference).toMatchObject({ id: 'pref-1' });
			expect(result.event).toEqual(editedEvent);
		});
	});

	describe('confirm', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('confirm')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should resolve confirmation', async () => {
			instanceAiService.resolveConfirmation.mockResolvedValue({
				ok: true,
				runId: 'run-1',
			});
			const body: InstanceAiConfirmRequest = { kind: 'approval', approved: true };
			const reqWithBody = { ...req, body } as AuthenticatedRequest;

			const result = await controller.confirm(reqWithBody, res, 'req-1');

			expect(result).toEqual({
				ok: true,
				runId: 'run-1',
			});
			expect(instanceAiService.resolveConfirmation).toHaveBeenCalledWith(USER_ID, 'req-1', body);
		});

		it('should pass resourceDecision through to resolveConfirmation', async () => {
			instanceAiService.resolveConfirmation.mockResolvedValue({ ok: true });
			const body: InstanceAiConfirmRequest = {
				kind: 'resourceDecision',
				resourceDecision: 'allowOnce',
			};
			const reqWithBody = { ...req, body } as AuthenticatedRequest;

			await controller.confirm(reqWithBody, res, 'req-1');

			expect(instanceAiService.resolveConfirmation).toHaveBeenCalledWith(USER_ID, 'req-1', body);
		});

		it('should throw NotFoundError when confirmation not found', async () => {
			instanceAiService.resolveConfirmation.mockResolvedValue(null);
			const body: InstanceAiConfirmRequest = { kind: 'approval', approved: false };
			const reqWithBody = { ...req, body } as AuthenticatedRequest;

			await expect(controller.confirm(reqWithBody, res, 'req-1')).rejects.toThrow(NotFoundError);
		});

		it('should check the model before a free-text answer consumes the onboarding card', async () => {
			settingsService.isModelConfigured.mockResolvedValue(false);
			const body: InstanceAiConfirmRequest = {
				kind: 'questions',
				answers: [{ questionId: 'apps', selectedOptions: [], customText: 'import a csv' }],
			};
			const reqWithBody = { ...req, body } as AuthenticatedRequest;

			await expect(controller.confirm(reqWithBody, res, 'onboarding-card')).rejects.toMatchObject({
				message: expect.stringContaining('no model configured'),
			});
			expect(onboarding.answerCard).not.toHaveBeenCalled();
		});

		it('should start the first turn with the answers when the onboarding card holds free text', async () => {
			onboarding.answerCard.mockResolvedValue({ threadId: 'thread-1', firstMessage: 'answers' });
			instanceAiService.startRun.mockReturnValue('run-2');
			const body: InstanceAiConfirmRequest = {
				kind: 'questions',
				answers: [{ questionId: 'apps', selectedOptions: [], customText: 'import a csv' }],
			};
			const reqWithBody = { ...req, body } as AuthenticatedRequest;

			const result = await controller.confirm(reqWithBody, res, 'onboarding-card');

			expect(result).toEqual({ ok: true, runId: 'run-2' });
			expect(instanceAiService.startRun).toHaveBeenCalledWith(
				reqWithBody.user,
				'thread-1',
				'answers',
			);
			expect(instanceAiService.resolveConfirmation).not.toHaveBeenCalled();
		});

		it('should skip the model check and return the follow-up run when the onboarding card holds no free text', async () => {
			settingsService.isModelConfigured.mockResolvedValue(false);
			onboarding.answerCard.mockResolvedValue({ threadId: 'thread-1', runId: 'run-3' });
			const body: InstanceAiConfirmRequest = {
				kind: 'questions',
				answers: [{ questionId: 'apps', selectedOptions: ['Gmail'] }],
			};
			const reqWithBody = { ...req, body } as AuthenticatedRequest;

			const result = await controller.confirm(reqWithBody, res, 'onboarding-card');

			expect(result).toEqual({ ok: true, runId: 'run-3' });
			expect(instanceAiService.startRun).not.toHaveBeenCalled();
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

	describe('getModelCatalog', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('getModelCatalog')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});

		it('should return the model catalog service response', async () => {
			const response = { models: { anthropic: [], openai: [], openrouter: [] } };
			modelCatalogService.getModels.mockResolvedValue(response);

			await expect(controller.getModelCatalog(req)).resolves.toEqual(response);
		});
	});

	describe('updateAdminSettings', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('updateAdminSettings')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});

		it('should shut down browser sessions when enabled is set to false', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: false,
				browserUseEnabled: true,
			} as never);
			const payload = { enabled: false } as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(browserSessionService.shutdown).toHaveBeenCalled();
		});

		it('should not shut down browser sessions when enabling features', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: true,
				browserUseEnabled: true,
			} as never);
			const payload = {
				enabled: true,
				browserUseEnabled: true,
			} as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(browserSessionService.shutdown).not.toHaveBeenCalled();
		});

		it('should publish settings reloads and refresh affected module settings', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({ enabled: true } as never);

			await controller.updateAdminSettings(req, res, { enabled: true });

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-instance-ai-settings',
			});
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('agents');
		});

		it('should publish and attempt every local side effect when one fails', async () => {
			const refreshError = new Error('refresh failed');
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: false,
				browserUseEnabled: false,
			} as never);
			moduleRegistry.refreshModuleSettings.mockRejectedValueOnce(refreshError);

			await expect(
				controller.updateAdminSettings(req, res, { enabled: false }),
			).resolves.toBeDefined();
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-instance-ai-settings',
			});
			expect(browserSessionService.shutdown).toHaveBeenCalled();
			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(refreshError, {
				component: 'settings-side-effects',
				threadId: 'admin-settings',
			});
		});

		it('should report a publish failure after applying committed settings', async () => {
			const committedSettings = {
				enabled: false,
				browserUseEnabled: false,
			};
			const publishError = new Error('publish failed');
			settingsService.updateAdminSettings.mockResolvedValue(committedSettings as never);
			publisher.publishCommand.mockRejectedValue(publishError);

			await expect(controller.updateAdminSettings(req, res, { enabled: false })).resolves.toBe(
				committedSettings,
			);
			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(publishError, {
				component: 'settings-publish',
				threadId: 'admin-settings',
			});
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(browserSessionService.shutdown).toHaveBeenCalled();
		});
	});

	describe('reloadAdminSettings', () => {
		it('should apply side effects from the reloaded local flags', async () => {
			settingsService.isInstanceAiEnabled.mockReturnValue(false);
			settingsService.isBrowserUseEnabled.mockReturnValue(false);

			await controller.reloadAdminSettings();

			expect(settingsService.reloadFromDb).toHaveBeenCalled();
			expect(settingsService.getAdminSettings).not.toHaveBeenCalled();
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(browserSessionService.shutdown).toHaveBeenCalled();
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

	describe('listServiceCredentials', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('listServiceCredentials')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});
	});

	describe('listInstanceModelCredentials', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('listInstanceModelCredentials')).toEqual({
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
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			const threadResult = mock<InstanceAiEnsureThreadResponse>();
			memoryService.ensureThread.mockResolvedValue(threadResult);
			const payload = mock<InstanceAiEnsureThreadRequest>({
				threadId: 'custom-id',
				projectId: 'project-1',
				source: 'assistant_page',
				origin: undefined,
				sourceContext: undefined,
			});

			const result = await controller.ensureThread(req, res, payload);

			expect(result).toBe(threadResult);
			expect(memoryService.ensureThread).toHaveBeenCalledWith(USER_ID, 'custom-id', 'project-1', {
				source: 'assistant_page',
				origin: 'internal',
				sourceContext: undefined,
			});
		});

		it('should generate a UUID when threadId is not provided', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			memoryService.ensureThread.mockResolvedValue(mock<InstanceAiEnsureThreadResponse>());
			const payload = mock<InstanceAiEnsureThreadRequest>({
				threadId: undefined,
				projectId: 'project-1',
				source: 'assistant_page',
				origin: undefined,
				sourceContext: undefined,
			});

			await controller.ensureThread(req, res, payload);

			// The controller generates a UUID — just verify ensureThread was called with some string
			expect(memoryService.ensureThread).toHaveBeenCalledWith(
				USER_ID,
				expect.any(String),
				'project-1',
				{
					source: 'assistant_page',
					origin: 'internal',
					sourceContext: undefined,
				},
			);
		});

		it('forwards launch metadata with the provided source and origin', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			memoryService.ensureThread.mockResolvedValue(mock<InstanceAiEnsureThreadResponse>());
			const payload = {
				threadId: 'custom-id',
				projectId: 'project-1',
				source: 'website-template',
				origin: 'external',
				sourceContext: { templateId: '6270' },
			} as InstanceAiEnsureThreadRequest;

			await controller.ensureThread(req, res, payload);

			expect(memoryService.ensureThread).toHaveBeenCalledWith(USER_ID, 'custom-id', 'project-1', {
				source: 'website-template',
				origin: 'external',
				sourceContext: { templateId: '6270' },
			});
		});

		it('reports ensure-thread failures to observability before rethrowing', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			const error = new Error('persist failed');
			memoryService.ensureThread.mockRejectedValue(error);
			const payload = mock<InstanceAiEnsureThreadRequest>({
				threadId: 'thread-new',
				projectId: 'project-1',
				source: 'assistant_page',
			});

			await expect(controller.ensureThread(req, res, payload)).rejects.toThrow(error);

			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(error, {
				component: 'instance-ai-ensure-thread',
				threadId: 'thread-new',
				userId: USER_ID,
				projectId: 'project-1',
			});
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
			expect(instanceAiService.routeClearThreadState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
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

	describe('persistPendingAgent', () => {
		const payload = new InstanceAiPersistPendingAgentRequest({
			projectId: 'project-1',
			agentId: 'aBcDeFgHiJkLmNoP',
			name: 'New Agent',
		});

		it('should require instanceAi:message scope', () => {
			expect(scopeOf('persistPendingAgent')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});

		it('should persist and bind the pending agent for an owned thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const result = { agent: { id: 'aBcDeFgHiJkLmNoP' }, thread: mock<InstanceAiThreadInfo>() };
			pendingAgentService.persistAndBind.mockResolvedValue(result as never);

			await expect(controller.persistPendingAgent(req, res, THREAD_ID, payload)).resolves.toBe(
				result,
			);
			expect(pendingAgentService.persistAndBind).toHaveBeenCalledWith(
				req.user,
				THREAD_ID,
				payload,
				undefined,
			);
		});

		it.each([
			['other_user', ForbiddenError],
			// Unlike chat, this has no allowNew: there is no pending marker to prove
			// anything with until the thread exists.
			['not_found', NotFoundError],
		] as const)('should reject a %s thread before persisting', async (ownership, expected) => {
			memoryService.checkThreadOwnership.mockResolvedValue(ownership);

			await expect(controller.persistPendingAgent(req, res, THREAD_ID, payload)).rejects.toThrow(
				expected,
			);
			expect(pendingAgentService.persistAndBind).not.toHaveBeenCalled();
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

	describe('thread tabs', () => {
		const tabsState: AssistantThreadTabsState = {
			tabs: [{ type: 'workflow', id: 'wf-1', name: 'My Workflow', projectId: 'project-1' }],
			closedTabs: [{ type: 'data-table', id: 'dt-1' }],
			activeTab: { type: 'workflow', id: 'wf-1' },
		};

		// Later tests read the ownership mock without setting it, so leave it as found.
		afterEach(() => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
		});

		it('should require instanceAi:message scope to read and save tabs', () => {
			expect(scopeOf('getThreadTabs')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
			expect(scopeOf('saveThreadTabs')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should return the stored tabs of the user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			threadTabsService.getState.mockResolvedValue(tabsState);

			const result = await controller.getThreadTabs(req, res, THREAD_ID);

			expect(result).toEqual({ state: tabsState });
			expect(threadTabsService.getState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
		});

		it('should save the tabs of the user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const payload = new AssistantThreadTabsRequestDto(tabsState);

			const result = await controller.saveThreadTabs(req, res, THREAD_ID, payload);

			expect(result).toEqual({ state: tabsState });
			expect(threadTabsService.saveState).toHaveBeenCalledWith(THREAD_ID, USER_ID, tabsState);
		});

		it('should save whether the preview is open', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const payload = new AssistantThreadTabsRequestDto({ ...tabsState, previewOpen: false });

			const result = await controller.saveThreadTabs(req, res, THREAD_ID, payload);

			expect(result).toEqual({ state: { ...tabsState, previewOpen: false } });
			expect(threadTabsService.saveState).toHaveBeenCalledWith(THREAD_ID, USER_ID, {
				...tabsState,
				previewOpen: false,
			});
		});

		it('should reject tabs of a thread that belongs to another user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).rejects.toThrow(ForbiddenError);
			await expect(
				controller.saveThreadTabs(
					req,
					res,
					THREAD_ID,
					new AssistantThreadTabsRequestDto(tabsState),
				),
			).rejects.toThrow(ForbiddenError);
			expect(threadTabsService.getState).not.toHaveBeenCalled();
			expect(threadTabsService.saveState).not.toHaveBeenCalled();
		});

		it('should reject tabs of a thread that does not exist', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
			expect(threadTabsService.getState).not.toHaveBeenCalled();
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
			eventLog.getNextEventId.mockResolvedValue(42);
			const query = mock<InstanceAiThreadMessagesQuery>({
				limit: 50,
				page: 0,
				raw: undefined,
			});

			const result = await controller.getThreadMessages(req, res, THREAD_ID, query);

			expect(result).toMatchObject({ nextEventId: 42 });
			expect(instanceAiService.replayUndeliveredTerminalOutcomes).toHaveBeenCalledWith(THREAD_ID);
			expect(memoryService.getRichMessages).toHaveBeenCalledWith(USER_ID, THREAD_ID, {
				limit: 50,
				page: 0,
			});
		});

		it('should carry the latest applied-preferences payload when a turn reported one', async () => {
			memoryService.getRichMessages.mockResolvedValue(
				mock<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>>(),
			);
			eventLog.getNextEventId.mockResolvedValue(42);
			const appliedPreferences = {
				preferences: [{ id: 'pref-1', scope: 'user' as const }],
				renderedLength: 80,
				injectedThisTurn: true as const,
			};
			eventLog.getLastAppliedPreferences.mockResolvedValue(appliedPreferences);
			const query = mock<InstanceAiThreadMessagesQuery>({ limit: 50, page: 0, raw: undefined });

			const result = await controller.getThreadMessages(req, res, THREAD_ID, query);

			expect(result).toMatchObject({ nextEventId: 42, appliedPreferences });
			expect(eventLog.getLastAppliedPreferences).toHaveBeenCalledWith(THREAD_ID);
		});

		it('should omit appliedPreferences when no turn has reported any', async () => {
			memoryService.getRichMessages.mockResolvedValue(
				mock<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>>(),
			);
			eventLog.getNextEventId.mockResolvedValue(42);
			eventLog.getLastAppliedPreferences.mockResolvedValue(undefined);
			const query = mock<InstanceAiThreadMessagesQuery>({ limit: 50, page: 0, raw: undefined });

			const result = await controller.getThreadMessages(req, res, THREAD_ID, query);

			expect(result).not.toHaveProperty('appliedPreferences');
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

	describe('Browser Use endpoints', () => {
		it.each(['createBrowserLink', 'browserStatus', 'browserDisconnectSession'])(
			'%s requires instanceAi:gateway scope',
			(handler) => {
				expect(scopeOf(handler)).toEqual({
					scope: 'instanceAi:gateway',
					globalOnly: true,
				});
			},
		);
	});
});

describe('InstanceAiController — durable-log SSE replay', () => {
	const instanceAiService = mock<InstanceAiService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const eventBus = mock<InProcessEventBus>();
	const eventLog = mock<DurableEventLog>();
	const durableLogMetrics = mock<DurableLogMetrics>();

	const controller = new InstanceAiController(
		instanceAiService,
		mock<InstanceAiBrowserSessionService>(),
		memoryService,
		mock<InstanceAiOnboardingService>(),
		mock<InstanceAiPendingAgentService>(),
		settingsService,
		mock<InstanceAiModelCatalogService>(),
		eventBus,
		eventLog,
		durableLogMetrics,
		mock<ModuleRegistry>(),
		mock<ProjectService>(),
		mock<InstanceAiErrorReporterService>(),
		mock<Publisher>(),
		mock<InstanceAiPreferenceCardService>(),
		mock<GlobalConfig>(),
		mock<InstanceAiThreadTabsService>(),
	);

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
		eventLog.getOpenSegments.mockReturnValue([]);
	});

	it('replays from the durable log and dedups events that land during the async read', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: false,
			isSuspended: false,
			backgroundTasks: [],
		} as never);

		const handlers: Array<(stored: unknown) => void> = [];
		eventBus.subscribe.mockImplementation((_threadId, handler) => {
			handlers.push(handler as never);
			return vi.fn();
		});

		const factA = {
			id: 6,
			event: {
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'a1',
				payload: { toolCallId: 'tc', toolName: 't', args: {} },
			},
		};
		const factB = {
			id: 7,
			event: {
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'a1',
				payload: { status: 'completed' },
			},
		};
		eventLog.getEventsAfter.mockImplementation(async () => {
			// While the DB read is in flight, the drain emits fact 7 live (already
			// part of the replay result: must dedupe) and an id-less delta (must
			// pass through: the cursor never points at it).
			const buffering = handlers.at(-1)!;
			buffering(factB);
			buffering({
				event: { type: 'text-delta', runId: 'run-1', agentId: 'a1', payload: { text: 'x' } },
			});
			return [factA, factB] as never;
		});

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 5 } as never);

		expect(eventLog.getEventsAfter).toHaveBeenCalledWith(THREAD_ID, 5);
		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		// Fact 7 was both replayed and buffered live: delivered exactly once.
		expect(frames.filter((f) => f.includes('run-finish'))).toHaveLength(1);
		expect(frames.filter((f) => f.includes('tool-call'))).toHaveLength(1);
		// The id-less delta passes through with NO id: line.
		const deltaFrame = frames.find((f) => f.includes('text-delta'));
		expect(deltaFrame).toBeDefined();
		expect(deltaFrame!.startsWith('data: ')).toBe(true);
		// Replay instrumentation recorded events served + cursor age.
		expect(durableLogMetrics.recordReplay).toHaveBeenCalledWith(2, 2);
	});

	it('delivers events that land during the run-sync tree reads', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: true,
			isSuspended: false,
			backgroundTasks: [],
		} as never);
		instanceAiService.getMessageGroupId.mockReturnValue('group-1');
		instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);

		const handlers: Array<(stored: unknown) => void> = [];
		eventBus.subscribe.mockImplementation((_threadId, handler) => {
			handlers.push(handler as never);
			return vi.fn();
		});

		eventLog.getEventsAfter.mockResolvedValue([]);
		const treeEvent = {
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'a1',
			payload: { toolCallId: 'tc', toolName: 't', args: {} },
		};
		eventLog.getEventsForRuns.mockImplementation(async () => {
			// A fact lands while the bootstrap tree is being read from the DB:
			// the buffering subscription must still be active here, or the event
			// is lost for good (the cursor advances past it on the next event).
			handlers.at(-1)!({
				id: 8,
				event: {
					type: 'run-finish',
					runId: 'run-1',
					agentId: 'a1',
					payload: { status: 'completed' },
				},
			});
			return [treeEvent] as never;
		});

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 5 } as never);

		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		const syncIndex = frames.findIndex((f) => f.startsWith('event: run-sync'));
		const finishIndex = frames.findIndex((f) => f.includes('run-finish'));
		expect(syncIndex).toBeGreaterThanOrEqual(0);
		expect(finishIndex).toBeGreaterThanOrEqual(0);
		// Delivered exactly once, after the frame whose tree may already fold it
		// (the shared reducer applies it idempotently, like any post-frame event).
		expect(frames.filter((f) => f.includes('run-finish'))).toHaveLength(1);
		expect(finishIndex).toBeGreaterThan(syncIndex);
	});

	it('serves the open streamed segment as one ephemeral delta frame and skips its buffered deltas', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: true,
			isSuspended: false,
			backgroundTasks: [],
		} as never);
		instanceAiService.getMessageGroupId.mockReturnValue('group-1');
		instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);

		const handlers: Array<(stored: unknown) => void> = [];
		eventBus.subscribe.mockImplementation((_threadId, handler) => {
			handlers.push(handler as never);
			return vi.fn();
		});

		eventLog.getEventsAfter.mockResolvedValue([]);
		eventLog.getEventsAfter.mockImplementationOnce(async () => {
			// While the replay read is in flight, the still-streaming segment emits
			// a live delta (id-less, text already inside the coalesce buffer) and a
			// different segment emits one too (must pass through untouched).
			const buffering = handlers.at(-1)!;
			buffering({
				event: {
					type: 'text-delta',
					runId: 'run-1',
					agentId: 'a1',
					responseId: 'msg-open',
					payload: { text: ' 4 5' },
				},
			});
			buffering({
				event: {
					type: 'text-delta',
					runId: 'run-1',
					agentId: 'a1',
					responseId: 'msg-other',
					payload: { text: 'unrelated' },
				},
			});
			return [];
		});
		eventLog.getEventsForRuns.mockResolvedValue([
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'a1',
				payload: { toolCallId: 'tc', toolName: 't', args: {} },
			},
		] as never);
		eventLog.getOpenSegments.mockReturnValue([
			{ runId: 'run-1', agentId: 'a1', kind: 'text', responseId: 'msg-open', text: '1 2 3 4 5' },
		]);

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 5 } as never);

		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		const deltaPayloads = frames
			.filter((f) => f.startsWith('data: ') && f.includes('text-delta'))
			.map(
				(f) =>
					JSON.parse(f.slice('data: '.length)) as {
						responseId?: string;
						payload: { text: string };
					},
			);
		// The served segment's buffered delta is skipped (its text is inside the
		// snapshot); the unrelated delta passes through; the segment itself is
		// served exactly once with the full streamed-so-far text.
		expect(deltaPayloads.map((p) => [p.responseId, p.payload.text])).toEqual([
			['msg-other', 'unrelated'],
			['msg-open', '1 2 3 4 5'],
		]);
		// Ephemeral: no `id:` line, so the browser's replay cursor is unaffected,
		// and written after the run-sync frame so live deltas keep appending to it.
		const segmentIndex = frames.findIndex((f) => f.includes('1 2 3 4 5'));
		const syncIndex = frames.findIndex((f) => f.startsWith('event: run-sync'));
		expect(frames[segmentIndex].startsWith('data: ')).toBe(true);
		expect(syncIndex).toBeGreaterThanOrEqual(0);
		expect(segmentIndex).toBeGreaterThan(syncIndex);
	});

	it('delivers a block persisted mid-bootstrap before the buffered fact that follows it', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: false,
			isSuspended: false,
			backgroundTasks: [],
		} as never);

		const handlers: Array<(stored: unknown) => void> = [];
		eventBus.subscribe.mockImplementation((_threadId, handler) => {
			handlers.push(handler as never);
			return vi.fn();
		});

		// A segment closes while the replay read is in flight: its block (seq 10,
		// live:false) never reaches the buffering subscription — only the closing
		// fact (seq 11) does. The gap read must return the block so the client
		// receives it before the fact, instead of the fact's id line advancing
		// the cursor past a row that was never delivered.
		const block = {
			id: 10,
			event: {
				type: 'text-block',
				runId: 'run-1',
				agentId: 'a1',
				responseId: 'msg-open',
				payload: { text: '1 2 3 4 5' },
			},
		};
		const fact = {
			id: 11,
			event: {
				type: 'tool-input-start',
				runId: 'run-1',
				agentId: 'a1',
				payload: { toolCallId: 'tc', toolName: 't' },
			},
		};
		eventLog.getEventsAfter.mockResolvedValue([block, fact] as never);
		eventLog.getEventsAfter.mockImplementationOnce(async () => {
			// The tail of the closing segment also streamed live: its text is
			// inside the block, so its frame must be skipped, not delivered after.
			handlers.at(-1)!({
				event: {
					type: 'text-delta',
					runId: 'run-1',
					agentId: 'a1',
					responseId: 'msg-open',
					payload: { text: ' 4 5' },
				},
			});
			handlers.at(-1)!(fact);
			return [];
		});

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 9 } as never);

		expect(eventLog.getEventsAfter).toHaveBeenCalledTimes(2);
		expect(eventLog.getEventsAfter).toHaveBeenNthCalledWith(2, THREAD_ID, 9);
		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		const blockIndex = frames.findIndex((f) => f.includes('text-block'));
		const factIndex = frames.findIndex((f) => f.includes('tool-input-start'));
		// Block delivered exactly once, with its id line, before the fact.
		expect(frames.filter((f) => f.includes('text-block'))).toHaveLength(1);
		expect(frames[blockIndex].startsWith('id: 10\n')).toBe(true);
		expect(frames.filter((f) => f.includes('tool-input-start'))).toHaveLength(1);
		expect(frames[factIndex].startsWith('id: 11\n')).toBe(true);
		expect(blockIndex).toBeLessThan(factIndex);
		// The segment's buffered delta was skipped — its text arrives only once,
		// inside the block.
		expect(frames.filter((f) => f.includes('text-delta'))).toHaveLength(0);
	});

	it('strips the id line from a buffered fact that would jump the cursor over an unseen row', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: false,
			isSuspended: false,
			backgroundTasks: [],
		} as never);

		const handlers: Array<(stored: unknown) => void> = [];
		eventBus.subscribe.mockImplementation((_threadId, handler) => {
			handlers.push(handler as never);
			return vi.fn();
		});

		// The segment closes while the GAP read itself is in flight: neither read
		// returns the block at seq 10, but the fact at seq 11 lands in the buffer.
		// Its content must flow, but without an id line — otherwise the browser
		// cursor crosses seq 10 and no later replay ever returns that block.
		eventLog.getEventsAfter.mockResolvedValue([]);
		eventLog.getEventsAfter.mockImplementationOnce(async () => {
			handlers.at(-1)!({
				id: 11,
				event: {
					type: 'run-finish',
					runId: 'run-1',
					agentId: 'a1',
					payload: { status: 'completed' },
				},
			});
			return [];
		});

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 9 } as never);

		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		const finishFrames = frames.filter((f) => f.includes('run-finish'));
		expect(finishFrames).toHaveLength(1);
		expect(finishFrames[0].startsWith('data: ')).toBe(true);
	});

	it('does not re-apply a gap block already folded into a delivered run-sync tree', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: true,
			isSuspended: false,
			backgroundTasks: [],
		} as never);
		instanceAiService.getMessageGroupId.mockReturnValue('group-1');
		instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);

		const handlers: Array<(stored: unknown) => void> = [];
		eventBus.subscribe.mockImplementation((_threadId, handler) => {
			handlers.push(handler as never);
			return vi.fn();
		});

		// The block persisted before the tree read: the run-sync tree already
		// renders it, so re-delivering the row would duplicate its text — but its
		// seq still counts as delivered, keeping the following fact contiguous.
		const blockEvent = {
			type: 'text-block',
			runId: 'run-1',
			agentId: 'a1',
			responseId: 'msg-open',
			payload: { text: '1 2 3 4 5' },
		};
		const fact = {
			id: 11,
			event: {
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'a1',
				payload: { status: 'completed' },
			},
		};
		eventLog.getEventsAfter.mockResolvedValue([{ id: 10, event: blockEvent }, fact] as never);
		eventLog.getEventsAfter.mockImplementationOnce(async () => {
			handlers.at(-1)!(fact);
			return [];
		});
		eventLog.getEventsForRuns.mockResolvedValue([blockEvent] as never);

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 9 } as never);

		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		// The block text appears only inside the run-sync frame, never as its own
		// replayed frame; the fact keeps its id line (seq 10 counted as covered).
		const blockFrames = frames.filter((f) => f.includes('text-block'));
		expect(blockFrames).toHaveLength(0);
		expect(frames.filter((f) => f.startsWith('event: run-sync'))).toHaveLength(1);
		const finishFrames = frames.filter((f) => f.includes('run-finish'));
		expect(finishFrames).toHaveLength(1);
		expect(finishFrames[0].startsWith('id: 11\n')).toBe(true);
	});

	it('removes the buffering subscription when a durable read throws', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: false,
			isSuspended: false,
			backgroundTasks: [],
		} as never);

		const unsubscribers: Array<ReturnType<typeof vi.fn>> = [];
		eventBus.subscribe.mockImplementation(() => {
			const unsubscribe = vi.fn();
			unsubscribers.push(unsubscribe);
			return unsubscribe;
		});
		eventLog.getEventsAfter.mockRejectedValue(new Error('db down'));

		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(),
		});

		await expect(
			controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 5 } as never),
		).rejects.toThrow('db down');

		// Two subscriptions exist: the step-1 live one (cleaned up on connection
		// close) and the temporary replay buffer, which must be removed on the
		// error path rather than lingering on the thread emitter.
		expect(unsubscribers).toHaveLength(2);
		expect(unsubscribers[1]).toHaveBeenCalledTimes(1);
	});

	it('stops the bootstrap when the client disconnects during a durable read', async () => {
		memoryService.checkThreadOwnership.mockResolvedValue('owned');
		instanceAiService.getThreadStatus.mockReturnValue({
			hasActiveRun: true,
			isSuspended: false,
			backgroundTasks: [],
		} as never);
		instanceAiService.getMessageGroupId.mockReturnValue('group-1');
		instanceAiService.getRunIdsForMessageGroup.mockReturnValue(['run-1']);

		eventBus.subscribe.mockReturnValue(vi.fn());

		const onceHandlers = new Map<string, () => void>();
		const sseReq = mock<AuthenticatedRequest>({
			user: { id: USER_ID },
			headers: {},
			once: vi.fn(((eventName: string, handler: () => void) => {
				onceHandlers.set(eventName, handler);
			}) as never),
		});
		const sseRes = mock<Response & { flush?: () => void }>({
			setHeader: vi.fn(),
			flushHeaders: vi.fn(),
			write: vi.fn(),
			end: vi.fn(),
			flush: vi.fn(),
		});

		eventLog.getEventsAfter.mockImplementation(async () => {
			// The browser goes away while the replay read is in flight. Without a
			// post-await check, the frames below would be written to a dead
			// response and the keep-alive interval would be created after cleanup
			// already ran, leaking it for good.
			onceHandlers.get('close')!();
			return [
				{
					id: 6,
					event: {
						type: 'tool-call',
						runId: 'run-1',
						agentId: 'a1',
						payload: { toolCallId: 'tc', toolName: 't', args: {} },
					},
				},
			] as never;
		});

		await controller.events(sseReq, sseRes, THREAD_ID, { lastEventId: 5 } as never);

		const frames = (sseRes.write as Mock).mock.calls.map(([frame]) => String(frame));
		expect(frames.some((f) => f.includes('tool-call'))).toBe(false);
		expect(frames.some((f) => f.startsWith('event: run-sync'))).toBe(false);
		expect(eventLog.getEventsForRuns).not.toHaveBeenCalled();
		expect(durableLogMetrics.recordReplay).not.toHaveBeenCalled();
	});
});
