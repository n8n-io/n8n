import { INodeCreateElement, ActionCreateElement, SubcategorizedNodeTypes } from '@/Interface';
import { CORE_NODES_CATEGORY } from '@/constants';
import { v4 as uuidv4 } from 'uuid';
import { INodeTypeDescription } from 'n8n-workflow';

export function transformNodeType(
	node: INodeTypeDescription,
	subcategory?: string,
	type = 'node',
): INodeCreateElement {
	return {
		uuid: uuidv4(),
		key: node.name,
		subcategory: subcategory ?? node.codex?.subcategories?.[CORE_NODES_CATEGORY]?.[0] ?? '*',
		properties: node,
		type,
	};
}

export function subcategorizeItems(items: INodeTypeDescription[]) {
	return items.reduce((acc: SubcategorizedNodeTypes, item) => {
		// Only Core Nodes subcategories are valid, others are uncategorized
		const isCoreNodesCategory = item.codex?.categories?.includes(CORE_NODES_CATEGORY);
		const subcategories = isCoreNodesCategory
			? item?.codex?.subcategories?.[CORE_NODES_CATEGORY] ?? []
			: ['*'];

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
		const displayNameA = a.properties.displayName.toLowerCase();
		const displayNameB = b.properties.displayName.toLowerCase();

		return displayNameA.localeCompare(displayNameB, undefined, { sensitivity: 'base' });
	});
}
