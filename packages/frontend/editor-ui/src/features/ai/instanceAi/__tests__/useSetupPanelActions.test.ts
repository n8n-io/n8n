import { nextTick, ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseError } from '@n8n/rest-api-client';

import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import { getWorkflow } from '@/app/api/workflows';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useSetupPanelActions,
	type SetupCredentialItem,
	type SetupPanelApplyResult,
} from '../composables/useSetupPanelActions';

vi.mock('@/app/api/workflows', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getWorkflow: vi.fn(),
}));

const WORKFLOW_ID = 'wf-1';

const credentialItem: SetupCredentialItem = {
	id: `${WORKFLOW_ID}:credential:slackApi`,
	kind: 'credential',
	credentialType: 'slackApi',
	nodeBindings: [{ nodeName: 'Slack' }],
};

const credential = { id: 'cred-1', name: 'My Slack' };

function makeWorkflow(overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
	return createTestWorkflow({
		id: WORKFLOW_ID,
		checksum: 'c1',
		nodes: [createTestNode({ name: 'Slack' })],
		...overrides,
	});
}

function conflictError() {
	return new ResponseError('conflict', { httpStatusCode: 409 });
}

function createHarness(
	options: {
		agentBuilding?: boolean;
		workflowId?: string | undefined;
		onFlushResult?: (result: SetupPanelApplyResult) => void;
	} = {},
) {
	const building = ref(options.agentBuilding ?? false);
	const workflowId = ref('workflowId' in options ? options.workflowId : WORKFLOW_ID);
	const sendMessage = vi.fn().mockResolvedValue(true);

	const updateWorkflow = vi
		.fn()
		.mockImplementation(async (_id: string, data: Partial<IWorkflowDb>) =>
			makeWorkflow({ versionId: 'v2', checksum: 'c2', nodes: data.nodes ?? [] }),
		);
	mockedStore(useWorkflowsStore).updateWorkflow = updateWorkflow;
	vi.mocked(getWorkflow).mockImplementation(async () => makeWorkflow());

	const actions = useSetupPanelActions({
		thread: { sendMessage },
		workflowId: () => workflowId.value,
		isAgentBuilding: () => building.value,
		onFlushResult: options.onFlushResult,
	});
	return { actions, building, workflowId, sendMessage, updateWorkflow };
}

describe('useSetupPanelActions', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.mocked(getWorkflow).mockReset();
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
			.mockResolvedValueOnce(makeWorkflow({ versionId: 'v1b', checksum: 'c1b' }));
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

	it('returns error when the workflow fetch fails', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockRejectedValue(new Error('network'));

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('error');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('refuses to write when the fetched workflow carries no checksum', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockResolvedValue(makeWorkflow({ checksum: undefined }));

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('error');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('returns error without retrying on a non-conflict PATCH failure', async () => {
		const { actions, updateWorkflow } = createHarness();
		updateWorkflow.mockRejectedValue(new Error('boom'));

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('error');
		expect(updateWorkflow).toHaveBeenCalledTimes(1);
	});

	it('drops the bind without writing when every target node is gone', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockResolvedValue(
			makeWorkflow({ nodes: [createTestNode({ name: 'Other' })] }),
		);

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('dropped');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('skips the write when every target node already carries the credential', async () => {
		const { actions, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockResolvedValue(
			makeWorkflow({
				nodes: [
					createTestNode({
						name: 'Slack',
						credentials: { slackApi: { id: 'cred-1', name: 'Old' } },
					}),
				],
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

	it('queues mid-build parameter values and flushes the merged result on release', async () => {
		const { actions, building, updateWorkflow } = createHarness({ agentBuilding: true });

		await expect(
			actions.applyParameterValues('Slack', { channel: '#a', text: 'hi' }),
		).resolves.toBe('queued');
		await expect(actions.applyParameterValues('Slack', { channel: '#b' })).resolves.toBe('queued');
		expect(actions.pendingApplyCount.value).toBe(1);

		building.value = false;
		await vi.waitFor(() => expect(updateWorkflow).toHaveBeenCalledTimes(1));

		expect(updateWorkflow).toHaveBeenCalledWith(
			WORKFLOW_ID,
			expect.objectContaining({
				nodes: [expect.objectContaining({ parameters: { channel: '#b', text: 'hi' } })],
			}),
		);
	});

	it('requeues instead of writing when a build starts during the fetch', async () => {
		const { actions, building, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockImplementationOnce(async () => {
			building.value = true;
			return makeWorkflow();
		});

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('queued');
		expect(updateWorkflow).not.toHaveBeenCalled();
		expect(actions.pendingApplyCount.value).toBe(1);

		building.value = false;
		await vi.waitFor(() => expect(updateWorkflow).toHaveBeenCalledTimes(1));
		expect(actions.pendingApplyCount.value).toBe(0);
	});

	it('drops the write when the panel re-anchors during the fetch', async () => {
		const { actions, workflowId, updateWorkflow } = createHarness();
		vi.mocked(getWorkflow).mockImplementationOnce(async () => {
			workflowId.value = 'wf-2';
			return makeWorkflow();
		});

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('dropped');
		expect(updateWorkflow).not.toHaveBeenCalled();
	});

	it('drops the queue when the artifact re-anchors in the same flush as the build settling', async () => {
		const { actions, building, workflowId, updateWorkflow } = createHarness({
			agentBuilding: true,
		});

		await actions.bindCredential(credentialItem, credential);

		workflowId.value = 'wf-2';
		building.value = false;
		await vi.waitFor(() => expect(actions.pendingApplyCount.value).toBe(0));

		expect(getWorkflow).not.toHaveBeenCalled();
		expect(updateWorkflow).not.toHaveBeenCalled();
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

	it('reports a conflicted settle flush through onFlushResult', async () => {
		const onFlushResult = vi.fn();
		const { actions, building, updateWorkflow } = createHarness({
			agentBuilding: true,
			onFlushResult,
		});
		await actions.bindCredential(credentialItem, credential);
		updateWorkflow.mockRejectedValue(conflictError());

		building.value = false;
		await vi.waitFor(() => expect(onFlushResult).toHaveBeenCalledExactlyOnceWith('conflict'));
	});

	it('does not report a settle flush when nothing is queued', async () => {
		const onFlushResult = vi.fn();
		const { building } = createHarness({ agentBuilding: true, onFlushResult });

		building.value = false;
		await nextTick();
		await Promise.resolve();

		expect(onFlushResult).not.toHaveBeenCalled();
	});

	it('returns the apply outcome from a manual flush', async () => {
		const { actions, building } = createHarness({ agentBuilding: true });
		await actions.bindCredential(credentialItem, credential);

		building.value = false;
		await expect(actions.flushPendingApplies()).resolves.toBe('applied');
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
		const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
		documentStore.hydrate(makeWorkflow());

		await expect(actions.bindCredential(credentialItem, credential)).resolves.toBe('applied');

		expect(documentStore.allNodes[0].credentials).toEqual({
			slackApi: { id: 'cred-1', name: 'My Slack' },
		});
		expect(documentStore.versionId).toBe('v2');
		expect(documentStore.checksum).toBe('c2');
	});

	it('sends the Execute message through the normal send endpoint with the setup panel context', async () => {
		const { actions, sendMessage } = createHarness();

		await expect(actions.executeWorkflow()).resolves.toBe(true);

		expect(sendMessage).toHaveBeenCalledExactlyOnceWith(
			'Run a test execution of this workflow.',
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
