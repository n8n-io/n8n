import { createTestNode } from '@/__tests__/mocks';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { EngineCompatibilityReason } from '@n8n/frontend-module-engine-v2';
import { mockEngineV2Compatibility } from '@n8n/frontend-module-engine-v2/__tests__/mocks';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, shallowRef, type ShallowRef } from 'vue';

import { useWorkflowEngineV2Compatibility } from './useWorkflowEngineV2Compatibility';

const INCOMPATIBLE_TYPE = 'n8n-nodes-base.incompatible';

const reason: EngineCompatibilityReason = {
	code: 'error-workflow',
	severity: 'blocking',
	message: 'Engine v2 does not run an error workflow yet.',
};

function createDocument(id: string, engineType: 'v1' | 'v2' = 'v2') {
	const store = useWorkflowDocumentStore(createWorkflowDocumentId(id));
	store.mergeSettings({ engineType });
	return store;
}

/** Runs the composable inside a component that gets `provided` as the open workflow document. */
function mountWithDocument(provided: ShallowRef<WorkflowDocumentStore>) {
	let result!: ReturnType<typeof useWorkflowEngineV2Compatibility>;
	mount(
		defineComponent({
			setup() {
				result = useWorkflowEngineV2Compatibility();
				return () => null;
			},
		}),
		{ global: { provide: { [WorkflowDocumentStoreKey as symbol]: provided } } },
	);
	return result;
}

describe('useWorkflowEngineV2Compatibility', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useSettingsStore().settings.activeModules = ['engine-v2'];
		mockEngineV2Compatibility({
			reasons: (workflow) =>
				workflow.nodes.some((n) => n.type === INCOMPATIBLE_TYPE) ? [reason] : [],
		});
	});

	it('follows the nodes of the document, so no reason is left after a removal', () => {
		const document = createDocument('w1');
		const node = createTestNode({ type: INCOMPATIBLE_TYPE, name: 'Incompatible' });
		document.setNodes([node]);

		const { reasons } = mountWithDocument(shallowRef(document));
		expect(reasons.value).toEqual([reason]);

		document.removeNodeById(node.id);

		expect(reasons.value).toEqual([]);
	});

	it('follows the engine type of the document', () => {
		const document = createDocument('w1');
		document.setNodes([createTestNode({ type: INCOMPATIBLE_TYPE })]);

		const { reasons } = mountWithDocument(shallowRef(document));
		expect(reasons.value).toEqual([reason]);

		document.mergeSettings({ engineType: 'v1' });

		expect(reasons.value).toEqual([]);
	});

	// `useWorkflowImport.importWorkflowExact` replaces the provided document with a new one.
	it('follows a swap of the provided document', () => {
		const provided = shallowRef(createDocument('w1'));
		const { reasons } = mountWithDocument(provided);
		expect(reasons.value).toEqual([]);

		const imported = createDocument('w2');
		imported.setNodes([createTestNode({ type: INCOMPATIBLE_TYPE })]);
		provided.value = imported;

		expect(reasons.value).toEqual([reason]);
	});

	it('checks the document it is given instead of the injected one', () => {
		const injected = createDocument('w1');
		const given = createDocument('w2');
		given.setNodes([createTestNode({ type: INCOMPATIBLE_TYPE })]);

		let result!: ReturnType<typeof useWorkflowEngineV2Compatibility>;
		mount(
			defineComponent({
				setup() {
					result = useWorkflowEngineV2Compatibility(() => given);
					return () => null;
				},
			}),
			{ global: { provide: { [WorkflowDocumentStoreKey as symbol]: shallowRef(injected) } } },
		);

		expect(result.reasons.value).toEqual([reason]);
	});
});
