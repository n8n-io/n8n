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
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { ExecutionService } from '@/executions/execution.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

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
	const workflowRepository = mock<WorkflowRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const tagRepository = mock<TagRepository>();
	const workflowTagMappingRepository = mock<WorkflowTagMappingRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const executionService = mock<ExecutionService>();
	const executionRepository = mock<ExecutionRepository>();
	const projectService = mock<ProjectService>();

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
		projectService,
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
		projectService,
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
		const [calledUser, , message, , , , options] = ctx.instanceAiService.startRun.mock.calls[0];
		expect(calledUser).toBe(USER);
		expect(message).toContain('rename desktop files');
		expect(options).toEqual({ promptMode: 'desktop-assistant-one-shot' });
		expect(result).toMatchObject({ runId: 'run-123' });
		expect(result.threadId).toBeDefined();
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

	test('first call: returns { status: building, runId } and subscribes to the bus', async () => {
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
		const unsubscribe = jest.fn();
		ctx.eventBus.subscribe.mockReturnValue(unsubscribe);

		const result = await ctx.service.promoteThread(USER, { threadId: 't-1', name: 'Banana' });

		expect(ctx.eventBus.subscribe).toHaveBeenCalledWith('t-1', expect.any(Function));
		expect(ctx.instanceAiService.startRun).toHaveBeenCalled();
		const [, , message, , , , options] = ctx.instanceAiService.startRun.mock.calls[0];
		expect(message).toContain('Banana');
		expect(message).toContain('rename desktop files');
		expect(options).toEqual({ promptMode: 'desktop-assistant-promote' });
		expect(result).toEqual({ status: 'building', threadId: 't-1', runId: 'run-promote' });
	});

	test('on a tasks-update with a completed build-workflow planned task, the post-build hook tags the workflow and writes meta', async () => {
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
		ctx.tagRepository.findOne.mockResolvedValue(null);
		ctx.tagRepository.create.mockReturnValue({ name: DESKTOP_ASSISTANT_TAG } as never);
		ctx.tagRepository.save.mockResolvedValue({
			id: 'tag-da',
			name: DESKTOP_ASSISTANT_TAG,
		} as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		ctx.workflowRepository.findOne.mockResolvedValue({ id: 'wf-new', meta: {} } as never);

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.promoteThread(USER, { threadId: 't-1' });
		expect(handler).toBeDefined();

		// Sub-agent planned-task completion is signalled on the parent thread
		// via a tasks-update whose planItems carry the workflowId and whose
		// tasks array reports the matching task as done.
		handler!({
			id: 7,
			event: {
				type: 'tasks-update',
				runId: 'r-1',
				agentId: 'orchestrator',
				payload: {
					tasks: {
						tasks: [{ id: 'task-build', description: 'Build the workflow', status: 'done' }],
					},
					planItems: [
						{
							id: 'task-build',
							title: 'Build the workflow',
							kind: 'build-workflow',
							spec: 'spec',
							deps: [],
							workflowId: 'wf-new',
						},
					],
				},
			},
		} as unknown as StoredEvent);

		// Allow the async finalize chain to drain
		await new Promise((resolve) => setImmediate(resolve));

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
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { promotedWorkflowId: 'wf-new' },
		});
	});

	test('on a run-finish for the promote run, reads workflow-loop metadata and finalises the workflow', async () => {
		const ctx = makeService();
		ctx.memoryService.checkThreadOwnership.mockResolvedValue('owned');
		ctx.memoryService.getThreadMetadata
			.mockResolvedValueOnce(undefined) // initial idempotency check
			.mockResolvedValueOnce({
				// metadata read after run-finish — workflow-loop persisted outcome
				instanceAiWorkflowLoop: {
					wi_xyz: {
						state: { runId: 'run-promote', workflowId: 'wf-loop' },
						lastBuildOutcome: {
							runId: 'run-promote',
							submitted: true,
							workflowId: 'wf-loop',
						},
					},
				},
			});
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
		ctx.tagRepository.findOne.mockResolvedValue(null);
		ctx.tagRepository.create.mockReturnValue({ name: DESKTOP_ASSISTANT_TAG } as never);
		ctx.tagRepository.save.mockResolvedValue({
			id: 'tag-da',
			name: DESKTOP_ASSISTANT_TAG,
		} as never);
		ctx.workflowTagMappingRepository.findOne.mockResolvedValue(null);
		ctx.workflowRepository.findOne.mockResolvedValue({ id: 'wf-loop', meta: {} } as never);

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.promoteThread(USER, { threadId: 't-1' });

		handler!({
			id: 9,
			event: {
				type: 'run-finish',
				runId: 'run-promote',
				agentId: 'orchestrator',
				payload: { status: 'completed' },
			},
		} as unknown as StoredEvent);

		// Drain the metadata read + finalise chain
		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

		expect(ctx.workflowTagMappingRepository.insert).toHaveBeenCalledWith({
			workflowId: 'wf-loop',
			tagId: 'tag-da',
		});
		expect(ctx.memoryService.updateThread).toHaveBeenCalledWith('t-1', {
			metadata: { promotedWorkflowId: 'wf-loop' },
		});
	});

	test('run-finish for an UNRELATED runId does not fire the hook', async () => {
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

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.promoteThread(USER, { threadId: 't-1' });

		handler!({
			id: 9,
			event: {
				type: 'run-finish',
				runId: 'run-something-else',
				agentId: 'orchestrator',
				payload: { status: 'completed' },
			},
		} as unknown as StoredEvent);

		for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));

		expect(ctx.workflowTagMappingRepository.insert).not.toHaveBeenCalled();
		expect(ctx.workflowRepository.update).not.toHaveBeenCalled();
	});

	test('does not fire the post-build hook for an in-flight build-workflow task (workflowId allocated but not yet done)', async () => {
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

		let handler: ((e: StoredEvent) => void) | undefined;
		ctx.eventBus.subscribe.mockImplementation((_threadId, h) => {
			handler = h;
			return () => {};
		});

		await ctx.service.promoteThread(USER, { threadId: 't-1' });

		handler!({
			id: 7,
			event: {
				type: 'tasks-update',
				runId: 'r-1',
				agentId: 'orchestrator',
				payload: {
					tasks: {
						tasks: [{ id: 'task-build', description: 'Build the workflow', status: 'in_progress' }],
					},
					planItems: [
						{
							id: 'task-build',
							title: 'Build the workflow',
							kind: 'build-workflow',
							spec: 'spec',
							deps: [],
							workflowId: 'wf-new',
						},
					],
				},
			},
		} as unknown as StoredEvent);

		await new Promise((resolve) => setImmediate(resolve));

		expect(ctx.workflowTagMappingRepository.insert).not.toHaveBeenCalled();
		expect(ctx.workflowRepository.update).not.toHaveBeenCalled();
		expect(ctx.memoryService.updateThread).not.toHaveBeenCalled();
	});
});

