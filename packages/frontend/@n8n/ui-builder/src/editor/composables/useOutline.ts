import { computed, ref } from 'vue';
import type { Ref } from 'vue';

import { childrenIn, regionsOf } from '../../core/document';
import type { UiNode } from '../../core/types';
import { getComponentDef } from '../../kit';

/**
 * A row of the outline: a node, the heading of one of its regions, or one of
 * that region's own fixed pseudo-components (each region of a component that
 * declares more than one, such as the app frame's header and footer, or a
 * card's header, body and footer). Flat rather than a recursive component,
 * because depth is only a padding and one array is easier to reason about than
 * a component that renders itself.
 *
 * A component's `pagedRegion` (the app frame's "Pages" region) never gets a
 * pseudo row of its own, unlike its sibling regions: it structurally holds at
 * most one visible child (the active page — see `flatten`), so a wrapper row
 * naming the slot plus a node row naming the page inside it would be two rows
 * for one thing. The page renders directly where the pseudo row would have
 * sat, as an ordinary sibling of the other regions' pseudo rows.
 *
 * A pseudo row is a full peer of a node row, not a lesser variant of one: it
 * carries its own `hasChildren`/`collapsed` because a region's contents are its
 * own disclosure to open and shut, the same as any node's. Only a region
 * heading (`kind: 'region'`) has none of its own: its disclosure is its owning
 * node's, since it never has children of its own to hide independently (see
 * `flatten`).
 */
export type OutlineRow = { key: string; depth: number; label: string; icon?: string } & (
	| { kind: 'region' }
	| {
			kind: 'pseudo';
			nodeId: string;
			region: string;
			hasChildren: boolean;
			collapsed: boolean;
	  }
	| {
			kind: 'node';
			id: string;
			isRoot: boolean;
			canMoveUp: boolean;
			canMoveDown: boolean;
			hasChildren: boolean;
			collapsed: boolean;
	  }
);

function outlineLabel(node: UiNode): string {
	return getComponentDef(node.type)?.label ?? node.type;
}

/**
 * `activePageId` is the page the canvas is currently showing: a frame's paged
 * region ("Pages") holds every page in the document, but only that one is on
 * screen, and the outline should not lay out every other page's subtree
 * alongside it to match. That region also never gets a pseudo row (see
 * `OutlineRow`): the active page renders directly at the depth the pseudo row
 * would have occupied. `among` is the node's place in its region, and absent
 * for the root.
 */
