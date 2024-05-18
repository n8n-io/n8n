import type {
	NodeCreateElement,
	ActionCreateElement,
	SubcategorizedNodeTypes,
	SimplifiedNodeType,
	INodeCreateElement,
	SectionCreateElement,
} from '@/Interface';
import { AI_SUBCATEGORY, CORE_NODES_CATEGORY, DEFAULT_SUBCATEGORY } from '@/constants';
import { v4 as uuidv4 } from 'uuid';

import { sublimeSearch } from '@/utils/sortUtils';
import { i18n } from '@/plugins/i18n';
import type { NodeViewItemSection } from './viewsData';

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
		if (a.type !== 'node' || b.type !== 'node') return 0;
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

export function flattenCreateElements(items: INodeCreateElement[]): INodeCreateElement[] {
	return items.map((item) => (item.type === 'section' ? item.children : item)).flat();
}

export function groupItemsInSections(
	items: INodeCreateElement[],
	sections: string[] | NodeViewItemSection[],
): INodeCreateElement[] {
	const filteredSections = sections.filter(
		(section): section is NodeViewItemSection => typeof section === 'object',
	);

	const itemsBySection = items.reduce((acc: Record<string, INodeCreateElement[]>, item) => {
		const section = filteredSections.find((s) => s.items.includes(item.key));
		const key = section?.key ?? 'other';
		acc[key] = [...(acc[key] ?? []), item];
		return acc;
	}, {});

	const result: SectionCreateElement[] = filteredSections
		.map(
			(section): SectionCreateElement => ({
				type: 'section',
				key: section.key,
				title: section.title,
				children: sortNodeCreateElements(itemsBySection[section.key] ?? []),
			}),
		)
		.concat({
			type: 'section',
			key: 'other',
			title: i18n.baseText('nodeCreator.sectionNames.other'),
			children: sortNodeCreateElements(itemsBySection.other ?? []),
		})
		.filter((section) => section.children.length > 0);

	if (result.length <= 1) {
		return items;
	}

	return result;
}
