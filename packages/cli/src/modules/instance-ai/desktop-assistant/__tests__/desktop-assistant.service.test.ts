import type { User } from '@n8n/db';
import type {
	ExecutionRepository,
	TagRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import type { StoredEvent } from '@n8n/instance-ai';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExecutionService } from '@/executions/execution.service';
import type { NodeTypes } from '@/node-types';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { DESKTOP_ASSISTANT_TAG } from '../constants';
import { DesktopAssistantService } from '../desktop-assistant.service';
import type { InProcessEventBus } from '../../event-bus/in-process-event-bus';
import type { InstanceAiMemoryService } from '../../instance-ai-memory.service';
import type { InstanceAiService } from '../../instance-ai.service';

function makeService() {
	const logger = mock<Logger>();
	const instanceAiService = mock<InstanceAiService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const eventBus = mock<InProcessEventBus>();
	// Default: subscribing returns a no-op unsubscribe so build-outcome listeners
	// (promote, edit, one-shot) get a real cleanup fn. Tests that drive the bus
	// override this with mockImplementation to capture the handler.
	eventBus.subscribe.mockReturnValue(() => {});
	const workflowRepository = mock<WorkflowRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const tagRepository = mock<TagRepository>();
	const workflowTagMappingRepository = mock<WorkflowTagMappingRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const executionService = mock<ExecutionService>();
	const executionRepository = mock<ExecutionRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	// Default: no error data to enrich; specific tests override.
	executionPersistence.findMultipleExecutions.mockResolvedValue([]);
	const projectService = mock<ProjectService>();
	const nodeTypes = mock<NodeTypes>();
	const credentialTypes = mock<CredentialTypes>();
	const workflowService = mock<WorkflowService>();

	const service = new DesktopAssistantService(
		logger,
		instanceAiService,
		memoryService,
		eventBus,
		workflowRepository,
		workflowFinderService,
		workflowSharingService,
		tagRepository,
		workflowTagMappingRepository,
		credentialsFinderService,
		executionService,
		executionRepository,
		executionPersistence,
		projectService,
		nodeTypes,
		credentialTypes,
		workflowService,
	);

	return {
		service,
		logger,
		instanceAiService,
		memoryService,
		eventBus,
		workflowRepository,
		workflowFinderService,
		workflowSharingService,
		tagRepository,
		workflowTagMappingRepository,
		credentialsFinderService,
		executionService,
		executionRepository,
		executionPersistence,
		projectService,
		nodeTypes,
		credentialTypes,
		workflowService,
	};
}

const USER: User = mock<User>({ id: 'user-1' });

