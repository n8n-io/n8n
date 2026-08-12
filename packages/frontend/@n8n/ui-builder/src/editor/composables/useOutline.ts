import { computed } from 'vue';
import type { Ref } from 'vue';

import { childrenIn, regionsOf } from '../../core/document';
import { getComponentDef } from '../../kit';
import type { UiNode } from '../../core/types';

/**
 * A row of the outline: either a node or the heading of one of its regions.
 * Flat rather than a recursive component, because depth is only a padding and
 * one array is easier to reason about than a component that renders itself.
 */
export type OutlineRow = { key: string; depth: number; label: string } & (
	| { kind: 'region' }
	| { kind: 'node'; id: string; isRoot: boolean; canMoveUp: boolean; canMoveDown: boolean }
);

function outlineLabel(node: UiNode): string {
	return getComponentDef(node.type)?.label ?? node.type;
}

/** `among` is the node's place in its region, and absent for the root. */
function flatten(
	node: UiNode,
	depth: number,
	rows: OutlineRow[],
	among?: { index: number; count: number },
) {
	rows.push({
		kind: 'node',
		key: node.id,
		depth,
		label: outlineLabel(node),
		id: node.id,
		isRoot: !among,
		canMoveUp: among ? among.index > 0 : false,
		canMoveDown: among ? among.index < among.count - 1 : false,
	});

	// A document written by hand can hold children in a region its component
	// never declared, and an outline that hid them would be lying about the tree.
	const declared = regionsOf(node);
	const undeclared = Object.keys(node.tree)
		.filter((name) => !declared.some((region) => region.name === name))
		.filter((name) => childrenIn(node, name).length > 0)
		.map((name) => ({ name, label: name }));

	const regions = [...declared, ...undeclared];

	// One drop point needs no heading: every stack would otherwise gain a
	// "Children" row saying what the indentation already says.
	const headings = regions.length > 1;

	for (const region of regions) {
		const children = childrenIn(node, region.name);
		if (children.length === 0) continue;

		if (headings) {
			rows.push({
				kind: 'region',
				key: `${node.id}/${region.name}`,
				depth: depth + 1,
				label: region.label,
			});
		}

		children.forEach((child, index) =>
			flatten(child, depth + (headings ? 2 : 1), rows, { index, count: children.length }),
		);
	}
}

export function useOutline(doc: Ref<UiNode>) {
	const outlineRows = computed(() => {
		const rows: OutlineRow[] = [];
		flatten(doc.value, 0, rows);
		return rows;
	});

	function indentOf(depth: number) {
		return { paddingLeft: `calc(var(--spacing--2xs) + ${depth} * var(--spacing--sm))` };
	}

	return { outlineRows, indentOf };
}
