import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';

import {
	createEmptyDocument,
	createNode,
	findNode,
	insertRelativeTo,
	moveWithinRegion,
	normaliseNode,
	regionsOf,
	removeNode,
} from '../../core/document';
import { KIT, getComponentDef } from '../../kit';
import type { UiNode } from '../../core/types';

/**
 * The document being edited, and everything that changes it.
 *
 * There is no editor-side model of the tree: the document is the model, every
 * edit mutates it and writes the whole thing back out, and the panel re-parses
 * what comes back. Selection and hover are the only state the document does not
 * hold, because they are about what is being looked at rather than what is
 * there.
 */
export function useUiDocument(
	value: Ref<string | object | undefined>,
	write: (json: string) => void,
	readOnly: Ref<boolean>,
) {
	const doc = ref<UiNode>(createEmptyDocument());
	const selectedId = ref<string | undefined>();
	const hoveredId = ref<string | undefined>();

	function parse(incoming: string | object | undefined): UiNode {
		// Every path runs through normaliseNode: a document saved before regions
		// existed stores each node's children as one bare array.
		if (incoming && typeof incoming === 'object') return normaliseNode(incoming as UiNode);

		if (typeof incoming === 'string' && incoming.trim()) {
			try {
				return normaliseNode(JSON.parse(incoming) as UiNode);
			} catch {
				// Keep the last good document. A half-typed one arrives here on every
				// keystroke if the parameter is being edited as raw JSON, and blanking
				// the canvas each time would lose the author's place.
				return doc.value;
			}
		}

		return createEmptyDocument();
	}

	watch(
		value,
		(incoming) => {
			doc.value = parse(incoming);

			// The document can be replaced from outside, by an undo or by another
			// editor. A selection pointing into the old one leaves the inspector
			// blank with no way to tell why.
			if (selectedId.value && !findNode(doc.value, selectedId.value)) {
				selectedId.value = undefined;
			}
		},
		{ immediate: true },
	);

	function commit() {
		write(JSON.stringify(doc.value, null, 2));
	}

	const selected = computed(() =>
		selectedId.value ? findNode(doc.value, selectedId.value) : undefined,
	);

	const selectedRegions = computed(() => (selected.value ? regionsOf(selected.value) : []));

	/**
	 * Which drop point of the selection the palette adds to. Only meaningful for a
	 * component with more than one; the inspector shows it in that case.
	 *
	 * Keyed on the id, not the node. Every commit re-parses the document into
	 * fresh objects, so watching the node would reset this on each edit and
	 * quietly undo a choice of Footer the moment anything else was typed.
	 */
	const targetRegion = ref<string>('');

	watch(selectedId, () => {
		targetRegion.value = selected.value ? (regionsOf(selected.value)[0]?.name ?? '') : '';
	});

	function setProp(name: string, propValue: unknown) {
		if (!selected.value || readOnly.value) return;

		selected.value.props[name] = propValue;
		commit();
	}

	function addComponent(type: string) {
		if (readOnly.value) return;

		const node = createNode(type, doc.value);

		insertRelativeTo(
			doc.value,
			selectedId.value ? { id: selectedId.value, region: targetRegion.value } : undefined,
			node,
		);

		selectedId.value = node.id;
		commit();
	}

	function deleteSelected() {
		if (!selectedId.value || readOnly.value) return;

		if (removeNode(doc.value, selectedId.value)) {
			selectedId.value = undefined;
			commit();
		}
	}

	/** Selecting first means the outline deletes through the one delete path. */
	function deleteNode(id: string) {
		selectedId.value = id;
		deleteSelected();
	}

	function moveNode(id: string, delta: number) {
		if (readOnly.value || !moveWithinRegion(doc.value, id, delta)) return;

		// Follow the node: the buttons sit on the row, and the row has moved.
		selectedId.value = id;
		commit();
	}

	/** The palette, in sections. A flat list of a dozen is already hard to scan. */
	const palette = computed(() => {
		const sections = new Map<string, typeof KIT>();

		for (const def of KIT) {
			// Pages and the shell that holds them come from the Pages pane, which is
			// the only place their ordering, paths and default make sense together.
			if (def.type === 'page' || def.type === 'shell') continue;

			const group = def.group ?? 'Other';
			sections.set(group, [...(sections.get(group) ?? []), def]);
		}

		return [...sections].map(([name, items]) => ({ name, items }));
	});

	const paletteCount = computed(() =>
		palette.value.reduce((total, section) => total + section.items.length, 0),
	);

	function countNodes(node: UiNode): number {
		return Object.values(node.tree)
			.flat()
			.reduce((total, child) => total + countNodes(child), 1);
	}

	const componentCount = computed(() => countNodes(doc.value) - 1);

	// Shown on the closed parameter, so the node says something without opening.
	const summary = computed(() =>
		componentCount.value === 0
			? 'Empty'
			: `${componentCount.value} component${componentCount.value === 1 ? '' : 's'}`,
	);

	const inspectorProps = computed(() =>
		selected.value ? (getComponentDef(selected.value.type)?.props ?? []) : [],
	);

	return {
		doc,
		selectedId,
		hoveredId,
		selected,
		selectedRegions,
		targetRegion,
		inspectorProps,
		palette,
		paletteCount,
		componentCount,
		summary,
		commit,
		setProp,
		addComponent,
		deleteSelected,
		deleteNode,
		moveNode,
	};
}