function flatten(
	node: UiNode,
	depth: number,
	rows: OutlineRow[],
	collapsed: Set<string>,
	activePageId: string | undefined,
	among?: { index: number; count: number },
) {
	// A document written by hand can hold children in a region its component
	// never declared, and an outline that hid them would be lying about the tree.
	const declared = regionsOf(node);
	const undeclared = Object.keys(node.tree)
		.filter((name) => !declared.some((region) => region.name === name))
		.filter((name) => childrenIn(node, name).length > 0)
		.map((name) => ({ name, label: name }));

	// A component with more than one region (the app frame's header and
	// footer; a card's header, body and footer) is a component whose regions
	// are worth telling apart on their own: each shows up as a fixed
	// pseudo-component, whether or not it holds anything yet, because it has to
	// be there to select and add to. A component with exactly one region needs
	// none of that: selecting the node already means selecting its one slot
	// (see `resolveAddTarget`), so a pseudo row under it would only repeat what
	// the node row already says. Undeclared regions never qualify: they are
	// leftovers from a hand-edited document, not a drop point the component
	// itself offers, so they only earn a plain heading once they hold something.
	const pseudoRegions = declared.length > 1 ? declared : [];
	const plainRegions = [...(declared.length > 1 ? [] : declared), ...undeclared].filter(
		(region) => childrenIn(node, region.name).length > 0,
	);

	const isCollapsed = collapsed.has(node.id);

	rows.push({
		kind: 'node',
		key: node.id,
		depth,
		label: outlineLabel(node),
		icon: getComponentDef(node.type)?.icon,
		id: node.id,
		isRoot: !among,
		canMoveUp: among ? among.index > 0 : false,
		canMoveDown: among ? among.index < among.count - 1 : false,
		hasChildren: pseudoRegions.length > 0 || plainRegions.length > 0,
		collapsed: isCollapsed,
	});

	// Collapsing hides every descendant, region headings and pseudo-components
	// included: neither has a disclosure of its own, so there would be no way
	// to reveal them again if they survived while the rows below disappeared.
	if (isCollapsed) return;

	// Always shown, whether or not it holds anything yet: it is what you select
	// to add the first thing to it. A region's own icon wins when the def set
	// one (the frame's header/pages/footer); otherwise the owning component's
	// icon keeps the row looking like a component rather than a bare heading,
	// even when the def (a plain Card, say) never bothered to pick one per slot.
	for (const region of pseudoRegions) {
		const pseudoKey = `${node.id}/${region.name}`;

		// A frame's paged region holds every page, of which the canvas ever shows
		// one; the outline follows suit rather than laying out every other page's
		// subtree at once. Which page is active is the editor's own state, not the
		// document's, so a document with no active page (nothing being edited yet)
		// falls back to showing all of them rather than none.
		const isPagedRegion = getComponentDef(node.type)?.pagedRegion === region.name;
		const allChildren = childrenIn(node, region.name);
		const children =
			isPagedRegion && activePageId
				? allChildren.filter((child) => child.id === activePageId)
				: allChildren;

		// The paged region always resolves to at most one visible child (the
		// active page), so a pseudo row naming the slot plus a node row naming
		// the page underneath it would just be two rows saying the same thing at
		// two depths. No pseudo row is pushed for it at all: the active page (or,
		// with no active page resolved, every page, the same fallback as before)
		// renders directly at the depth the pseudo row would have occupied, as an
		// ordinary sibling of the other regions' pseudo rows.
		if (isPagedRegion) {
			children.forEach((child, index) =>
				flatten(child, depth + 1, rows, collapsed, activePageId, {
					index,
					count: children.length,
				}),
			);
			continue;
		}

		const pseudoCollapsed = collapsed.has(pseudoKey);

		rows.push({
			kind: 'pseudo',
			key: pseudoKey,
			depth: depth + 1,
			label: region.label,
			icon: region.icon ?? getComponentDef(node.type)?.icon,
			nodeId: node.id,
			region: region.name,
			hasChildren: children.length > 0,
			collapsed: pseudoCollapsed,
		});

		// Same rule as a node's own collapse: hide the region's contents, not the
		// row that discloses them, so there is still something to click to bring
		// them back.
		if (pseudoCollapsed) continue;

		children.forEach((child, index) =>
			flatten(child, depth + 2, rows, collapsed, activePageId, { index, count: children.length }),
		);
	}

	// One drop point needs no heading: every stack would otherwise gain a
	// "Children" row saying what the indentation already says.
	const headings = plainRegions.length > 1;

	for (const region of plainRegions) {
		const children = childrenIn(node, region.name);

		if (headings) {
			rows.push({
				kind: 'region',
				key: `${node.id}/${region.name}`,
				depth: depth + 1,
				label: region.label,
			});
		}

		children.forEach((child, index) =>
			flatten(child, depth + (headings ? 2 : 1), rows, collapsed, activePageId, {
				index,
				count: children.length,
			}),
		);
	}
}

/**
 * `activePageId` names the page the canvas is showing (the editor's
 * `editingPage`, not anything the document itself stores) so the frame's
 * paged region lays out only that one page's subtree, directly in place of a
 * pseudo row (see `flatten`). Undefined falls back to showing every page,
 * matching the outline's behaviour before there was a notion of an active
 * page.
 */
export function useOutline(doc: Ref<UiNode>, activePageId?: Ref<string | undefined>) {
	// Rows currently collapsed, keyed by their own `key`: a node's id, or a
	// pseudo-component's `nodeId/region`. One set for both, since a node and a
	// pseudo-component collapse the same way: hide what is under them, leave
	// the row that discloses them. Absence means expanded, so a document with
	// nothing collapsed renders exactly as it did before this existed.
	const collapsedIds = ref(new Set<string>());

	const outlineRows = computed(() => {
		const rows: OutlineRow[] = [];
		flatten(doc.value, 0, rows, collapsedIds.value, activePageId?.value);
		return rows;
	});

	function toggleCollapsed(id: string) {
		const next = new Set(collapsedIds.value);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		collapsedIds.value = next;
	}

	function indentOf(depth: number) {
		return { paddingLeft: `calc(var(--spacing--2xs) + ${depth} * var(--spacing--sm))` };
	}

	return { outlineRows, indentOf, toggleCollapsed };
}
