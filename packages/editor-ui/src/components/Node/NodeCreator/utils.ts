import { INodeCreateElement, SubcategorizedNodeTypes } from '@/Interface';
import { CORE_NODES_CATEGORY } from '@/constants';
import { INodeTypeDescription } from 'n8n-workflow';

export function transformNodeType(
	node: INodeTypeDescription,
	subcategory?: string,
): INodeCreateElement {
	return {
		key: node.name,
		properties: node,
		subcategory: subcategory ?? node.codex?.subcategories?.[CORE_NODES_CATEGORY]?.[0] ?? '*',
		type: 'node',
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
