import type { InstanceAiSetupItem } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import { prepareWorkflowSetup } from '../prepare-workflow-setup';
import { createSetupItemsEmitter } from '../setup-items';
import { analyzeWorkflow } from '../setup-workflow.service';
import { getWorkflowSourceFileBinding } from '../workflow-file-bindings';

vi.mock('../setup-workflow.service', () => ({ analyzeWorkflow: vi.fn(async () => []) }));

const filePath = 'src/workflows/slack.workflow.ts';
const requirements = [{ credentialType: 'slackApi', reason: 'Send daily updates' }];

function createContext() {
	let thread: ThreadRecord = {
		id: 'thread-1',
		resourceId: 'user-1',
		metadata: { unrelated: 'retained' },
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	const snapshots = new Map<string, InstanceAiSetupItem[]>();
	const publish = vi.fn<InstanceAiEventBus['publish']>((_threadId, event) => {
		if (event.type === 'setup-items') snapshots.set(event.payload.workflowId, event.payload.items);
	});
	const threadMemory = {
		patchThread: undefined,
		getThread: vi.fn(async () => thread),
		saveThread: vi.fn(async (updated: ThreadRecord) => (thread = updated)),
	};
	const workflowService = mock<InstanceAiContext['workflowService']>({
		createFromWorkflowJSON: vi.fn().mockResolvedValue({
			id: 'wf-1',
			versionId: 'version-1',
			checksum: 'checksum-1',
		}),
		get: vi.fn().mockResolvedValue({
			id: 'wf-1',
			versionId: 'version-2',
			checksum: 'checksum-2',
		}),
	});
	const context = mock<InstanceAiContext>({
		threadId: thread.id,
		runId: undefined,
		workspaceRoot: undefined,
		aiCreatedWorkflowIds: undefined,
		permissions: mock<InstanceAiContext['permissions']>(),
		logger: mock<InstanceAiContext['logger']>(),
		threadMemory,
		workflowService,
		setupItemsEmitter: createSetupItemsEmitter({
			eventBus: { publish },
			threadId: thread.id,
			runId: 'run-1',
			agentId: 'orchestrator',
			readPersistedSnapshot: async (workflowId) => snapshots.get(workflowId),
		}),
	});
	return { context, threadMemory, workflowService, snapshots, publish };
}

describe('prepareWorkflowSetup', () => {
	beforeEach(() => vi.clearAllMocks());

	it('persists a temporary workflow and source identity before announcing its requirements', async () => {
		const { context, workflowService, threadMemory, snapshots, publish } = createContext();

		const result = await prepareWorkflowSetup(context, {
			filePath: `./${filePath}`,
			workflowName: 'Daily update',
			folderPath: 'Notifications',
			credentials: requirements,
		});

		expect(result).toMatchObject({ success: true, announced: true, workflowId: 'wf-1', filePath });
		expect(workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			{ name: 'Daily update', nodes: [], connections: {} },
			{ markAsAiTemporary: true, folderPath: 'Notifications' },
		);
		expect(threadMemory.saveThread.mock.invocationCallOrder[0]).toBeLessThan(
			publish.mock.invocationCallOrder[0],
		);
		expect(await getWorkflowSourceFileBinding({ ...context }, filePath)).toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'version-1',
			setupPending: true,
		});
		expect((await threadMemory.getThread()).metadata).toHaveProperty('unrelated', 'retained');
		expect(context.aiCreatedWorkflowIds).toContain('wf-1');
		expect(snapshots.get('wf-1')).toEqual([
			{ id: 'wf-1:credential:slackApi', kind: 'credential', ...requirements[0] },
		]);
		expect(analyzeWorkflow).not.toHaveBeenCalled();
	});

	it('reuses the persisted workflow after refresh and removes dropped requirements', async () => {
		const { context, workflowService, snapshots } = createContext();
		await prepareWorkflowSetup(context, {
			filePath,
			workflowName: 'Daily update',
			credentials: requirements,
		});

		const refreshedContext = { ...context };
		await prepareWorkflowSetup(refreshedContext, {
			filePath,
			credentials: [{ credentialType: 'gmailOAuth2' }],
		});
		expect(snapshots.get('wf-1')).toEqual([
			{ id: 'wf-1:credential:gmailOAuth2', kind: 'credential', credentialType: 'gmailOAuth2' },
		]);

		await prepareWorkflowSetup(refreshedContext, { filePath, credentials: [] });
		expect(snapshots.get('wf-1')).toEqual([]);
		expect(workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
		expect(workflowService.get).toHaveBeenCalledWith('wf-1');
		expect(await getWorkflowSourceFileBinding({ ...context }, filePath)).toMatchObject({
			workflowId: 'wf-1',
			workflowVersionId: 'version-2',
			setupPending: true,
		});
	});

	it('announces new-account requirements and retains them for the first build', async () => {
		const { context, snapshots } = createContext();
		context.runId = 'run-early';
		await prepareWorkflowSetup(context, {
			filePath,
			workflowName: 'Daily update',
			credentials: [
				{ credentialType: 'slackApi', preferNew: true },
				{ credentialType: 'gmailOAuth2' },
			],
		});
		expect(snapshots.get('wf-1')).toContainEqual({
			id: 'wf-1:credential:slackApi',
			kind: 'credential',
			credentialType: 'slackApi',
			preferNew: true,
		});
		await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
			setupPreferences: {
				runId: 'run-early',
				satisfiedCredentialTypes: [],
				preferNewCredentialTypes: ['slackApi'],
			},
		});
	});

	it('reuses one workflow for concurrent setup calls for the same source', async () => {
		const { context, workflowService } = createContext();
		const input = { filePath, workflowName: 'Daily update', credentials: requirements };

		const results = await Promise.all([
			prepareWorkflowSetup(context, input),
			prepareWorkflowSetup(context, input),
		]);

		expect(results.map(({ workflowId }) => workflowId)).toEqual(['wf-1', 'wf-1']);
		expect(workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ filePath: '../outside.ts', workflowName: 'Daily update', credentials: requirements },
		{ filePath, workflowName: 'Daily update', credentials: [{ credentialType: 'httpHeaderAuth' }] },
		{ filePath, workflowName: ' ', credentials: requirements },
		{ filePath, workflowName: 'Daily update', credentials: [] },
	])('rejects invalid early setup before creating a workflow: %j', async (input) => {
		const { context, workflowService, publish } = createContext();

		await expect(prepareWorkflowSetup(context, input)).rejects.toThrow();
		expect(workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(publish).not.toHaveBeenCalled();
	});

	it('checks existing workflow access before announcing requirements', async () => {
		const { context, workflowService, publish } = createContext();
		vi.mocked(workflowService.get).mockRejectedValue(new Error('Workflow is unavailable'));

		await expect(
			prepareWorkflowSetup(context, {
				filePath,
				workflowId: 'wf-foreign',
				credentials: requirements,
			}),
		).rejects.toThrow('Workflow is unavailable');
		expect(workflowService.get).toHaveBeenCalledWith('wf-foreign');
		expect(publish).not.toHaveBeenCalled();
	});

	it('announces a first account when adding a service to an existing workflow', async () => {
		const { context, snapshots, workflowService } = createContext();
		await expect(
			prepareWorkflowSetup(context, {
				filePath,
				workflowId: 'wf-1',
				credentials: [{ credentialType: 'slackApi', preferNew: true }],
			}),
		).resolves.toMatchObject({ success: true, announced: true, preBuild: true });
		expect(workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(snapshots.get('wf-1')).toContainEqual(
			expect.objectContaining({ credentialType: 'slackApi', preferNew: true }),
		);
	});

	it('reuses the temporary workflow after its first binding write fails', async () => {
		const { context, threadMemory, workflowService, publish } = createContext();
		threadMemory.saveThread.mockRejectedValueOnce(new Error('Storage unavailable'));
		const input = { filePath, workflowName: 'Daily update', credentials: requirements };

		await expect(prepareWorkflowSetup(context, input)).rejects.toThrow('Could not persist');
		expect(publish).not.toHaveBeenCalled();
		expect(context.aiCreatedWorkflowIds).toContain('wf-1');

		await expect(prepareWorkflowSetup(context, input)).resolves.toMatchObject({
			success: true,
			announced: true,
			workflowId: 'wf-1',
		});
		expect(workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
		expect(publish).toHaveBeenCalledTimes(1);
		expect(threadMemory.saveThread.mock.invocationCallOrder[1]).toBeLessThan(
			publish.mock.invocationCallOrder[0],
		);
		await expect(getWorkflowSourceFileBinding({ ...context }, filePath)).resolves.toMatchObject({
			workflowId: 'wf-1',
			setupPending: true,
		});
	});

	it('does not create a workflow when persisted source bindings cannot be read', async () => {
		const { context, threadMemory, workflowService, publish } = createContext();
		threadMemory.getThread.mockRejectedValue(new Error('Storage unavailable'));

		await expect(
			prepareWorkflowSetup(context, {
				filePath,
				workflowName: 'Daily update',
				credentials: requirements,
			}),
		).rejects.toThrow();
		expect(workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(publish).not.toHaveBeenCalled();
	});

	it.each(['createWorkflow', 'updateWorkflow'] as const)(
		'respects a blocked %s permission',
		async (permission) => {
			const { context, workflowService } = createContext();
			context.permissions = mock<InstanceAiContext['permissions']>({ [permission]: 'blocked' });

			await expect(
				prepareWorkflowSetup(context, {
					filePath,
					workflowName: 'Daily update',
					credentials: requirements,
				}),
			).rejects.toThrow('blocked by admin policy');
			expect(workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		},
	);
});