describe('DesktopAssistantService.triggerTask', () => {
	test('rejects an empty prompt with BadRequestError', async () => {
		const { service } = makeService();
		await expect(service.triggerTask(USER, { prompt: '   ' })).rejects.toBeInstanceOf(
			BadRequestError,
		);
	});

	test('starts a run with the one-shot prompt mode and returns { threadId, runId }', async () => {
		const ctx = makeService();
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.memoryService.ensureThread.mockResolvedValue({
			thread: {
				id: 't',
				resourceId: USER.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			created: true,
		});
		ctx.instanceAiService.startRun.mockReturnValue('run-123');

		const result = await ctx.service.triggerTask(USER, { prompt: 'rename desktop files' });

		expect(ctx.memoryService.ensureThread).toHaveBeenCalledTimes(1);
		// The thread is marked as desktop-originated at creation for provenance.
		const [, , , threadMetadata] = ctx.memoryService.ensureThread.mock.calls[0];
		expect(threadMetadata).toEqual({ source: 'desktop-assistant' });
		const [calledUser, , message] = ctx.instanceAiService.startRun.mock.calls[0];
		expect(calledUser).toBe(USER);
		expect(message).toContain('rename desktop files');
		expect(result).toMatchObject({ runId: 'run-123' });
		expect(result.threadId).toBeDefined();
	});

	test('forwards context attachments and structured context into the run', async () => {
		const ctx = makeService();
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.memoryService.ensureThread.mockResolvedValue({
			thread: {
				id: 't',
				resourceId: USER.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			created: true,
		});
		ctx.instanceAiService.startRun.mockReturnValue('run-456');

		const attachments = [{ data: 'abc', mimeType: 'image/jpeg', fileName: 'screen.jpg' }];
		await ctx.service.triggerTask(USER, {
			prompt: 'clean up the current folder',
			context: {
				kind: 'finder',
				app: 'Finder',
				windowTitle: 'Downloads',
				path: '/Users/me/Downloads',
				attachments,
			},
		});

		const [, , message, forwardedAttachments] = ctx.instanceAiService.startRun.mock.calls[0];
		expect(forwardedAttachments).toBe(attachments);
		expect(message).toContain('Currently looking at: Finder — Downloads');
		expect(message).toContain('Path: /Users/me/Downloads');
	});
});

describe('DesktopAssistantService.triggerTask publishing', () => {
	/**
	 * Run a one-shot task whose outcome report names `wf-built`, with
	 * `workflowRepository.findOne` returning `workflow` for the activation
	 * guard's node lookup. The emitted events mirror the contract: the run's
	 * `report-desktop-task-outcome` tool call carries the workflow id, and
	 * `run-finish` (completed) triggers publication.
	 */
	async function triggerAndBuild(
		ctx: ReturnType<typeof makeService>,
		workflow: Record<string, unknown> | null,
		outcomeArgs: Record<string, unknown> = { success: true, workflowId: 'wf-built' },
		runFinishStatus = 'completed',
	) {
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.memoryService.ensureThread.mockResolvedValue({
			thread: {
				id: 't',
				resourceId: USER.id,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			created: true,
		});
		ctx.instanceAiService.startRun.mockReturnValue('run-os');
		ctx.workflowRepository.findOne.mockResolvedValue(workflow as never);

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.triggerTask(USER, { prompt: 'every morning email me the news' });
		expect(handler).toBeDefined();

		handler!({
			id: 7,
			event: {
				type: 'tool-call',
				runId: 'run-os',
				agentId: 'orchestrator',
				payload: {
					toolCallId: 'tc-1',
					toolName: 'report-desktop-task-outcome',
					args: outcomeArgs,
				},
			},
		} as unknown as StoredEvent);
		handler!({
			id: 8,
			event: {
				type: 'run-finish',
				runId: 'run-os',
				agentId: 'orchestrator',
				payload: { status: runFinishStatus },
			},
		} as unknown as StoredEvent);

		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
	}

	test('publishes a runnable workflow built by a one-shot task', async () => {
		const ctx = makeService();
		await triggerAndBuild(ctx, {
			id: 'wf-built',
			nodes: [
				{
					name: 'Schedule',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(ctx.workflowService.activateWorkflow).toHaveBeenCalledWith(USER, 'wf-built', {
			source: 'n8n-ai',
		});
	});

	test('does NOT publish a one-shot workflow that is missing credentials', async () => {
		const ctx = makeService();
		ctx.nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { properties: [], credentials: [{ name: 'gmailOAuth2' }] },
		} as never);
		await triggerAndBuild(ctx, {
			id: 'wf-built',
			nodes: [
				{
					name: 'Gmail',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	test('does nothing when the outcome report names no workflow', async () => {
		const ctx = makeService();
		await triggerAndBuild(ctx, null, { success: true });

		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	test('does NOT publish a workflow reported by a failed task', async () => {
		const ctx = makeService();
		await triggerAndBuild(ctx, null, { success: false, workflowId: 'wf-built' });

		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	test('does NOT publish when the run did not complete', async () => {
		const ctx = makeService();
		await triggerAndBuild(ctx, null, { success: true, workflowId: 'wf-built' }, 'cancelled');

		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
	});
});

describe('DesktopAssistantService.getRecommendations', () => {
	const RECS = {
		recommendations: [
			{ title: 'Summarise this page', prompt: 'Summarise the page I am looking at', icon: '📄' },
			{ title: 'Save for later', prompt: 'Save this page to my reading list', icon: '⭐️' },
		],
	};

	test('grounds the generation in the local context', async () => {
		const ctx = makeService();
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.generateStructured.mockResolvedValue(RECS);

		await ctx.service.getRecommendations(USER, {
			context: {
				kind: 'browser',
				app: 'Google Chrome',
				windowTitle: 'Dashboard',
				url: 'https://x.test',
			},
		});

		const [calledUser, opts] = ctx.instanceAiService.generateStructured.mock.calls[0];
		expect(calledUser).toBe(USER);
		expect(opts.input).toContain('Currently looking at: Google Chrome — Dashboard');
		expect(opts.input).toContain('URL: https://x.test');
		expect(opts.schema).toBeDefined();
	});

	test('grounds the generation in the connected integration types only (no secrets)', async () => {
		const ctx = makeService();
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([
			{ type: 'slackApi', name: 'My Slack', data: 'ENCRYPTED-SECRET' },
			{ type: 'notionApi', name: 'My Notion', data: 'ENCRYPTED-SECRET' },
			{ type: 'slackApi', name: 'Other Slack', data: 'ENCRYPTED-SECRET' },
		] as never);
		ctx.instanceAiService.generateStructured.mockResolvedValue(RECS);

		await ctx.service.getRecommendations(USER, {});

		const [, opts] = ctx.instanceAiService.generateStructured.mock.calls[0];
		// Distinct types are surfaced...
		expect(opts.input).toContain('Connected integrations: slackApi, notionApi');
		// ...but never credential names or secret data.
		expect(opts.input).not.toContain('My Slack');
		expect(opts.input).not.toContain('ENCRYPTED-SECRET');
	});

	test('still generates generic recommendations with no context and no credentials', async () => {
		const ctx = makeService();
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.generateStructured.mockResolvedValue(RECS);

		const result = await ctx.service.getRecommendations(USER, {});

		const [, opts] = ctx.instanceAiService.generateStructured.mock.calls[0];
		expect(opts.input).toContain('No specific context');
		expect(result.recommendations).toHaveLength(2);
		expect(result.recommendations[0]).toEqual({
			title: 'Summarise this page',
			prompt: 'Summarise the page I am looking at',
			icon: '📄',
		});
	});

	test('clamps to at most five recommendations', async () => {
		const ctx = makeService();
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.generateStructured.mockResolvedValue({
			recommendations: Array.from({ length: 7 }, (_, i) => ({
				title: `t${i}`,
				prompt: `p${i}`,
				icon: '✨',
			})),
		});

		const result = await ctx.service.getRecommendations(USER, {});
		expect(result.recommendations).toHaveLength(5);
	});

	test('honours a requested limit', async () => {
		const ctx = makeService();
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.generateStructured.mockResolvedValue({
			recommendations: Array.from({ length: 5 }, (_, i) => ({
				title: `t${i}`,
				prompt: `p${i}`,
				icon: '✨',
			})),
		});

		const result = await ctx.service.getRecommendations(USER, { limit: 3 });

		const [, opts] = ctx.instanceAiService.generateStructured.mock.calls[0];
		expect(opts.input).toContain('Suggest 3 distinct recommendations');
		expect(result.recommendations).toHaveLength(3);
	});

	test('propagates a generation failure so the client can fall back', async () => {
		const ctx = makeService();
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.generateStructured.mockRejectedValue(new Error('model unavailable'));

		await expect(ctx.service.getRecommendations(USER, {})).rejects.toThrow('model unavailable');
	});
});

describe('DesktopAssistantService.promoteThread', () => {
	const body = { threadId: 't-1' };

	test('denies access for not_found threads (NotFoundError)', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('not_found');
		await expect(ctx.service.promoteThread(USER, body)).rejects.toBeInstanceOf(NotFoundError);
	});

	test('denies access for cross-user threads (ForbiddenError)', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('other_user');
		await expect(ctx.service.promoteThread(USER, body)).rejects.toBeInstanceOf(ForbiddenError);
	});

	test('returns { status: done, workflowId } when promoted workflow is still accessible', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({ promotedWorkflowId: 'wf-99' });
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-99', 'wf-1']);

		const result = await ctx.service.promoteThread(USER, body);

		expect(result).toEqual({ status: 'done', threadId: 't-1', workflowId: 'wf-99' });
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
	});

	test('first call: starts the build run, records it, and returns { status: building, runId } without subscribing to the bus', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue(undefined);
		ctx.memoryService.getThreadMessages.mockResolvedValue({
			threadId: 't-1',
			messages: [
				{
					id: 'm-1',
					role: 'user',
					content: 'rename desktop files to banana',
					type: 'text',
					createdAt: new Date().toISOString(),
				},
			],
		});
		ctx.instanceAiService.startRun.mockReturnValue('run-promote');

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1', name: 'Banana' });

		// Promote settles pull-based from the run's completion report — no
		// run-finish listener to leak or time out.
		expect(ctx.eventBus.subscribe).not.toHaveBeenCalled();
		const [, , message] = ctx.instanceAiService.startRun.mock.calls[0];
		expect(message).toContain('Banana');
		expect(message).toContain('rename desktop files');
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { desktopAssistantPromoteRunId: 'run-promote' },
		});
		expect(result).toEqual({ status: 'building', threadId: 't-1', runId: 'run-promote' });
	});

	test('still returns building when the run-id record write fails', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue(undefined);
		ctx.memoryService.getThreadMessages.mockResolvedValue({
			threadId: 't-1',
			messages: [
				{
					id: 'm-1',
					role: 'user',
					content: 'rename files',
					type: 'text',
					createdAt: new Date().toISOString(),
				},
			],
		});
		ctx.instanceAiService.startRun.mockReturnValue('run-promote');
		ctx.memoryService.updateThread.mockRejectedValue(new Error('db unavailable'));

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({ status: 'building', threadId: 't-1', runId: 'run-promote' });
		expect(ctx.logger.warn).toHaveBeenCalledWith(
			'Failed to record promote run id on thread',
			expect.objectContaining({ threadId: 't-1', runId: 'run-promote' }),
		);
	});

	test('returns building while the recorded run is still active', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
		});
		ctx.instanceAiService.getActiveRunId.mockReturnValue('run-promote');

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({ status: 'building', threadId: 't-1', runId: 'run-promote' });
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
	});

	test('returns building while the recorded run is suspended waiting on user input', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
		});
		ctx.instanceAiService.getActiveRunId.mockReturnValue(undefined);
		ctx.instanceAiService.getSuspendedRunId.mockReturnValue('run-promote');

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({ status: 'building', threadId: 't-1', runId: 'run-promote' });
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
	});

	test('confirming call fails the promote and clears the run marker when the run ended without a report', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
		});

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({ status: 'failed', threadId: 't-1' });
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { desktopAssistantPromoteRunId: null },
		});
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
	});

	test('confirming call ignores a completion report filed by a different run', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: { runId: 'run-other', success: true, workflowId: 'wf-stale' },
		});

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({ status: 'failed', threadId: 't-1' });
		expect(ctx.workflowTagMappingRepository.insert).not.toHaveBeenCalled();
	});

	test('confirming call finalizes the reported workflow and returns done', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: { runId: 'run-promote', success: true, workflowId: 'wf-new' },
		});
		ctx.tagRepository.findOne.mockResolvedValue(null);
		ctx.tagRepository.create.mockReturnValue({ name: DESKTOP_ASSISTANT_TAG } as never);
		ctx.tagRepository.save.mockResolvedValue({
			id: 'tag-da',
			name: DESKTOP_ASSISTANT_TAG,
		} as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		ctx.workflowRepository.findOne.mockResolvedValue({
			id: 'wf-new',
			name: 'Tidy my desktop',
			meta: {},
			nodes: [],
		} as never);
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({ status: 'done', threadId: 't-1', workflowId: 'wf-new' });
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
		expect(ctx.workflowTagMappingRepository.insert).toHaveBeenCalledWith({
			workflowId: 'wf-new',
			tagId: 'tag-da',
		});
		expect(ctx.workflowRepository.update).toHaveBeenCalledWith(
			'wf-new',
			expect.objectContaining({
				meta: expect.objectContaining({
					desktopAssistant: expect.objectContaining({ promotedFromThreadId: 't-1' }),
				}),
			}),
		);
		// The done-marker write also clears the run marker, so a re-promote after
		// workflow deletion starts a fresh build instead of replaying the report.
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { promotedWorkflowId: 'wf-new', desktopAssistantPromoteRunId: null },
		});
	});

	test('finalize stores the icon on meta, strips a leading name emoji, and fills the device credential', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: { runId: 'run-promote', success: true, workflowId: 'wf-icon' },
		});
		ctx.instanceAiService.startRun.mockReturnValue('run-promote');
		ctx.tagRepository.findOne.mockResolvedValue({ id: 'tag-da' } as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		// The build disobeyed the no-emoji rule; finalize moves it out of the name.
		ctx.workflowRepository.findOne.mockResolvedValue({
			id: 'wf-icon',
			name: '🧹 Tidy my desktop',
			meta: {},
			nodes: [
				{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Rename', type: '@n8n/n8n-nodes-langchain.computerUse' },
			],
		} as never);
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.findOwnDeviceCredential.mockResolvedValue({
			id: 'cred-dev',
			name: "Elias's MacBook",
			type: 'deviceConnectionApi',
		} as never);

		await ctx.service.promoteThread(USER, { threadId: 't-1', icon: '🍌' });

		// Requested icon wins over the stray name emoji; the name comes out clean.
		expect(ctx.workflowRepository.update).toHaveBeenCalledWith(
			'wf-icon',
			expect.objectContaining({
				name: 'Tidy my desktop',
				meta: expect.objectContaining({
					desktopAssistant: expect.objectContaining({ icon: '🍌' }),
				}),
			}),
		);
		// The Computer Use node gets the user's device credential; the trigger is untouched.
		expect(ctx.workflowRepository.update).toHaveBeenCalledWith('wf-icon', {
			nodes: [
				{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
				{
					name: 'Rename',
					type: '@n8n/n8n-nodes-langchain.computerUse',
					credentials: { deviceConnectionApi: { id: 'cred-dev', name: "Elias's MacBook" } },
				},
			],
		});
	});

	test('finalize pins the request time zone and minutes saved on workflow settings', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: { runId: 'run-promote', success: true, workflowId: 'wf-tz' },
		});
		ctx.tagRepository.findOne.mockResolvedValue({ id: 'tag-da' } as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		ctx.workflowRepository.findOne.mockResolvedValue({
			id: 'wf-tz',
			name: 'Send daily joke',
			meta: {},
			nodes: [],
			settings: { executionOrder: 'v1' },
		} as never);
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

		await ctx.service.promoteThread(USER, {
			threadId: 't-1',
			timeZone: 'Europe/Brussels',
			estimatedMinutesSaved: 2.6,
		});

		// One merged settings write: existing settings preserved, estimate rounded,
		// and the requester's zone pinned so schedules fire in their local time.
		expect(ctx.workflowRepository.update).toHaveBeenCalledWith('wf-tz', {
			settings: { executionOrder: 'v1', timeSavedPerExecution: 3, timezone: 'Europe/Brussels' },
		});
	});

	test('finalize does not clobber a timezone the build already set', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: { runId: 'run-promote', success: true, workflowId: 'wf-tz' },
		});
		ctx.tagRepository.findOne.mockResolvedValue({ id: 'tag-da' } as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		ctx.workflowRepository.findOne.mockResolvedValue({
			id: 'wf-tz',
			name: 'Send daily joke',
			meta: {},
			nodes: [],
			settings: { timezone: 'America/Chicago' },
		} as never);
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

		await ctx.service.promoteThread(USER, { threadId: 't-1', timeZone: 'Europe/Brussels' });

		expect(ctx.workflowRepository.update).toHaveBeenCalledWith('wf-tz', {
			settings: { timezone: 'America/Chicago' },
		});
	});

	test('confirming call surfaces the run-reported failure reason', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: {
				runId: 'run-promote',
				success: false,
				failureReason: 'Verification kept failing: the Slack credential is missing.',
			},
		});

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1' });

		expect(result).toEqual({
			status: 'failed',
			threadId: 't-1',
			reason: 'Verification kept failing: the Slack credential is missing.',
		});
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { desktopAssistantPromoteRunId: null },
		});
		expect(ctx.workflowTagMappingRepository.insert).not.toHaveBeenCalled();
	});

	/**
	 * Run a confirming promote call against a thread whose recorded build run
	 * has finished and reported `workflow.id`, with `workflowRepository.findOne`
	 * returning `workflow` for both the meta write and the activation guard's
	 * node lookup.
	 */
	async function promoteAndFinalise(
		ctx: ReturnType<typeof makeService>,
		workflow: { id: string } & Record<string, unknown>,
	) {
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata.mockResolvedValue({
			desktopAssistantPromoteRunId: 'run-promote',
			desktopAssistantPromotedBuild: {
				runId: 'run-promote',
				success: true,
				workflowId: workflow.id,
			},
		});
		ctx.tagRepository.findOne.mockResolvedValue(null);
		ctx.tagRepository.create.mockReturnValue({ name: DESKTOP_ASSISTANT_TAG } as never);
		ctx.tagRepository.save.mockResolvedValue({
			id: 'tag-da',
			name: DESKTOP_ASSISTANT_TAG,
		} as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		ctx.workflowRepository.findOne.mockResolvedValue(workflow as never);
		// No device credential to fill; the finalise step's lookup must still resolve.
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);

		await ctx.service.promoteThread(USER, { threadId: 't-1' });
	}

	test('auto-publishes a runnable promoted workflow (all credentials connected)', async () => {
		const ctx = makeService();
		// Default nodeTypes mock yields no node requiring credential setup, so the
		// workflow counts as runnable.
		await promoteAndFinalise(ctx, {
			id: 'wf-new',
			meta: {},
			nodes: [
				{
					name: 'Schedule',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(ctx.workflowService.activateWorkflow).toHaveBeenCalledWith(USER, 'wf-new', {
			source: 'n8n-ai',
		});
	});

	test('does NOT auto-publish a promoted workflow that is missing credentials', async () => {
		const ctx = makeService();
		// A node with no credentials slot whose type declares a required credential
		// => surfaces as "needs setup", so we leave it as a draft.
		ctx.nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { properties: [], credentials: [{ name: 'gmailOAuth2' }] },
		} as never);
		await promoteAndFinalise(ctx, {
			id: 'wf-new',
			meta: {},
			nodes: [
				{
					name: 'Gmail',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
		// Tagging + finalisation still happened.
		expect(ctx.workflowTagMappingRepository.insert).toHaveBeenCalled();
		expect(ctx.memoryService.updateThread).toHaveBeenCalled();
	});

	test('swallows an activation failure (e.g. manual-only workflow) and still finalises', async () => {
		const ctx = makeService();
		ctx.workflowService.activateWorkflow.mockRejectedValue(
			new Error('has no node to start the workflow'),
		);
		await promoteAndFinalise(ctx, {
			id: 'wf-new',
			meta: {},
			nodes: [
				{
					name: 'Manual',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(ctx.workflowService.activateWorkflow).toHaveBeenCalled();
		// Failure is best-effort: the promote still finalised.
		expect(ctx.workflowTagMappingRepository.insert).toHaveBeenCalled();
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { promotedWorkflowId: 'wf-new', desktopAssistantPromoteRunId: null },
		});
	});
});

describe('DesktopAssistantService.getHistory', () => {
	test('returns empty when the user has no accessible workflows', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		const result = await ctx.service.getHistory(USER, {});

		expect(result).toEqual({ results: [], estimated: false, count: 0 });
		expect(ctx.executionService.findRangeWithCount).not.toHaveBeenCalled();
	});

	test('passes the accessible tagged (non-archived) workflow ids to the executions service', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-2']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1', tags: [{ name: 'desktop-assistant' }] } as never,
			{ id: 'wf-2', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [],
			count: 0,
			estimated: false,
		});

		await ctx.service.getHistory(USER, { limit: 10 });

		expect(ctx.executionService.findRangeWithCount).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: 'range',
				workflowId: ['wf-1', 'wf-2'],
				range: expect.objectContaining({ limit: 10 }),
			}),
		);
	});

	test('drops archived workflows from the executions query', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-archived']);
		// repository.find with isArchived: false only returns the live one
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [],
			count: 0,
			estimated: false,
		});

		await ctx.service.getHistory(USER, {});

		expect(ctx.workflowRepository.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isArchived: false }),
			}),
		);
		expect(ctx.executionService.findRangeWithCount).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: ['wf-1'] }),
		);
	});

	test('skips the executions query when every accessible workflow is archived', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-archived']);
		ctx.workflowRepository.find.mockResolvedValue([]);

		const result = await ctx.service.getHistory(USER, {});

		expect(result).toEqual({ results: [], estimated: false, count: 0 });
		expect(ctx.executionService.findRangeWithCount).not.toHaveBeenCalled();
	});

	test('filters out workflows without the desktop-assistant tag', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-untagged', 'wf-task']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-untagged', tags: [] } as never,
			{ id: 'wf-task', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [],
			count: 0,
			estimated: false,
		});

		await ctx.service.getHistory(USER, {});

		// History mirrors the task list: only the assistant's own workflows count.
		expect(ctx.executionService.findRangeWithCount).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: ['wf-task'] }),
		);
	});

	test('projects executions to the narrow client shape and strips the name emoji', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					workflowName: '🍌 Morning news brief',
					status: 'success',
					startedAt: new Date('2026-06-10T08:00:00.000Z'),
					createdAt: new Date('2026-06-10T07:59:59.000Z'),
					mode: 'manual',
				} as never,
				{
					id: 'exec-2',
					workflowId: 'wf-1',
					workflowName: 'Tidy up my desktop',
					status: 'error',
					startedAt: null,
					createdAt: new Date('2026-06-09T08:00:00.000Z'),
					mode: 'manual',
				} as never,
			],
			count: 42,
			estimated: true,
		});

		const result = await ctx.service.getHistory(USER, {});

		expect(result).toEqual({
			results: [
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					workflowName: 'Morning news brief',
					status: 'success',
					startedAt: '2026-06-10T08:00:00.000Z',
					createdAt: '2026-06-10T07:59:59.000Z',
				},
				{
					id: 'exec-2',
					workflowId: 'wf-1',
					workflowName: 'Tidy up my desktop',
					status: 'error',
					startedAt: null,
					createdAt: '2026-06-09T08:00:00.000Z',
				},
			],
			count: 42,
			estimated: true,
		});
	});

	test('passes through ISO-string dates as the range query already normalises them', async () => {
		// The range query (`toSummary`) hands back ISO strings, not Date objects.
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					workflowName: 'Morning news brief',
					status: 'success',
					startedAt: '2026-06-10T08:00:00.000Z',
					createdAt: '2026-06-10T07:59:59.000Z',
					mode: 'manual',
				} as never,
			],
			count: 1,
			estimated: false,
		});

		const result = await ctx.service.getHistory(USER, {});

		expect(result.results[0]).toMatchObject({
			startedAt: '2026-06-10T08:00:00.000Z',
			createdAt: '2026-06-10T07:59:59.000Z',
		});
	});

	test('attaches a derived error one-liner to failed rows only', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [
				{ id: 'exec-ok', workflowId: 'wf-1', workflowName: 'A', status: 'success' } as never,
				{ id: 'exec-bad', workflowId: 'wf-1', workflowName: 'B', status: 'error' } as never,
			],
			count: 2,
			estimated: false,
		});
		ctx.executionPersistence.findMultipleExecutions.mockResolvedValue([
			{
				id: 'exec-bad',
				data: {
					resultData: { error: { message: 'Authorization failed', node: { name: 'Dropbox' } } },
				},
			} as never,
		]);

		const result = await ctx.service.getHistory(USER, {});

		// Only the failed row's id is loaded for enrichment.
		expect(ctx.executionPersistence.findMultipleExecutions).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ id: expect.anything() }) }),
			{ includeData: true, unflattenData: true },
		);
		const [ok, bad] = result.results;
		expect(ok.errorMessage).toBeUndefined();
		expect(bad).toMatchObject({
			errorMessage: 'Dropbox: Authorization failed',
			failedNode: 'Dropbox',
		});
	});

	test('does not load execution data when the page has no failed rows', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1', tags: [{ name: 'desktop-assistant' }] } as never,
		]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [
				{ id: 'exec-ok', workflowId: 'wf-1', workflowName: 'A', status: 'success' } as never,
			],
			count: 1,
			estimated: false,
		});

		await ctx.service.getHistory(USER, {});

		expect(ctx.executionPersistence.findMultipleExecutions).not.toHaveBeenCalled();
	});
});

