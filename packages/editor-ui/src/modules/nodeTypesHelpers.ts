import { CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, SUBCATEGORY_DESCRIPTIONS, UNCATEGORIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY, PERSONALIZED_CATEGORY  } from '@/constants';
import { INodeCreateElement, ICategoriesWithNodes, INodeTypeDescriptionWithActions } from '@/Interface';
import { INodeTypeDescription, INodeProperties } from 'n8n-workflow';
import { startCase } from 'lodash';

const addNodeToCategory = (accu: ICategoriesWithNodes, nodeType: INodeTypeDescription, category: string, subcategory: string) => {
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
};

export const extendNodeWithActions = (nodeType: INodeTypeDescription): INodeTypeDescriptionWithActions => {
	function recommendedCategory(properties: INodeProperties[]) {
		const matchingKeys = ['event', 'events', 'trigger on'];
		const matchedProperties = (properties || [])
			.filter((property: any) => matchingKeys.includes(property.displayName?.toLowerCase()));

		if(matchedProperties.length === 0) return [];

		const actions = matchedProperties
			.reduce((acc, curr) => {
				const options = curr.options
				?.filter((property: any) => !['*', '', ' '].includes(property.name))
				.map((option: any) => ({
						key: option.value,
						title: `When ${startCase(option.name)}`,
						description: option.description,
						displayOptions: curr.displayOptions,
						multiOptions: curr.type === 'multiOptions',
						values: {[matchedProperties[0].name]: curr.type === 'multiOptions' ? [option.value] : option.value},
					}));
				if(options) acc.push(...options);
				return acc;
			}, []);

		// Do not return empty category
		if(actions.length === 0) return [];

		// TODO: Is it safe to assume that the first property name and type is identical to all the others?
		return [{
			key: matchedProperties[0].name,
			title: 'Recommended',
			type: 'category',
			actions,
		}];
	}

	function resourceCategories(properties: INodeProperties[]) {
		const matchingKeys = ['resource'];
		const matchedProperties = (properties || [])
			.filter((property: any) => matchingKeys.includes(property.displayName?.toLowerCase()));

		if(matchedProperties.length === 0) return [];

		const categories = [];

		for (const matchedProperty of matchedProperties) {
			for (const resource of matchedProperty.options || []) {
				const resourceCategory = {
					title: resource.name,
					key: resource.value,
					type: 'category',
					actions: [],
				};

				const operations = properties.find(property => {
					return property.name === 'operation' && property.displayOptions?.show?.resource?.includes(resource.value);
				});

				for (const operation of operations?.options || []) {
					(resourceCategory.actions as any[]).push({
							key: operation.value,
							title: `${resource.name} ${startCase(operation.name)}`,
							description: operation?.description,
							displayOptions: operations?.displayOptions,
							values: {operation: operations?.type === 'multiOptions' ? [operation.value] : operation.value},
					});
				}

				if(resourceCategory.actions.length > 0) categories.push(resourceCategory);
			}
		}

		return categories;
	}

	return {
		...nodeType,
		actions: [...recommendedCategory(nodeType.properties), ...resourceCategories(nodeType.properties)],
	};
};

export const getCategoriesWithNodes = (nodeTypes: INodeTypeDescription[], personalizedNodeTypes: string[]): ICategoriesWithNodes => {
	const sorted = [...nodeTypes].sort((a: INodeTypeDescription, b: INodeTypeDescription) => a.displayName > b.displayName? 1 : -1);
	return sorted.reduce(
		(accu: ICategoriesWithNodes, nodeType: INodeTypeDescription) => {
			if (personalizedNodeTypes.includes(nodeType.name)) {
				addNodeToCategory(accu, nodeType, PERSONALIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY);
			}

			if (!nodeType.codex || !nodeType.codex.categories) {
				addNodeToCategory(accu, nodeType, UNCATEGORIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY);
				return accu;
			}

			nodeType.codex.categories.forEach((_category: string) => {
				const category = _category.trim();
				const subcategories =
					nodeType.codex &&
					nodeType.codex.subcategories &&
					nodeType.codex.subcategories[category]
					? nodeType.codex.subcategories[category]
					: null;

				if(subcategories === null || subcategories.length === 0) {
					addNodeToCategory(accu, nodeType, category, UNCATEGORIZED_SUBCATEGORY);
					return;
				}

				subcategories.forEach(subcategory => {
					addNodeToCategory(accu, nodeType, category, subcategory);
				});

			});
			return accu;
		},
		{},
	);
};

const getCategories = (categoriesWithNodes: ICategoriesWithNodes): string[] => {
	const excludeFromSort = [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, UNCATEGORIZED_CATEGORY, PERSONALIZED_CATEGORY];
	const categories = Object.keys(categoriesWithNodes);
	const sorted = categories.filter(
		(category: string) =>
			!excludeFromSort.includes(category),
	);
	sorted.sort();

	return [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, PERSONALIZED_CATEGORY, ...sorted, UNCATEGORIZED_CATEGORY];
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
