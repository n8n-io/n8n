/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { createPinia, getActivePinia, setActivePinia } from 'pinia';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { computed, defineComponent, nextTick, ref } from 'vue';
import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StandaloneRunDataHost from './StandaloneRunDataHost.vue';
import {
	createExecutionDataId,
	getExecutionDataStoreId,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import {
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	injectWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

const { loadNodeTypesIfNotLoaded, normalizeWorkflowData } = vi.hoisted(() => ({
	loadNodeTypesIfNotLoaded: vi.fn(),
	normalizeWorkflowData: vi.fn(),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded,
		getNodeType: () => null,
		communityNodeType: () => null,
		isTriggerNode: () => false,
		isConfigNode: () => false,
		isConfigurableNode: () => false,
		getAllNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

vi.mock('@/app/composables/useWorkflowNormalization', () => ({
	useWorkflowNormalization: () => ({ normalizeWorkflowData }),
}));

const WORKFLOW_ID = 'child-workflow';
const EXECUTION_ID = 'execution-1';

function makeExecution(outputStatus = 200, id = EXECUTION_ID) {
	const trigger = createTestNode({
		id: 'trigger',
		name: 'When Executed by Another Workflow',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
	});
	const action = createTestNode({ id: 'action', name: 'HTTP Request' });

	return createTestWorkflowExecutionResponse({
		id,
		status: 'success',
		workflowData: createTestWorkflow({
			id: WORKFLOW_ID,
			versionId: 'workflow-version-1',
			nodes: [trigger, action],
			connections: {
				[trigger.name]: {
					main: [[{ node: action.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		}),
		data: createRunExecutionData({
			resultData: {
				runData: {
					[trigger.name]: [
						createTestTaskData({ data: { main: [[{ json: { query: 'emperor' } }]] } }),
					],
					[action.name]: [
						createTestTaskData({
							source: [{ previousNode: trigger.name, previousNodeOutput: 0, previousNodeRun: 0 }],
							data: { main: [[{ json: { status: outputStatus } }]] },
						}),
					],
				},
			},
		}),
	});
}

const StoreProbe = defineComponent({
	name: 'StoreProbe',
	setup() {
		const documentStore = injectWorkflowDocumentStore();
		const executionStateStore = injectWorkflowExecutionStateStore();
		const ndvStore = injectNDVStore();
		const outputStatus = computed(
			() =>
				executionStateStore.value.activeExecution?.data?.resultData.runData['HTTP Request']?.[0]
					?.data?.main?.[0]?.[0]?.json.status,
		);

		return {
			documentStoreId: computed(() => documentStore.value.$id),
			documentId: computed(() => documentStore.value.documentId),
			executionStateStoreId: computed(() => executionStateStore.value.$id),
			executionDataId: computed(() => executionStateStore.value.displayedExecutionId),
			ndvStoreId: computed(() => ndvStore.value.$id),
			outputStatus,
		};
	},
	template: `
		<div
			data-test-id="store-probe"
			:data-document-store-id="documentStoreId"
			:data-document-id="documentId"
			:data-execution-state-store-id="executionStateStoreId"
			:data-execution-data-id="executionDataId"
			:data-ndv-store-id="ndvStoreId"
		>
			{{ outputStatus }}
		</div>
	`,
});

const SingleHostHarness = defineComponent({
	components: { StandaloneRunDataHost, StoreProbe },
	props: ['execution'],
	emits: ['setupError'],
	template: `
		<StandaloneRunDataHost :execution="execution" @setup-error="$emit('setupError', $event)">
			<StoreProbe />
		</StandaloneRunDataHost>
	`,
});

type AttributeReader = Pick<DOMWrapper<Element>, 'attributes'>;

function requiredAttribute(probe: AttributeReader, name: string): string {
	const value = probe.attributes(name);
	if (value === undefined) throw new Error(`Missing ${name}`);
	return value;
}

function ownedStoreIds(probe: AttributeReader): string[] {
	return [
		requiredAttribute(probe, 'data-document-store-id'),
		requiredAttribute(probe, 'data-execution-state-store-id'),
		getExecutionDataStoreId(
			createExecutionDataId(requiredAttribute(probe, 'data-execution-data-id')),
		),
		requiredAttribute(probe, 'data-ndv-store-id'),
	];
}

function standaloneStoreIds(): string[] {
	return Object.keys(getActivePinia()?.state.value ?? {}).filter((id) =>
		id.includes('standalone-run-data'),
	);
}

beforeEach(() => {
	setActivePinia(createPinia());
	loadNodeTypesIfNotLoaded.mockReset();
	loadNodeTypesIfNotLoaded.mockResolvedValue(undefined);
	normalizeWorkflowData.mockReset();
	normalizeWorkflowData.mockImplementation(
		({ nodes, connections }: { nodes: unknown[]; connections: object }) => ({ nodes, connections }),
	);
});

describe('StandaloneRunDataHost', () => {
	it('isolates concurrent hosts for the same execution and disposes only the unmounted host', async () => {
		const Harness = defineComponent({
			components: { StandaloneRunDataHost, StoreProbe },
			setup: () => ({ execution: makeExecution(), showFirst: ref(true) }),
			template: `
				<button data-test-id="remove-first" @click="showFirst = false" />
				<StandaloneRunDataHost v-if="showFirst" :execution="execution"><StoreProbe /></StandaloneRunDataHost>
				<StandaloneRunDataHost :execution="execution"><StoreProbe /></StandaloneRunDataHost>
			`,
		});
		const wrapper = mount(Harness);
		await flushPromises();
		expect(loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(2);
		expect(standaloneStoreIds()).toHaveLength(8);

		const probes = wrapper.findAll('[data-test-id="store-probe"]');
		expect(probes).toHaveLength(2);
		expect(probes[0].attributes('data-document-id')).not.toBe(
			probes[1].attributes('data-document-id'),
		);
		expect(probes.map((probe) => probe.text())).toEqual(['200', '200']);

		const firstStoreIds = ownedStoreIds(probes[0]);
		const secondStoreIds = ownedStoreIds(probes[1]);
		await wrapper.get('[data-test-id="remove-first"]').trigger('click');
		await flushPromises();

		for (const storeId of firstStoreIds) {
			expect(getActivePinia()?.state.value[storeId]).toBeUndefined();
		}
		for (const storeId of secondStoreIds) {
			expect(getActivePinia()?.state.value[storeId]).toBeDefined();
		}
		expect(wrapper.get('[data-test-id="store-probe"]').text()).toBe('200');
	});

	it('does not overwrite or dispose editor document and execution data stores', async () => {
		const editorDocumentId = createWorkflowDocumentId(WORKFLOW_ID);
		const editorDocumentStore = useWorkflowDocumentStore(editorDocumentId);
		editorDocumentStore.setName('Unsaved editor workflow');
		const editorExecution = makeExecution(102);
		const editorExecutionDataId = createExecutionDataId(EXECUTION_ID);
		useExecutionDataStore(editorExecutionDataId).setExecution(editorExecution);
		useWorkflowExecutionStateStore(editorDocumentId).setDisplayedExecutionId(editorExecutionDataId);

		const wrapper = mount(SingleHostHarness, { props: { execution: makeExecution(200) } });
		await flushPromises();
		expect(wrapper.get('[data-test-id="store-probe"]').text()).toBe('200');

		wrapper.unmount();
		await flushPromises();

		expect(editorDocumentStore.name).toBe('Unsaved editor workflow');
		const editorExecutionStateStore = useWorkflowExecutionStateStore(editorDocumentId);
		expect(editorExecutionStateStore.displayedExecutionId).toBe(editorExecutionDataId);
		expect(editorExecutionStateStore.activeExecution?.id).toBe(editorExecution.id);
		expect(
			useExecutionDataStore(editorExecutionDataId).execution?.data?.resultData.runData[
				'HTTP Request'
			]?.[0]?.data?.main?.[0]?.[0]?.json,
		).toEqual({ status: 102 });
	});

	it('replaces an execution by unmounting and disposing the previous private scope', async () => {
		const Harness = defineComponent({
			components: { StandaloneRunDataHost, StoreProbe },
			setup() {
				const execution = ref(makeExecution(200));
				return {
					execution,
					replace: () => {
						execution.value = makeExecution(201, 'execution-2');
					},
				};
			},
			template: `
				<button data-test-id="replace" @click="replace" />
				<StandaloneRunDataHost :execution="execution"><StoreProbe /></StandaloneRunDataHost>
			`,
		});
		const wrapper = mount(Harness);
		await flushPromises();
		const previousProbe = wrapper.get('[data-test-id="store-probe"]');
		const previousDocumentId = previousProbe.attributes('data-document-id');
		const previousStoreIds = ownedStoreIds(previousProbe);

		await wrapper.get('[data-test-id="replace"]').trigger('click');
		await flushPromises();

		const nextProbe = wrapper.get('[data-test-id="store-probe"]');
		expect(nextProbe.text()).toBe('201');
		expect(nextProbe.attributes('data-document-id')).not.toBe(previousDocumentId);
		for (const storeId of previousStoreIds) {
			expect(getActivePinia()?.state.value[storeId]).toBeUndefined();
		}
	});

	it('does not create stores when unmounted while node types are still loading', async () => {
		let resolveNodeTypes: () => void = () => {};
		loadNodeTypesIfNotLoaded.mockReturnValueOnce(
			new Promise<void>((resolve) => {
				resolveNodeTypes = resolve;
			}),
		);
		const wrapper = mount(SingleHostHarness, { props: { execution: makeExecution() } });
		await nextTick();
		expect(loadNodeTypesIfNotLoaded).toHaveBeenCalledOnce();

		wrapper.unmount();
		resolveNodeTypes();
		await flushPromises();

		expect(standaloneStoreIds()).toEqual([]);
	});

	it('emits a setup error without creating stores when node types fail to load', async () => {
		const setupError = new Error('node types unavailable');
		loadNodeTypesIfNotLoaded.mockRejectedValueOnce(setupError);
		const wrapper = mount(SingleHostHarness, { props: { execution: makeExecution() } });

		await flushPromises();

		expect(wrapper.emitted('setupError')).toEqual([[setupError]]);
		expect(standaloneStoreIds()).toEqual([]);
	});

	it('disposes partially installed stores and recovers after setup throws', async () => {
		normalizeWorkflowData.mockImplementationOnce(() => {
			throw new Error('invalid workflow data');
		});
		const wrapper = mount(SingleHostHarness, { props: { execution: makeExecution() } });

		await flushPromises();

		expect(wrapper.emitted('setupError')).toHaveLength(1);
		expect(standaloneStoreIds()).toEqual([]);

		await wrapper.setProps({ execution: makeExecution(201, 'execution-2') });
		await flushPromises();

		expect(wrapper.get('[data-test-id="store-probe"]').text()).toBe('201');
		expect(standaloneStoreIds()).toHaveLength(4);
	});
});
