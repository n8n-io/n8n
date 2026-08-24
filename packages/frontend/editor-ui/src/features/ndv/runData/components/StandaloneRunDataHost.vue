<script setup lang="ts">
import { ChatSymbol } from '@n8n/chat/constants';
import type { Chat } from '@n8n/chat/types';
import { deepCopy, type IRunExecutionData } from 'n8n-workflow';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onUnmounted,
	provide,
	shallowRef,
	useId,
	watch,
} from 'vue';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowNormalization } from '@/app/composables/useWorkflowNormalization';
import {
	createExecutionDataId,
	disposeExecutionDataStore,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import type { WorkflowObjectAccessors } from '@/app/types/workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import { StandaloneRunDataHostKey } from '@/features/ndv/runData/standaloneRunData';

const props = defineProps<{
	execution: IExecutionResponse | null;
}>();

const emit = defineEmits<{
	setupError: [error: unknown];
}>();

defineSlots<{
	default(props: {
		workflowObject: WorkflowObjectAccessors;
		workflowExecution: IRunExecutionData | undefined;
	}): unknown;
}>();

const nodeTypesStore = useNodeTypesStore();
const { normalizeWorkflowData } = useWorkflowNormalization();
const hostId = encodeURIComponent(useId());
const documentStore = shallowRef<WorkflowDocumentStore | null>(null);
const workflowObject = shallowRef<WorkflowObjectAccessors | null>(null);
const workflowExecution = shallowRef<IRunExecutionData>();
const ready = computed(() => documentStore.value !== null && workflowObject.value !== null);

provide(
	WorkflowIdKey,
	computed(() => documentStore.value?.workflowId ?? props.execution?.workflowData.id ?? ''),
);
provide(WorkflowDocumentStoreKey, documentStore);
provide(ChatSymbol, null as unknown as Chat);
provide(StandaloneRunDataHostKey, true);

type OwnedDocumentStore = ReturnType<typeof useWorkflowDocumentStore>;
type OwnedExecutionStateStore = ReturnType<typeof useWorkflowExecutionStateStore>;
type OwnedExecutionDataStore = ReturnType<typeof useExecutionDataStore>;
type OwnedNDVStore = ReturnType<typeof useNDVStore>;

interface OwnedScope {
	documentStore: OwnedDocumentStore;
	executionStateStore: OwnedExecutionStateStore;
	executionDataStore: OwnedExecutionDataStore;
	ndvStore: OwnedNDVStore;
}

let ownedScope: OwnedScope | null = null;
let generation = 0;
let latestSetupRequest = 0;
let unmounted = false;

function disposeOwnedScope(): void {
	if (!ownedScope) return;

	disposeNDVStore(ownedScope.ndvStore);
	disposeWorkflowExecutionStateStore(ownedScope.executionStateStore);
	disposeExecutionDataStore(ownedScope.executionDataStore);
	disposeWorkflowDocumentStore(ownedScope.documentStore);
	ownedScope = null;
	documentStore.value = null;
	workflowObject.value = null;
	workflowExecution.value = undefined;
}

function installExecution(execution: IExecutionResponse): void {
	const documentVersion = `standalone-run-data/${hostId}/${++generation}`;
	const documentId = createWorkflowDocumentId(execution.workflowData.id, documentVersion);
	const scopedDocumentStore = useWorkflowDocumentStore(documentId);
	const scopedExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	const scopedExecutionDataStore = useExecutionDataStore(
		createExecutionDataId(`${documentId}/execution`),
	);
	const scopedNDVStore = useNDVStore(documentId);
	ownedScope = {
		documentStore: scopedDocumentStore,
		executionStateStore: scopedExecutionStateStore,
		executionDataStore: scopedExecutionDataStore,
		ndvStore: scopedNDVStore,
	};
	const { nodes, connections } = normalizeWorkflowData(execution.workflowData);

	scopedDocumentStore.hydrate({
		...execution.workflowData,
		nodes,
		connections,
		versionId: documentVersion,
	});

	const executionSnapshot = deepCopy(execution);
	scopedExecutionDataStore.setExecution(executionSnapshot);
	scopedExecutionStateStore.setDisplayedExecutionId(scopedExecutionDataStore.executionId);

	documentStore.value = scopedDocumentStore;
	workflowObject.value = scopedDocumentStore.getWorkflowObjectAccessorSnapshot();
	workflowExecution.value = executionSnapshot.data;
}

async function replaceExecution(execution: IExecutionResponse | null): Promise<void> {
	const setupRequest = ++latestSetupRequest;
	documentStore.value = null;
	workflowObject.value = null;
	workflowExecution.value = undefined;

	// Let descendants unmount before releasing the stores they injected.
	await nextTick();
	disposeOwnedScope();
	if (!execution || unmounted || setupRequest !== latestSetupRequest) return;

	try {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		if (unmounted || setupRequest !== latestSetupRequest) return;

		installExecution(execution);
	} catch (error) {
		if (unmounted || setupRequest !== latestSetupRequest) return;
		disposeOwnedScope();
		emit('setupError', error);
	}
}

watch(
	() => props.execution,
	(execution) => replaceExecution(execution),
	{ immediate: true },
);

onBeforeUnmount(() => {
	unmounted = true;
	latestSetupRequest += 1;
	documentStore.value = null;
	workflowObject.value = null;
	workflowExecution.value = undefined;
});

onUnmounted(() => {
	disposeOwnedScope();
});
</script>

<template>
	<div v-if="ready && workflowObject" :class="$style.root">
		<slot :workflow-object="workflowObject" :workflow-execution="workflowExecution" />
	</div>
</template>

<style module>
.root {
	display: contents;
}
</style>
