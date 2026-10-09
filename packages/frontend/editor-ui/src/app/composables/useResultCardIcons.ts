import { computed, onMounted, type MaybeRefOrGetter, toValue } from 'vue';
import type { ResultCard } from '@n8n/api-types';
import type { ResultCardIcon } from '@n8n/design-system';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';

/** Node types a card names as the data's origin (e.g. the HTTP nodes a workflow called). */
export function resultCardNodeTypes(card: Pick<ResultCard, 'nodeTypes' | 'nodeType'>): string[] {
	return card.nodeTypes?.length ? card.nodeTypes : card.nodeType ? [card.nodeType] : [];
}

/**
 * Resolves the provenance icons of result cards from the node-types store,
 * loading the node types on mount when any is missing. Returns one icon list
 * per card, in the same order as the input.
 */
export function useResultCardIcons(cards: MaybeRefOrGetter<ResultCard[]>) {
	const nodeTypesStore = useNodeTypesStore();

	const allNodeTypes = computed(() => [...new Set(toValue(cards).flatMap(resultCardNodeTypes))]);

	onMounted(async () => {
		if (allNodeTypes.value.some((type) => !nodeTypesStore.getNodeType(type))) {
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
		}
	});

	function iconsFor(card: ResultCard): ResultCardIcon[] {
		return resultCardNodeTypes(card).flatMap((type): ResultCardIcon[] => {
			const description = nodeTypesStore.getNodeType(type);
			const source = getNodeIconSource(description ?? type, null, null);
			if (!source) return [];
			return [
				source.type === 'file'
					? { type: 'file', src: source.src }
					: { type: 'icon', name: source.name, color: source.color },
			];
		});
	}

	const iconsByCard = computed(() => toValue(cards).map(iconsFor));

	return { iconsByCard };
}