describe('DesktopAssistantService.resolveNodeIcon', () => {
	function withDescription(description: unknown) {
		const ctx = makeService();
		ctx.nodeTypes.getByNameAndVersion.mockReturnValue({ description } as never);
		return ctx.service;
	}

	test('returns a string file iconUrl as-is', () => {
		const service = withDescription({ iconUrl: 'icons/n8n-nodes-base/Slack/slack.svg' });
		expect(service.resolveNodeIcon('n8n-nodes-base.slack')).toEqual({
			iconUrl: 'icons/n8n-nodes-base/Slack/slack.svg',
		});
	});

	test('prefers the dark variant of a themed file iconUrl', () => {
		const service = withDescription({ iconUrl: { light: 'light.svg', dark: 'dark.svg' } });
		expect(service.resolveNodeIcon('x')).toEqual({ iconUrl: 'dark.svg' });
	});

	test('maps a fa: icon to a name plus the palette color', () => {
		const service = withDescription({ icon: 'fa:code', iconColor: 'amber' });
		expect(service.resolveNodeIcon('n8n-nodes-base.code')).toEqual({
			iconName: 'code',
			iconColor: 'amber',
		});
	});

	test('maps an icon: icon to a name (color optional)', () => {
		const service = withDescription({ icon: 'icon:bug' });
		expect(service.resolveNodeIcon('x')).toEqual({ iconName: 'bug', iconColor: undefined });
	});

	test('keeps the full ref for a node: icon (the client set is keyed by it)', () => {
		const service = withDescription({ icon: 'node:edit-fields', iconColor: 'blue' });
		expect(service.resolveNodeIcon('n8n-nodes-base.set')).toEqual({
			iconName: 'node:edit-fields',
			iconColor: 'blue',
		});
	});

	test('prefers a file iconUrl over a fa: icon when both are present', () => {
		const service = withDescription({ icon: 'fa:code', iconColor: 'amber', iconUrl: 'code.svg' });
		expect(service.resolveNodeIcon('x')).toEqual({ iconUrl: 'code.svg' });
	});

	test('returns empty for icon-less nodes', () => {
		expect(withDescription({}).resolveNodeIcon('x')).toEqual({});
	});

	test('returns empty when the node type is unknown', () => {
		const ctx = makeService();
		ctx.nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('Unrecognized node type');
		});
		expect(ctx.service.resolveNodeIcon('does-not-exist')).toEqual({});
	});
});

