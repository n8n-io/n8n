import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { computed, ref, toRaw, watch } from 'vue';
import type { Ref } from 'vue';

import type { UiSlotRef } from '../../core/document';
import {
	ancestorsOf,
	createEmptyDocument,
	createNode,
	findNode,
	insertRelativeTo,
	moveWithinRegion,
	normaliseNode,
	regionsOf,
	removeNode,
} from '../../core/document';
import { findPagedNode } from '../../core/pages';
import type { UiNode, UiRegion } from '../../core/types';
import { KIT, getComponentDef } from '../../kit';

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
	write: (definition: UiNode) => void,
	readOnly: Ref<boolean>,
) {
	const doc = ref<UiNode>(createEmptyDocument());
	const selectedId = ref<string | undefined>();
	/**
	 * The app frame's header, pages or footer, selected as the fixed
	 * pseudo-component it reads as rather than as a node. Mutually exclusive
	 * with `selectedId`: nothing on screen is both at once, and each is cleared
	 * whenever the other is set (see `selectNode` and `selectRegion`).
	 */
	const selectedRegion = ref<{ id: string; region: string } | undefined>();
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

	function regionOf(node: UiNode, name: string): UiRegion | undefined {
		return regionsOf(node).find((region) => region.name === name);
	}

	watch(
		value,
		(incoming) => {
			const next = parse(incoming);

			// What comes back from a `commit` is a new object every time the host
			// stores it, so identity says nothing about whether the document
			// changed. Re-seating it on an equal one would rebuild the whole tree
			// under whatever wrote it — and an inspector field that re-emits as it
			// re-renders would then write again, forever.
			if (isEqual(next, toRaw(doc.value))) return;

			doc.value = next;

			// The document can be replaced from outside, by an undo or by another
			// editor. A selection pointing into the old one leaves the inspector
			// blank with no way to tell why.
			if (selectedId.value && !findNode(doc.value, selectedId.value)) {
				selectedId.value = undefined;
			}

			// Same for a pseudo-selection: the node it named can be gone, or it can
			// no longer declare that region.
			if (selectedRegion.value) {
				const node = findNode(doc.value, selectedRegion.value.id);
				if (!node || !regionOf(node, selectedRegion.value.region)) {
					selectedRegion.value = undefined;
				}
			}
		},
		{ immediate: true },
	);

	// A plain snapshot, not the reactive document: what goes out is stored as a
	// node parameter, and a proxy that keeps mutating underneath it is not that.
	// `cloneDeep` and not `structuredClone`, which throws on the reactive proxy a
	// moved node leaves behind in the tree.
	function commit() {
		write(cloneDeep(toRaw(doc.value)));
	}

	const selected = computed(() =>
		selectedId.value ? findNode(doc.value, selectedId.value) : undefined,
	);

	/** The region a pseudo-selection names, as the icon and label to show it with. */
	const selectedPseudo = computed(() => {
		if (!selectedRegion.value) return undefined;

		const node = findNode(doc.value, selectedRegion.value.id);
		return node ? regionOf(node, selectedRegion.value.region) : undefined;
	});

	/** Selecting a node and selecting a region are mutually exclusive. */
	function selectNode(id: string | undefined) {
		selectedId.value = id;
		selectedRegion.value = undefined;
	}

	function selectRegion(target: { id: string; region: string } | undefined) {
		selectedRegion.value = target;
		selectedId.value = undefined;
	}

	// Belt and suspenders for the one composable (`usePages`) that still writes
	// `selectedId` directly rather than through `selectNode`: a page selected
	// from the pages pane should drop a pseudo-selection the same as one
	// selected anywhere else.
	watch(selectedId, (id) => {
		if (id) selectedRegion.value = undefined;
	});

	function setProp(name: string, propValue: unknown) {
		if (!selected.value || readOnly.value) return;
		// The expression editor re-emits its current value whenever the preview
		// re-resolves, which is not an edit and must not reach the workflow.
		if (isEqual(toRaw(selected.value.props[name]), propValue)) return;

		selected.value.props[name] = propValue;
		commit();
	}

	/** The first region a node offers, undefined for one that takes no children. */
	function firstRegionOf(node: UiNode): string | undefined {
		return regionsOf(node)[0]?.name;
	}

	/**
	 * Where the palette's next component goes, following the rule the panel's
	 * own description states: it goes relative to the current selection.
	 *
	 * A pseudo-selection resolves straight to its own region. A node that takes
	 * children gets its first region; one that does not walks up to the
	 * nearest ancestor that does, the root included, since the root always has
	 * at least one. Nothing selected falls to the frame's pages, if there is a
	 * frame; `insertRelativeTo` falls back to the root's own first region
	 * otherwise, which is the only sensible target a pageless document has.
	 */
	function resolveAddTarget(): UiSlotRef | undefined {
		if (selectedRegion.value) return { ...selectedRegion.value };

		if (selectedId.value) {
			const node = findNode(doc.value, selectedId.value);

			if (node) {
				const ownRegion = firstRegionOf(node);
				if (ownRegion) return { id: node.id, region: ownRegion };

				const ancestors = [...(ancestorsOf(doc.value, node.id) ?? [])].reverse();
				for (const ancestor of ancestors) {
					const region = firstRegionOf(ancestor);
					if (region) return { id: ancestor.id, region };
				}

				return undefined;
			}
		}

		const frame = findPagedNode(doc.value);
		const pagedRegion = frame ? getComponentDef(frame.type)?.pagedRegion : undefined;
		return frame && pagedRegion ? { id: frame.id, region: pagedRegion } : undefined;
	}

	function addComponent(type: string) {
		if (readOnly.value) return;

		const node = createNode(type, doc.value);

		insertRelativeTo(doc.value, resolveAddTarget(), node);

		selectNode(node.id);
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
		selectNode(id);
		deleteSelected();
	}

	function moveNode(id: string, delta: number) {
		if (readOnly.value || !moveWithinRegion(doc.value, id, delta)) return;

		// Follow the node: the buttons sit on the row, and the row has moved.
		selectNode(id);
		commit();
	}

	/** The palette, in sections. A flat list of a dozen is already hard to scan. */
	const palette = computed(() => {
		const sections = new Map<string, typeof KIT>();

		for (const def of KIT) {
			// Pages and the frame that holds them come from the Pages pane, which is
			// the only place their ordering, paths and default make sense together.
			if (def.type === 'page' || def.type === 'frame') continue;

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
		selectedRegion,
		hoveredId,
		selected,
		selectedPseudo,
		inspectorProps,
		palette,
		paletteCount,
		componentCount,
		summary,
		commit,
		setProp,
		selectNode,
		selectRegion,
		addComponent,
		deleteSelected,
		deleteNode,
		moveNode,
	};
}
