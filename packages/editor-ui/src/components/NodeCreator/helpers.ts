import { CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, SUBCATEGORY_DESCRIPTIONS, UNCATEGORIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER, ALL_NODE_FILTER  } from '@/constants';
import { INodeCreateElement, ICategoriesWithNodes, INodeItemProps } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';


export const getCategoriesWithNodes = (nodeTypes: INodeTypeDescription[]): ICategoriesWithNodes => {
	return nodeTypes.reduce(
		(accu: ICategoriesWithNodes, nodeType: INodeTypeDescription) => {
			if (!nodeType.codex || !nodeType.codex.categories) {
				accu[UNCATEGORIZED_CATEGORY][UNCATEGORIZED_SUBCATEGORY].nodes.push({
					type: 'node',
					category: UNCATEGORIZED_CATEGORY,
					key: `${UNCATEGORIZED_CATEGORY}_${nodeType.name}`,
					properties: {
						subcategory: UNCATEGORIZED_SUBCATEGORY,
						nodeType,
					},
					includedByTrigger: nodeType.group.includes('trigger'),
					includedByRegular: !nodeType.group.includes('trigger'),
				});
				return accu;
			}
			nodeType.codex.categories.forEach((_category: string) => {
				const category = _category.trim();
				const subcategory =
					nodeType.codex &&
					nodeType.codex.subcategories &&
					nodeType.codex.subcategories[category]
						? nodeType.codex.subcategories[category][0]
						: UNCATEGORIZED_SUBCATEGORY;
				if (!accu[category]) {
					accu[category] = {};
				}
				if (!accu[category][subcategory]) {
					accu[category][subcategory] = {
						triggerCount: 0,
						regularCount: 0,
						nodes: [],
					};
				}
				const isTrigger = nodeType.group.includes('trigger');
				if (isTrigger) {
					accu[category][subcategory].triggerCount++;
				}
				if (!isTrigger) {
					accu[category][subcategory].regularCount++;
				}
				accu[category][subcategory].nodes.push({
					type: 'node',
					key: `${category}_${nodeType.name}`,
					category,
					properties: {
						nodeType,
						subcategory,
					},
					includedByTrigger: isTrigger,
					includedByRegular: !isTrigger,
				});
			});
			return accu;
		},
		{
			[UNCATEGORIZED_CATEGORY]: {
				[UNCATEGORIZED_SUBCATEGORY]: {
					triggerCount: 0,
					regularCount: 0,
					nodes: [],
				},
			},
		},
	);
};

const getCategories = (categoriesWithNodes: ICategoriesWithNodes): string[] => {
	const categories = Object.keys(categoriesWithNodes);
	const sorted = categories.filter(
		(category: string) =>
			category !== CORE_NODES_CATEGORY && category !== CUSTOM_NODES_CATEGORY && category !== UNCATEGORIZED_CATEGORY,
	);
	sorted.sort();

	return [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, ...sorted, UNCATEGORIZED_CATEGORY];
};

export const getCategorizedList = (categoriesWithNodes: ICategoriesWithNodes): INodeCreateElement[] => {
	const categories = getCategories(categoriesWithNodes);

	return categories.reduce(
		(accu: INodeCreateElement[], category: string) => {
			if (!categoriesWithNodes[category]) {
				return accu;
			}

			const categoryEl: INodeCreateElement = {
				type: 'category',
				key: category,
				category,
				properties: {
					expanded: false,
				},
			};

			const subcategories = Object.keys(categoriesWithNodes[category]);
			if (subcategories.length === 1) {
				const subcategory = categoriesWithNodes[category][
					subcategories[0]
				];
				if (subcategory.triggerCount > 0) {
					categoryEl.includedByTrigger = subcategory.triggerCount > 0;
				}
				if (subcategory.regularCount > 0) {
					categoryEl.includedByRegular = subcategory.regularCount > 0;
				}
				return [...accu, categoryEl, ...subcategory.nodes];
			}

			subcategories.sort();
			const subcategorized = subcategories.reduce(
				(accu: INodeCreateElement[], subcategory: string) => {
					const subcategoryEl: INodeCreateElement = {
						type: 'subcategory',
						key: `${category}_${subcategory}`,
						category,
						properties: {
							subcategory,
							description: SUBCATEGORY_DESCRIPTIONS[category][subcategory],
						},
						includedByTrigger: categoriesWithNodes[category][subcategory].triggerCount > 0,
						includedByRegular: categoriesWithNodes[category][subcategory].regularCount > 0,
					};

					if (subcategoryEl.includedByTrigger) {
						categoryEl.includedByTrigger = true;
					}
					if (subcategoryEl.includedByRegular) {
						categoryEl.includedByRegular = true;
					}

					accu.push(subcategoryEl);
					return accu;
				},
				[],
			);

			return [...accu, categoryEl, ...subcategorized];
		},
		[],
	);
};

export const matchesSelectType = (el: INodeCreateElement, selectedType: string) => {
	if (selectedType === REGULAR_NODE_FILTER && el.includedByRegular) {
		return true;
	}
	if (selectedType === TRIGGER_NODE_FILTER && el.includedByTrigger) {
		return true;
	}

	return selectedType === ALL_NODE_FILTER;
};

const matchesAlias = (nodeType: INodeTypeDescription, filter: string): boolean => {
	if (!nodeType.codex || !nodeType.codex.alias) {
		return false;
	}

	return nodeType.codex.alias.reduce((accu: boolean, alias: string) => {
		return accu || alias.toLowerCase().indexOf(filter) > -1;
	}, false);
};

export const matchesNodeType = (el: INodeCreateElement, filter: string) => {
	const nodeType = (el.properties as INodeItemProps).nodeType;

	return nodeType.displayName.toLowerCase().indexOf(filter) !== -1 || matchesAlias(nodeType, filter);
};