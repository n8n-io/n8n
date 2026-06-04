import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useLocalStorage } from '@vueuse/core';

export interface NodeCardOverride {
	title?: string;
	description?: string;
}

const STORAGE_KEY = 'n8n.prototype.nodeCards';

// Demo seed: the "Check for New Calls" trigger in workflow MOrmPdqXesdEYqkB.
// Used as the useLocalStorage default, so it only seeds when the key is absent
// (a fresh browser) and never overwrites edits.
const SEED: Record<string, NodeCardOverride> = {
	'80b49f1c-9cb9-44e0-b744-1f3d43525df7': {
		title: 'Check for New Calls',
		description: 'Runs every minute to check for new call recordings.',
	},
};

// Module-level singleton so every trigger card and edit share one reactive map.
// PROTOTYPE: edits live in localStorage only — they do NOT rename the real node
// or touch the workflow (non-destructive, no connection-rename cascades).
const overrides = useLocalStorage<Record<string, NodeCardOverride>>(STORAGE_KEY, SEED);

export function usePrototypeNodeCard(
	nodeId: MaybeRefOrGetter<string>,
	nodeName: MaybeRefOrGetter<string>,
) {
	const entry = computed<NodeCardOverride>(() => overrides.value[toValue(nodeId)] ?? {});

	// Title falls back to the node's real name when no override is set.
	const title = computed(() => entry.value.title ?? toValue(nodeName));
	const description = computed(() => entry.value.description ?? '');

	function update(patch: NodeCardOverride) {
		const id = toValue(nodeId);
		// Reassign the top-level object so useLocalStorage persists the change.
		overrides.value = {
			...overrides.value,
			[id]: { ...overrides.value[id], ...patch },
		};
	}

	function setTitle(value: string) {
		update({ title: value });
	}

	function setDescription(value: string) {
		update({ description: value });
	}

	return { title, description, setTitle, setDescription };
}
