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
	const executionPersistence = mock<ExecutionPersistence>();
	// Default: no error data to enrich; specific tests override.
	executionPersistence.findMultipleExecutions.mockResolvedValue([]);
	const projectService = mock<ProjectService>();
	const nodeTypes = mock<NodeTypes>();
	const credentialTypes = mock<CredentialTypes>();

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
	test('returns empty when the user has no accessible workflows', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		const result = await ctx.service.getHistory(USER, {});

		expect(result).toEqual({ results: [], estimated: false, count: 0 });
		expect(ctx.executionService.findRangeWithCount).not.toHaveBeenCalled();
	});

	test('passes ALL accessible (non-archived) workflow ids to the executions service', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-2']);
		ctx.workflowRepository.find.mockResolvedValue([
			{ id: 'wf-1' } as never,
			{ id: 'wf-2' } as never,
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
		ctx.workflowRepository.find.mockResolvedValue([{ id: 'wf-1' } as never]);
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

	test('does NOT filter on the desktop-assistant tag (history covers all workflows)', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-untagged']);
		ctx.workflowRepository.find.mockResolvedValue([{ id: 'wf-untagged' } as never]);
		ctx.executionService.buildSharingOptions.mockResolvedValue({});
		ctx.executionService.findRangeWithCount.mockResolvedValue({
			results: [],
			count: 0,
			estimated: false,
		});

		await ctx.service.getHistory(USER, {});

		// Pin that we don't go anywhere near the tag tables.
		expect(ctx.tagRepository.findOne).not.toHaveBeenCalled();
		expect(ctx.workflowTagMappingRepository.find).not.toHaveBeenCalled();
		expect(ctx.executionService.findRangeWithCount).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: ['wf-untagged'] }),
		);
	});

	test('projects executions to the narrow client shape and strips the name emoji', async () => {
		const ctx = makeService();
		ctx.workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		ctx.workflowRepository.find.mockResolvedValue([{ id: 'wf-1' } as never]);
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
		ctx.workflowRepository.find.mockResolvedValue([{ id: 'wf-1' } as never]);
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
		ctx.workflowRepository.find.mockResolvedValue([{ id: 'wf-1' } as never]);
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
		ctx.workflowRepository.find.mockResolvedValue([{ id: 'wf-1' } as never]);
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

	test('returns the cached description without an LLM call when versionId matches', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ meta: { desktopAssistant: { detail: { versionId: 'v1', parts: PARTS } } } }),
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

	test('generates, normalizes, and caches the description on a stale cache', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({
				versionId: 'v2',
				meta: { desktopAssistant: { detail: { versionId: 'v1', parts: PARTS } } },
			}),
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

		// Cache write merges into a freshly-read meta blob (the loaded copy
		// predates the LLM call and may be stale by now).
		const [updatedId, patch] = ctx.workflowRepository.update.mock.calls[0];
		expect(updatedId).toBe('wf-1');
		expect(patch.meta).toEqual({
			desktopAssistant: {
				icon: '📰',
				detail: { versionId: 'v2', parts: result.parts },
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

		await expect(ctx.service.getTaskDetail(USER, 'wf-1')).rejects.toThrow(
			'no usable description',
		);
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
				meta: { desktopAssistant: { detail: { versionId: 'v1', parts: PARTS } } },
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
			meta: { desktopAssistant: { detail: { versionId: 'v1', parts: PARTS } } },
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

	test('rejects when there is no current cached description to ground the edit', async () => {
		const ctx = makeService();
		ctx.workflowFinderService.findWorkflowForUser.mockResolvedValue(
			workflowWith({ versionId: 'v2' }),
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
});
