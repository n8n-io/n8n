import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseError } from '@n8n/rest-api-client';

import type { INodeUi, IWorkflowDb } from '@/Interface';
import { getWorkflow } from '@/app/api/workflows';
import { useExistingWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useSetupPanelActions,
	type SetupCredentialItem,
} from '../composables/useSetupPanelActions';

vi.mock('@/app/api/workflows', () => ({
	getWorkflow: vi.fn(),
}));
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(),
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
	useExistingWorkflowDocumentStore: vi.fn(),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const WORKFLOW_ID = 'wf-1';

const credentialItem: SetupCredentialItem = {
	id: `${WORKFLOW_ID}:credential:slackApi`,
	kind: 'credential',
	credentialType: 'slackApi',
	nodeBindings: [{ nodeName: 'Slack' }],
};

const credential = { id: 'cred-1', name: 'My Slack' };

function makeNode(name: string, overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: `id-${name}`,
		name,
		type: 'n8n-nodes-base.test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

function makeWorkflow(overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return {
		id: WORKFLOW_ID,
		versionId: 'v1',
		checksum: 'c1',
		nodes: [makeNode('Slack')],
		connections: {},
		...overrides,
	} as IWorkflowDb;
}

function conflictError() {
	return new ResponseError('conflict', { httpStatusCode: 409 });
}

function createHarness(options: { agentBuilding?: boolean; workflowId?: string | undefined } = {}) {
	const building = ref(options.agentBuilding ?? false);
	const workflowId = ref('workflowId' in options ? options.workflowId : WORKFLOW_ID);
	const sendMessage = vi.fn().mockResolvedValue(true);
	const updateWorkflow = vi.fn(
		async (_id: string, data: { nodes?: INodeUi[] }): Promise<IWorkflowDb> =>
			makeWorkflow({ versionId: 'v2', checksum: 'c2', nodes: data.nodes }),
	);
	vi.mocked(useWorkflowsStore).mockReturnValue({ updateWorkflow } as unknown as ReturnType<
		typeof useWorkflowsStore
	>);
	vi.mocked(getWorkflow).mockImplementation(async () => makeWorkflow());

	const actions = useSetupPanelActions({
		thread: { sendMessage },
		workflowId: () => workflowId.value,
		isAgentBuilding: () => building.value,
	});
	return { actions, building, workflowId, sendMessage, updateWorkflow };
}

describe('useSetupPanelActions', () => {
	beforeEach(() => {
		vi.mocked(getWorkflow).mockReset();
		vi.mocked(useWorkflowsStore).mockReset();
		vi.mocked(useExistingWorkflowDocumentStore).mockReset();
	});

	it('binds a credential through the version-guarded workflow PATCH', async () => {
		const { actions, updateWorkflow } = createHarness();

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('applied');

		expect(updateWorkflow).toHaveBeenCalledExactlyOnceWith(
			WORKFLOW_ID,
			expect.objectContaining({
				versionId: 'v1',
				expectedChecksum: 'c1',
				nodes: [
					expect.objectContaining({
						name: 'Slack',
						credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
					}),
				],
			}),
		);
	});

	it('survives a version conflict: refetches, re-applies the delta, retries once', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow)
			.mockResolvedValueOnce(makeWorkflow())
			.mockResolvedValueOnce(
				makeWorkflow({ versionId: 'v1b', checksum: 'c1b', nodes: [makeNode('Slack')] }),
			);
		updateWorkflow
			.mockRejectedValueOnce(conflictError())
			.mockResolvedValueOnce(makeWorkflow({ versionId: 'v2', checksum: 'c2' }));

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('applied');

		expect(updateWorkflow).toHaveBeenCalledTimes(2);
		expect(updateWorkflow).toHaveBeenLastCalledWith(
			WORKFLOW_ID,
			expect.objectContaining({
				versionId: 'v1b',
				expectedChecksum: 'c1b',
				nodes: [
					expect.objectContaining({
						credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
					}),
				],
			}),
		);
	});

	it('gives up after a second consecutive version conflict', async () => {
		const { actions, updateWorkflow } = createHarness();
		updateWorkflow.mockRejectedValue(conflictError());

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('conflict');
		expect(updateWorkflow).toHaveBeenCalledTimes(2);
	});

	it('drops the bind without writing when every target node is gone', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockResolvedValue(makeWorkflow({ nodes: [makeNode('Other')] }));

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('dropped');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('skips the write when every target node already carries the credential', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockResolvedValue(
			makeWorkflow({
				nodes: [makeNode('Slack', { credentials: { slackApi: { id: 'cred-1', name: 'Old' } } })],
			}),
		);

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('noop');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('queues a mid-build bind and flushes it once the agent lock releases', async () => {
		const { actions, building, updateWorkflow } = createHarness({ agentBuilding: true });

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('queued');
		expect(actions.pendingApplyCount.value).toBe(1);
		expect(updateWorkflow).not.toHaveBeenCalled();

		building.value = false;
		await vi.waitFor(() => expect(updateWorkflow).toHaveBeenCalledTimes(1));

		expect(actions.pendingApplyCount.value).toBe(0);
		expect(updateWorkflow).toHaveBeenCalledWith(
			WORKFLOW_ID,
			expect.objectContaining({
				nodes: [
					expect.objectContaining({
						credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
					}),
				],
			}),
		);
	});

	it('keeps only the latest queued bind per item and holds the lock on manual flushes', async () => {
		const { actions, building, updateWorkflow } = createHarness({ agentBuilding: true });

		await actions.bindCredential(credentialItem, { id: 'cred-old', name: 'Old' });
		await actions.bindCredential(credentialItem, credential);
		expect(actions.pendingApplyCount.value).toBe(1);

		await actions.flushPendingApplies();
		expect(updateWorkflow).not.toHaveBeenCalled();
		expect(actions.pendingApplyCount.value).toBe(1);

		building.value = false;
		await actions.flushPendingApplies();

		expect(updateWorkflow).toHaveBeenCalledExactlyOnceWith(
			WORKFLOW_ID,
			expect.objectContaining({
				nodes: [
					expect.objectContaining({
						credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
					}),
				],
			}),
		);
	});

	it('drops queued writes when the panel re-anchors to another workflow', async () => {
		const { actions, building, workflowId, updateWorkflow } = createHarness({
			agentBuilding: true,
		});

		await actions.bindCredential(credentialItem, credential);
		workflowId.value = 'wf-2';
		await vi.waitFor(() => expect(actions.pendingApplyCount.value).toBe(0));

		building.value = false;
		await actions.flushPendingApplies();
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('applies parameter values through the same guarded PATCH', async () => {
		const { actions, updateWorkflow } = createHarness();

		await expect(actions.applyParameterValues('Slack', { channel: '#general' })).resolves.toBe(
			'applied',
		);

		expect(updateWorkflow).toHaveBeenCalledExactlyOnceWith(
			WORKFLOW_ID,
			expect.objectContaining({
				nodes: [expect.objectContaining({ parameters: { channel: '#general' } })],
			}),
		);
	});

	it('mirrors an applied bind into a hydrated workflow document', async () => {
		const { actions } = createHarness();
		const documentStore = {
			hydrated: true,
			versionData: { name: 'My workflow', description: null },
			updateNodeProperties: vi.fn(),
			setVersionData: vi.fn(),
			setChecksum: vi.fn(),
		};
		vi.mocked(useExistingWorkflowDocumentStore).mockReturnValue(
			documentStore as unknown as ReturnType<typeof useExistingWorkflowDocumentStore>,
		);

		await actions.bindCredential(credentialItem, credential);

		expect(documentStore.updateNodeProperties).toHaveBeenCalledWith({
			name: 'Slack',
			properties: { credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } } },
		});
		expect(documentStore.setVersionData).toHaveBeenCalledWith({
			versionId: 'v2',
			name: 'My workflow',
			description: null,
		});
		expect(documentStore.setChecksum).toHaveBeenCalledWith('c2');
	});

	it('sends the Execute message through the normal send endpoint with the setup panel context', async () => {
		const { actions, sendMessage } = createHarness();

		await expect(actions.executeWorkflow()).resolves.toBe(true);

		expect(sendMessage).toHaveBeenCalledExactlyOnceWith(
			'instanceAi.setupPanel.executeMessage',
			undefined,
			undefined,
			{ source: 'setup-panel-execute', workflowId: WORKFLOW_ID },
		);
	});

	it('does not send Execute without an active artifact workflow', async () => {
		const { actions, sendMessage } = createHarness({ workflowId: undefined });

		await expect(actions.executeWorkflow()).resolves.toBe(false);
		expect(sendMessage).not.toHaveBeenCalled();
	});
});