describe('DesktopAssistantService.getTaskDetail', () => {
	const PARTS = [
		{ kind: 'text', text: 'Send me a news brief every ' },
		{ kind: 'param', id: 'p1', value: 'weekday morning', options: ['morning', 'weekday at 7am'] },
		{ kind: 'text', text: '.' },
	];

	function workflowWith(overrides: Record<string, unknown> = {}) {
		return {
			id: 'wf-1',
			name: '📰 Morning news brief',
			isArchived: false,
			versionId: 'v1',
			nodes: [],
			connections: {},
			meta: undefined,
			...overrides,
		} as never;
	}

	test('throws NotFoundError when the workflow is missing or archived', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
		await expect(ctx.service.getTaskDetail(USER, 'wf-x')).rejects.toBeInstanceOf(NotFoundError);

		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ isArchived: true }),
		);
		await expect(ctx.service.getTaskDetail(USER, 'wf-1')).rejects.toBeInstanceOf(NotFoundError);
	});

	test('returns the stored description without an LLM call', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ meta: { desktopAssistant: { detail: { parts: PARTS } } } }),
		);

		const result = await ctx.service.getTaskDetail(USER, 'wf-1');

		expect(result).toEqual({
			workflowId: 'wf-1',
			versionId: 'v1',
			parts: PARTS,
			connectionsNeeded: [],
		});
		expect(ctx.instanceAiService.generateStructured).not.toHaveBeenCalled();
		expect(ctx.workflowRepository.update).not.toHaveBeenCalled();
	});

	test('includes the timeSavedPerExecution setting as timeSavedMin when set', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({
				settings: { timeSavedPerExecution: 12 },
				meta: { desktopAssistant: { detail: { parts: PARTS } } },
			}),
		);

		const result = await ctx.service.getTaskDetail(USER, 'wf-1');

		expect(result.timeSavedMin).toBe(12);
	});

	test('generates, normalizes, and stores the description when none is stored', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ versionId: 'v2', meta: { desktopAssistant: { icon: '📰' } } }),
		);
		ctx.workflowRepository.findOne.mockResolvedValue(
			workflowWith({ meta: { desktopAssistant: { icon: '📰' } } }),
		);
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([
			{ id: 'c1', type: 'slackApi' },
		] as never);
		ctx.instanceAiService.generateStructured.mockResolvedValue({
			parts: [
				{ kind: 'text', text: 'Every ' },
				{ kind: 'param', value: 'weekday at 6am', options: ['weekday at 6am', 'weekdays at 9am'] },
				{ kind: 'text', text: ', send me a digest.' },
			],
		} as never);

		const result = await ctx.service.getTaskDetail(USER, 'wf-1');

		expect(result.versionId).toBe('v2');
		expect(result.parts).toEqual([
			{ kind: 'text', text: 'Every ' },
			{ kind: 'param', id: 'p1', value: 'weekday at 6am', options: ['weekdays at 9am'] },
			{ kind: 'text', text: ', send me a digest.' },
		]);

		// Grounding includes the emoji-stripped name and connected integrations.
		const [, opts] = ctx.instanceAiService.generateStructured.mock.calls[0];
		expect(opts.input).toContain('Workflow name: Morning news brief');
		expect(opts.input).toContain('Connected integrations: slackApi');

		// The write merges into a freshly-read meta blob (the loaded copy
		// predates the LLM call and may be stale by now).
		const [updatedId, patch] = ctx.workflowRepository.update.mock.calls[0];
		expect(updatedId).toBe('wf-1');
		expect(patch.meta).toEqual({
			desktopAssistant: {
				icon: '📰',
				detail: { parts: result.parts },
			},
		});
	});

	test('treats an all-empty generation as a failure instead of caching it', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowWith());
		ctx.credentialsFinderService.findCredentialsForUser.mockResolvedValue([]);
		ctx.instanceAiService.generateStructured.mockResolvedValue({
			parts: [{ kind: 'text', text: '' }],
		} as never);

		await expect(ctx.service.getTaskDetail(USER, 'wf-1')).rejects.toThrow('no usable description');
		expect(ctx.workflowRepository.update).not.toHaveBeenCalled();
	});

	test('resolves missing credentials into connectionsNeeded with display names', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({
				nodes: [
					{
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				// Legacy stored shape: the extra versionId key is ignored on read.
				meta: {
					desktopAssistant: {
						detail: { versionId: 'v1', parts: PARTS },
					},
				},
			}),
		);
		ctx.nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				properties: [],
				credentials: [{ name: 'gmailOAuth2' }],
			},
		} as never);
		ctx.credentialTypes.getByName.mockReturnValue({ displayName: 'Gmail OAuth2 API' } as never);

		const result = await ctx.service.getTaskDetail(USER, 'wf-1');

		expect(result.connectionsNeeded).toEqual([
			{ credentialType: 'gmailOAuth2', displayName: 'Gmail OAuth2 API' },
		]);
	});

	test('falls back to the credential type name when no display name is resolvable', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({
				nodes: [
					{
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				meta: { desktopAssistant: { detail: { parts: PARTS } } },
			}),
		);
		ctx.nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				properties: [],
				credentials: [{ name: 'gmailOAuth2' }],
			},
		} as never);
		ctx.credentialTypes.getByName.mockImplementation(() => {
			throw new Error('Unrecognized credential type');
		});

		const result = await ctx.service.getTaskDetail(USER, 'wf-1');

		expect(result.connectionsNeeded).toEqual([
			{ credentialType: 'gmailOAuth2', displayName: 'gmailOAuth2' },
		]);
	});
});

