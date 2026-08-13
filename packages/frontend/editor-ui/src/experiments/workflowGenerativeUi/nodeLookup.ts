import type { INode } from 'n8n-workflow';
import { computed, inject, provide, unref, type InjectionKey, type MaybeRef } from 'vue';

export const GenerativeUiNodesKey: InjectionKey<MaybeRef<INode[]>> = Symbol('generativeUiNodes');
export const GenerativeUiLookOnlyKey: InjectionKey<MaybeRef<boolean>> =
	Symbol('generativeUiLookOnly');

export function provideGenerativeUiNodes(nodes: MaybeRef<INode[]>) {
	provide(GenerativeUiNodesKey, nodes);
}

export function provideGenerativeUiLookOnly(lookOnly: MaybeRef<boolean>) {
	provide(GenerativeUiLookOnlyKey, lookOnly);
}

export function useGenerativeUiLookOnly() {
	const lookOnly = inject(GenerativeUiLookOnlyKey, false);
	return computed(() => unref(lookOnly));
}

export function useGenerativeUiNode(nodeId: () => string | null | undefined) {
	const nodes = inject(GenerativeUiNodesKey, []);
	return computed(() => unref(nodes).find((node) => node.id === nodeId()) ?? null);
}
