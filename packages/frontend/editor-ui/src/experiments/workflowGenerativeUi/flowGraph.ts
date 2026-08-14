import { computed, inject, provide, unref, type InjectionKey, type MaybeRef } from 'vue';
import type { WorkflowUiConnection } from './workflowPayload';

export const GenerativeUiFlowGraphKey: InjectionKey<MaybeRef<WorkflowUiConnection[]>> =
	Symbol('generativeUiFlowGraph');

export function provideGenerativeUiFlowGraph(connections: MaybeRef<WorkflowUiConnection[]>) {
	provide(GenerativeUiFlowGraphKey, connections);
}

export function useGenerativeUiFlowGraph() {
	const connections = inject(GenerativeUiFlowGraphKey, []);
	return computed(() => unref(connections));
}
