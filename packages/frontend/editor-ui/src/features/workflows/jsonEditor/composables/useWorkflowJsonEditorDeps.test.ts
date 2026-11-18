import { createPinia, setActivePinia } from 'pinia';
import { createApp, shallowRef } from 'vue';

import {
	createTestNode,
	createTestNodeProperties,
	createTestWorkflow,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

import { useWorkflowJsonEditorDeps } from './useWorkflowJsonEditorDeps';

describe('useWorkflowJsonEditorDeps', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('finds a node on the canvas by ID, in the saved form', () => {
		useNodeTypesStore().setNodeTypes([
			mockNodeTypeDescription({
				name: 'n8n-nodes-base.set',
				properties: [
					createTestNodeProperties({ name: 'mode', type: 'string', default: 'manual' }),
					createTestNodeProperties({ name: 'value', type: 'string', default: '' }),
				],
			}),
		]);
		const document = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));
		document.hydrate(
			createTestWorkflow({
				id: 'wf-1',
				nodes: [createTestNode({ id: 'a', name: 'A', parameters: { mode: 'manual', value: 'x' } })],
			}),
		);
		const app = createApp({});
		app.provide(WorkflowDocumentStoreKey, shallowRef(document));

		const { validationDeps } = app.runWithContext(() => useWorkflowJsonEditorDeps());

		expect(validationDeps.getCurrentNode?.('a')).toMatchObject({
			id: 'a',
			parameters: { value: 'x' },
		});
		expect(validationDeps.getCurrentNode?.('a')?.parameters).not.toHaveProperty('mode');
		expect(validationDeps.getCurrentNode?.('b')).toBeUndefined();

		document.updateNodeById('a', { notes: 'Checked' });

		expect(validationDeps.getCurrentNode?.('a')?.notes).toBe('Checked');
	});
});
