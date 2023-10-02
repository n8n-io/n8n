import type {
	NodeCreateElement,
	ActionCreateElement,
	SubcategorizedNodeTypes,
	SimplifiedNodeType,
	INodeCreateElement,
} from '@/Interface';
import { AI_SUBCATEGORY, CORE_NODES_CATEGORY, DEFAULT_SUBCATEGORY } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import { sublimeSearch } from '@/utils';

export function transformNodeType(
	node: SimplifiedNodeType,
	subcategory?: string,
	type: 'node' | 'action' = 'node',
): NodeCreateElement | ActionCreateElement {
	const createElement = {
		uuid: uuidv4(),
		key: node.name,
		subcategory:
			subcategory ?? node.codex?.subcategories?.[CORE_NODES_CATEGORY]?.[0] ?? DEFAULT_SUBCATEGORY,
		properties: {
			...node,
		},
		type,
	};

	return type === 'action'
		? (createElement as ActionCreateElement)
		: (createElement as NodeCreateElement);
}

export function subcategorizeItems(items: SimplifiedNodeType[]) {
	const WHITE_LISTED_SUBCATEGORIES = [CORE_NODES_CATEGORY, AI_SUBCATEGORY];
	return items.reduce((acc: SubcategorizedNodeTypes, item) => {
		// Only some subcategories are allowed
		let subcategories: string[] = [DEFAULT_SUBCATEGORY];

		WHITE_LISTED_SUBCATEGORIES.forEach((category) => {
			if (item.codex?.categories?.includes(category)) {
				subcategories = item.codex?.subcategories?.[category] ?? [];
			}
		});

		subcategories.forEach((subcategory: string) => {
			if (!acc[subcategory]) {
				acc[subcategory] = [];
			}
			acc[subcategory].push(transformNodeType(item, subcategory));
		});

		return acc;
	}, {});
}

export function sortNodeCreateElements(nodes: INodeCreateElement[]) {
	return nodes.sort((a, b) => {
		if (a.type !== 'node' || b.type !== 'node') return -1;
		const displayNameA = a.properties?.displayName?.toLowerCase() || a.key;
		const displayNameB = b.properties?.displayName?.toLowerCase() || b.key;

		return displayNameA.localeCompare(displayNameB, undefined, { sensitivity: 'base' });
	});
}

export function searchNodes(searchFilter: string, items: INodeCreateElement[]) {
	// In order to support the old search we need to remove the 'trigger' part
	const trimmedFilter = searchFilter.toLowerCase().replace('trigger', '').trimEnd();
	const result = (
		sublimeSearch<INodeCreateElement>(trimmedFilter, items, [
			{ key: 'properties.displayName', weight: 1.3 },
			{ key: 'properties.codex.alias', weight: 1 },
		]) || []
	).map(({ item }) => item);

	return result;
}
