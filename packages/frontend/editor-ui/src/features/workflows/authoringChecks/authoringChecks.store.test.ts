import type { WorkflowCheckDto, WorkflowCheckTypeDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import * as authoringChecksApi from '@/features/workflows/authoringChecks/authoringChecks.api';
import { useWorkflowAuthoringChecksStore } from '@/features/workflows/authoringChecks/authoringChecks.store';

vi.mock('@/features/workflows/authoringChecks/authoringChecks.api');

const enabledInstance: WorkflowCheckDto = {
	id: 'instance-1',
	name: 'Enabled rule',
	type: 'node-has-direct-parent',
	typeTitle: 'Node has direct parent',
	config: { childNodeType: '@n8n/n8n-nodes-langchain.agent', parentNodeType: 'guardrails' },
	enabled: true,
	severity: 'warning',
};

const disabledInstance: WorkflowCheckDto = {
	...enabledInstance,
	id: 'instance-2',
	name: 'Disabled rule',
	enabled: false,
};

const nodeHasDirectParentType: WorkflowCheckTypeDto = {
	type: 'node-has-direct-parent',
	title: 'Node has direct parent',
	description: 'Ensures a node has a specific parent',
	defaultSeverity: 'warning',
	configSchema: {
		fields: [
			{ name: 'childNodeType', label: 'Child', kind: 'nodeType', required: true },
			{ name: 'parentNodeType', label: 'Parent', kind: 'nodeType', required: true },
		],
	},
};

describe('useWorkflowAuthoringChecksStore', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.clearAllMocks();
	});

	it('reports no enabled checks before fetching', () => {
		const store = useWorkflowAuthoringChecksStore();
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('reports enabled checks after fetchInstances populates the list', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({
			checks: [enabledInstance, disabledInstance],
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchInstances();

		expect(store.instances).toEqual([enabledInstance, disabledInstance]);
		expect(store.hasWorkflowChecksEnabled).toBe(true);
	});

	it('reports no enabled checks when every instance is disabled', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({
			checks: [disabledInstance],
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchInstances();

		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('ensureInstancesLoaded fetches only once across concurrent callers', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({
			checks: [enabledInstance],
		});
		const store = useWorkflowAuthoringChecksStore();

		await Promise.all([
			store.ensureInstancesLoaded(),
			store.ensureInstancesLoaded(),
			store.ensureInstancesLoaded(),
		]);
		await store.ensureInstancesLoaded();

		expect(authoringChecksApi.listWorkflowChecks).toHaveBeenCalledTimes(1);
		expect(store.hasWorkflowChecksEnabled).toBe(true);
	});

	it('ensureInstancesLoaded swallows fetch errors so callers proceed', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockRejectedValue(new Error('network'));
		const store = useWorkflowAuthoringChecksStore();

		await expect(store.ensureInstancesLoaded()).resolves.toBeUndefined();
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('createInstance appends the new row to the list', async () => {
		const created: WorkflowCheckDto = { ...enabledInstance, id: 'new-id', name: 'New rule' };
		vi.mocked(authoringChecksApi.createWorkflowCheck).mockResolvedValue(created);
		const store = useWorkflowAuthoringChecksStore();

		await store.createInstance({
			name: 'New rule',
			type: 'node-has-direct-parent',
			config: enabledInstance.config,
			severity: 'warning',
		});

		expect(store.instances).toEqual([created]);
	});

	it('updateInstance replaces the matching entry in the list', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({
			checks: [enabledInstance],
		});
		vi.mocked(authoringChecksApi.updateWorkflowCheck).mockResolvedValue({
			...enabledInstance,
			enabled: false,
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchInstances();
		await store.updateInstance(enabledInstance.id, { enabled: false });

		expect(store.instances[0].enabled).toBe(false);
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('deleteInstance removes the row from the list', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({
			checks: [enabledInstance, disabledInstance],
		});
		vi.mocked(authoringChecksApi.deleteWorkflowCheck).mockResolvedValue();
		const store = useWorkflowAuthoringChecksStore();

		await store.fetchInstances();
		await store.deleteInstance(enabledInstance.id);

		expect(store.instances).toEqual([disabledInstance]);
		expect(store.hasWorkflowChecksEnabled).toBe(false);
	});

	it('ensureTypesLoaded loads the type list once', async () => {
		vi.mocked(authoringChecksApi.listWorkflowCheckTypes).mockResolvedValue({
			types: [nodeHasDirectParentType],
		});
		const store = useWorkflowAuthoringChecksStore();

		await store.ensureTypesLoaded();
		await store.ensureTypesLoaded();

		expect(authoringChecksApi.listWorkflowCheckTypes).toHaveBeenCalledTimes(1);
		expect(store.types).toEqual([nodeHasDirectParentType]);
	});
});
