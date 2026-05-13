import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { INodeUi } from '@/Interface';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useWorkflowContext } from '../useWorkflowContext';

function makeNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'node-1',
		name: 'Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

function getDocStore() {
	const workflowsStore = useWorkflowsStore();
	return useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId));
}

describe('useWorkflowContext', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('returns undefined when no workflow is open', () => {
		const { snapshot } = useWorkflowContext();
		expect(snapshot()).toBeUndefined();
	});

	it('returns workflowId, nodes, and connections from the open workflow', () => {
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('wf-42');
		const doc = getDocStore();
		doc.setName('Demo Workflow');
		doc.setNodes([
			makeNode({ name: 'Trigger', type: 'n8n-nodes-base.scheduleTrigger' }),
			makeNode({ id: 'node-2', name: 'HTTP', type: 'n8n-nodes-base.httpRequest' }),
		]);
		doc.setConnections({
			Trigger: { main: [[{ node: 'HTTP', type: 'main' as const, index: 0 }]] },
		});

		const { snapshot } = useWorkflowContext();
		const ctx = snapshot();
		expect(ctx?.workflowId).toBe('wf-42');
		expect(ctx?.name).toBe('Demo Workflow');
		expect(ctx?.nodes).toHaveLength(2);
		expect(ctx?.nodes[0].name).toBe('Trigger');
		expect(ctx?.nodes[1].type).toBe('n8n-nodes-base.httpRequest');
		expect(ctx?.connections).toMatchObject({
			Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] },
		});
	});

	it('forwards the active node name from the NDV store when set', () => {
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('wf-42');
		getDocStore().setNodes([makeNode({ name: 'HTTP' })]);

		const ndvStore = useNDVStore();
		ndvStore.setActiveNodeName('HTTP', 'other');

		const { snapshot } = useWorkflowContext();
		expect(snapshot()?.activeNodeName).toBe('HTTP');
	});

	it('omits activeNodeName when no NDV is open', () => {
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('wf-42');
		getDocStore().setNodes([makeNode()]);

		const { snapshot } = useWorkflowContext();
		expect(snapshot()?.activeNodeName).toBeUndefined();
	});
});