describe('DesktopAssistantService.applyTaskEdits', () => {
	const PARTS = [
		{ kind: 'text', text: 'Every ' },
		{ kind: 'param', id: 'p1', value: 'weekday at 6am', options: ['weekdays at 9am'] },
		{ kind: 'text', text: ', send me a digest.' },
	];
	const CHANGES = [{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' }];

	function workflowWith(overrides: Record<string, unknown> = {}) {
		return {
			id: 'wf-1',
			name: '📰 Morning news brief',
			isArchived: false,
			versionId: 'v1',
			nodes: [],
			connections: {},
			meta: { desktopAssistant: { detail: { parts: PARTS } } },
			...overrides,
		} as never;
	}

	test('throws NotFoundError when the workflow is missing', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
		await expect(
			ctx.service.applyTaskEdits(USER, 'wf-x', { changes: CHANGES }),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	test('requires workflow:update scope on the lookup', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowWith());
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.instanceAiService.startRun.mockReturnValue('run-1');

		await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });

		expect(ctx.workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', USER, [
			'workflow:update',
		]);
	});

	test('rejects when there is no stored description to ground the edit', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ meta: undefined }),
		);
		await expect(
			ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES }),
		).rejects.toBeInstanceOf(BadRequestError);
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
	});

	test.each([
		['an unknown paramId', [{ paramId: 'p9', from: 'weekday at 6am', to: 'weekdays at 9am' }]],
		['a stale from value', [{ paramId: 'p1', from: 'weekday at 7am', to: 'weekdays at 9am' }]],
		[
			'duplicate paramIds',
			[
				{ paramId: 'p1', from: 'weekday at 6am', to: 'weekdays at 9am' },
				{ paramId: 'p1', from: 'weekday at 6am', to: 'morning' },
			],
		],
	])('rejects changes with %s', async (_label, changes) => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowWith());
		await expect(ctx.service.applyTaskEdits(USER, 'wf-1', { changes })).rejects.toBeInstanceOf(
			BadRequestError,
		);
		expect(ctx.instanceAiService.startRun).not.toHaveBeenCalled();
	});

	test('starts a run in the edit prompt mode with the grounded change list', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowWith());
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.instanceAiService.startRun.mockReturnValue('run-9');

		const result = await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });

		expect(ctx.memoryService.ensureThread).toHaveBeenCalledTimes(1);
		const [calledUser, , message, , , , options] = ctx.instanceAiService.startRun.mock.calls[0];
		expect(calledUser).toBe(USER);
		expect(message).toContain('id: wf-1');
		expect(message).toContain('Every weekday at 6am, send me a digest.');
		expect(message).toContain('Change "weekday at 6am" to "weekdays at 9am".');
		expect(options).toEqual({ promptMode: 'desktop-assistant-edit' });
		expect(result).toMatchObject({ runId: 'run-9' });
		expect(result.threadId).toBeDefined();
	});

	test('re-publishes the edited version when the workflow was already active', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ activeVersionId: 'v1' }),
		);
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.instanceAiService.startRun.mockReturnValue('run-9');
		// After the edit, the workflow's draft has advanced to v2.
		ctx.workflowRepository.findOne.mockResolvedValue({ id: 'wf-1', versionId: 'v2' } as never);

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		const { threadId } = await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });
		expect(ctx.eventBus.subscribe).toHaveBeenCalledWith(threadId, expect.any(Function));
		expect(handler).toBeDefined();

		handler!({
			id: 9,
			event: {
				type: 'run-finish',
				runId: 'run-9',
				agentId: 'orchestrator',
				payload: { status: 'completed' },
			},
		} as unknown as StoredEvent);

		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

		expect(ctx.workflowService.activateWorkflow).toHaveBeenCalledWith(USER, 'wf-1', {
			versionId: 'v2',
			source: 'n8n-ai',
		});
	});

	test('syncs the stored description on a successful edit but does NOT re-publish an inactive workflow', async () => {
		const ctx = makeService();
		// No activeVersionId => inactive; its edit takes effect on the next run.
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowWith());
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.instanceAiService.startRun.mockReturnValue('run-9');
		// The run changed the workflow: the draft has advanced past v1.
		ctx.workflowRepository.findOne.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v2',
			meta: { desktopAssistant: { detail: { parts: PARTS } } },
		} as never);

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });

		handler!({
			id: 9,
			event: {
				type: 'run-finish',
				runId: 'run-9',
				agentId: 'orchestrator',
				payload: { status: 'completed' },
			},
		} as unknown as StoredEvent);

		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

		// The edited param's value moves to the picked one, and the previous value
		// takes the picked option's slot — the choice set is conserved.
		expect(ctx.workflowRepository.update).toHaveBeenCalledWith('wf-1', {
			meta: {
				desktopAssistant: {
					detail: {
						parts: [
							{ kind: 'text', text: 'Every ' },
							{ kind: 'param', id: 'p1', value: 'weekdays at 9am', options: ['weekday at 6am'] },
							{ kind: 'text', text: ', send me a digest.' },
						],
					},
				},
			},
		});
		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	test.each([['cancelled'], ['error']])(
		'does not sync the description or re-publish when the run finishes with status %s',
		async (status) => {
			const ctx = makeService();
			ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
				workflowWith({ activeVersionId: 'v1' }),
			);
			ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
			ctx.instanceAiService.startRun.mockReturnValue('run-9');
			// The run saved an intermediate version before failing/being cancelled.
			ctx.workflowRepository.findOne.mockResolvedValue({
				id: 'wf-1',
				versionId: 'v2',
				meta: { desktopAssistant: { detail: { parts: PARTS } } },
			} as never);

			let handler: ((e: StoredEvent) => void) | undefined;
			ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
				handler = h;
				return () => {};
			});

			await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });

			handler!({
				id: 9,
				event: {
					type: 'run-finish',
					runId: 'run-9',
					agentId: 'orchestrator',
					payload: { status },
				},
			} as unknown as StoredEvent);

			for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

			expect(ctx.workflowRepository.update).not.toHaveBeenCalled();
			expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
		},
	);

	test('leaves the stored description untouched when the run changed nothing', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowWith());
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.instanceAiService.startRun.mockReturnValue('run-9');
		// versionId still v1: the run made no edit.
		ctx.workflowRepository.findOne.mockResolvedValue({
			id: 'wf-1',
			versionId: 'v1',
			meta: { desktopAssistant: { detail: { parts: PARTS } } },
		} as never);

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });

		handler!({
			id: 9,
			event: {
				type: 'run-finish',
				runId: 'run-9',
				agentId: 'orchestrator',
				payload: { status: 'completed' },
			},
		} as unknown as StoredEvent);

		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

		expect(ctx.workflowRepository.update).not.toHaveBeenCalled();
		expect(ctx.workflowService.activateWorkflow).not.toHaveBeenCalled();
	});

	test('swallows a re-publish failure on run-finish', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ activeVersionId: 'v1' }),
		);
		ctx.projectService.getPersonalProject.mockResolvedValue({ id: 'proj-1' } as never);
		ctx.instanceAiService.startRun.mockReturnValue('run-9');
		ctx.workflowRepository.findOne.mockResolvedValue({ id: 'wf-1', versionId: 'v2' } as never);
		ctx.workflowService.activateWorkflow.mockRejectedValue(new Error('validation failed'));

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.applyTaskEdits(USER, 'wf-1', { changes: CHANGES });

		handler!({
			id: 9,
			event: {
				type: 'run-finish',
				runId: 'run-9',
				agentId: 'orchestrator',
				payload: { status: 'completed' },
			},
		} as unknown as StoredEvent);

		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

		// Attempted, rejected, and swallowed — no unhandled rejection.
		expect(ctx.workflowService.activateWorkflow).toHaveBeenCalled();
	});
});
