import type { INode } from 'n8n-workflow';
import { computed, inject, provide, unref, type InjectionKey, type MaybeRef } from 'vue';

export const GenerativeUiNodesKey: InjectionKey<MaybeRef<INode[]>> = Symbol('generativeUiNodes');

export function provideGenerativeUiNodes(nodes: MaybeRef<INode[]>) {
	provide(GenerativeUiNodesKey, nodes);
}

export function useGenerativeUiNode(nodeId: () => string | null | undefined) {
	const nodes = inject(GenerativeUiNodesKey, []);
	return computed(() => unref(nodes).find((node) => node.id === nodeId()) ?? null);
}