describe('DesktopAssistantService.getHistory', () => {
	test('returns empty when the desktop-assistant tag has never been created', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.tagRepository.findOne.mockResolvedValue(null);

		const result = await ctx.service.getHistory(USER, {});

		expect(result).toEqual({ results: [], estimated: false, count: 0 });
		expect(ctx.executionService.findRangeWithCount).not.toHaveBeenCalled();
	});

	test('passes the intersected workflow ids to the executions service', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-2']);
		ctx.tagRepository.findOne.mockResolvedValue({
			id: 'tag-da',
			name: DESKTOP_ASSISTANT_TAG,
		} as never);
		ctx.workflowTagMappingRepository.find.mockResolvedValue([{ workflowId: 'wf-1' } as never]);
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
				workflowId: ['wf-1'],
				range: expect.objectContaining({ limit: 10 }),
			}),
		);
	});

	test('skips the executions query when nothing is both accessible and tagged', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.tagRepository.findOne.mockResolvedValue({
			id: 'tag-da',
			name: DESKTOP_ASSISTANT_TAG,
		} as never);
		ctx.workflowTagMappingRepository.find.mockResolvedValue([]);

		const result = await ctx.service.getHistory(USER, {});

		expect(result).toEqual({ results: [], estimated: false, count: 0 });
		expect(ctx.executionService.findRangeWithCount).not.toHaveBeenCalled();
	});
});
