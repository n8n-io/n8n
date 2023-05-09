import { startCase } from 'lodash-es';
import type {
	INodePropertyCollection,
	INodePropertyOptions,
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { CUSTOM_API_CALL_KEY } from '@/constants';
import type { ActionTypeDescription, SimplifiedNodeType, ActionsRecord } from '@/Interface';

import { i18n } from '@/plugins/i18n';

const PLACEHOLDER_RECOMMENDED_ACTION_KEY = 'placeholder_recommended';

const customNodeActionsParsers: {
	[key: string]: (
		matchedProperty: INodeProperties,
		nodeTypeDescription: INodeTypeDescription,
	) => ActionTypeDescription[] | undefined;
} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty, nodeTypeDescription) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;

		return (collection?.values[0]?.options as INodePropertyOptions[])?.map(
			(categoryItem): ActionTypeDescription => ({
				...getNodeTypeBase(nodeTypeDescription),
				actionKey: categoryItem.value as string,
				displayName: i18n.baseText('nodeCreator.actionsCategory.onEvent', {
					interpolate: { event: startCase(categoryItem.name) },
				}),
				description: categoryItem.description || '',
				displayOptions: matchedProperty.displayOptions,
				values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
			}),
		);
	},
};

function getNodeTypeBase(nodeTypeDescription: INodeTypeDescription, label?: string) {
	const isTrigger = nodeTypeDescription.group.includes('trigger');
	const category = isTrigger
		? i18n.baseText('nodeCreator.actionsCategory.triggers')
		: i18n.baseText('nodeCreator.actionsCategory.actions');
	return {
		name: nodeTypeDescription.name,
		group: nodeTypeDescription.group,
		codex: {
			label: label || '',
			categories: [category],
		},
		iconUrl: nodeTypeDescription.iconUrl,
		icon: nodeTypeDescription.icon,
		defaults: nodeTypeDescription.defaults,
	};
}

function operationsCategory(nodeTypeDescription: INodeTypeDescription): ActionTypeDescription[] {
	if (!!nodeTypeDescription.properties.find((property) => property.name === 'resource')) return [];

	const matchedProperty = nodeTypeDescription.properties.find(
		(property) => property.name?.toLowerCase() === 'operation',
	);

	if (!matchedProperty || !matchedProperty.options) return [];

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const items = filteredOutItems.map((item: INodePropertyOptions) => ({
		...getNodeTypeBase(nodeTypeDescription),
		actionKey: item.value as string,
		displayName: item.action ?? startCase(item.name),
		description: item.description ?? '',
		displayOptions: matchedProperty.displayOptions,
		values: {
			[matchedProperty.name]: matchedProperty.type === 'multiOptions' ? [item.value] : item.value,
		},
	}));

	// Do not return empty category
	if (items.length === 0) return [];

	return items;
}

function triggersCategory(nodeTypeDescription: INodeTypeDescription): ActionTypeDescription[] {
	const matchingKeys = ['event', 'events', 'trigger on'];
	const isTrigger = nodeTypeDescription.displayName?.toLowerCase().includes('trigger');
	const matchedProperty = nodeTypeDescription.properties.find((property) =>
		matchingKeys.includes(property.displayName?.toLowerCase()),
	);

	if (!isTrigger) return [];

	// Inject placeholder action if no events are available
	// so user is able to add node to the canvas from the actions panel
	if (!matchedProperty || !matchedProperty.options) {
		return [
			{
				...getNodeTypeBase(nodeTypeDescription),
				actionKey: PLACEHOLDER_RECOMMENDED_ACTION_KEY,
				displayName: i18n.baseText('nodeCreator.actionsCategory.onNewEvent', {
					interpolate: { event: nodeTypeDescription.displayName.replace('Trigger', '').trimEnd() },
				}),
				description: '',
			},
		];
	}

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const customParsedItem = customNodeActionsParsers[nodeTypeDescription.name]?.(
		matchedProperty,
		nodeTypeDescription,
	);

	const items =
		customParsedItem ??
		filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
			...getNodeTypeBase(nodeTypeDescription),
			actionKey: categoryItem.value as string,
			displayName:
				categoryItem.action ??
				i18n.baseText('nodeCreator.actionsCategory.onEvent', {
					interpolate: { event: startCase(categoryItem.name) },
				}),
			description: categoryItem.description || '',
			displayOptions: matchedProperty.displayOptions,
			values: {
				[matchedProperty.name]:
					matchedProperty.type === 'multiOptions' ? [categoryItem.value] : categoryItem.value,
			},
		}));

	return items;
}

function resourceCategories(nodeTypeDescription: INodeTypeDescription): ActionTypeDescription[] {
	const transformedNodes: ActionTypeDescription[] = [];
	const matchedProperties = nodeTypeDescription.properties.filter(
		(property) => property.displayName?.toLowerCase() === 'resource',
	);

	matchedProperties.forEach((property) => {
		((property.options as INodePropertyOptions[]) || [])
			.filter((option) => option.value !== CUSTOM_API_CALL_KEY)
			.forEach((resourceOption, i, options) => {
				const isSingleResource = options.length === 1;

				// Match operations for the resource by checking if displayOptions matches or contains the resource name
				const operations = nodeTypeDescription.properties.find(
					(operation) =>
						operation.name === 'operation' &&
						(operation.displayOptions?.show?.resource?.includes(resourceOption.value) ||
							isSingleResource),
				);

				if (!operations?.options) return;

				const items = ((operations.options as INodePropertyOptions[]) || []).map(
					(operationOption) => {
						const displayName =
							operationOption.action ?? `${resourceOption.name} ${startCase(operationOption.name)}`;

						// We need to manually populate displayOptions as they are not present in the node description
						// if the resource has only one option
						const displayOptions = isSingleResource
							? { show: { resource: [(options as INodePropertyOptions[])[0]?.value] } }
							: operations?.displayOptions;

						return {
							...getNodeTypeBase(
								nodeTypeDescription,
								`${resourceOption.name} ${i18n.baseText('nodeCreator.actionsCategory.actions')}`,
							),
							actionKey: operationOption.value as string,
							description: operationOption?.description ?? '',
							displayOptions,
							values: {
								operation:
									operations?.type === 'multiOptions'
										? [operationOption.value]
										: operationOption.value,
							},
							displayName,
							group: ['trigger'],
						};
					},
				);

				transformedNodes.push(...items);
			});
	});

	return transformedNodes;
}

export function useActionsGenerator() {
	function generateNodeActions(node: INodeTypeDescription | undefined) {
		if (!node) return [];
		return [...triggersCategory(node), ...operationsCategory(node), ...resourceCategories(node)];
	}
	function filterActions(actions: ActionTypeDescription[]) {
		// Do not show single action nodes
		if (actions.length <= 1) return [];
		return actions.filter(
			(action: ActionTypeDescription, _: number, arr: ActionTypeDescription[]) => {
				const isApiCall = action.actionKey === CUSTOM_API_CALL_KEY;
				if (isApiCall) return false;

				const isPlaceholderTriggerAction = action.actionKey === PLACEHOLDER_RECOMMENDED_ACTION_KEY;
				return !isPlaceholderTriggerAction || (isPlaceholderTriggerAction && arr.length > 1);
			},
		);
	}

	function getSimplifiedNodeType(node: INodeTypeDescription): SimplifiedNodeType {
		const { displayName, defaults, description, name, group, icon, iconUrl, codex } = node;

		return {
			displayName,
			defaults,
			description,
			name,
			group,
			icon,
			iconUrl,
			codex,
		};
	}

	function generateMergedNodesAndActions(nodeTypes: INodeTypeDescription[]) {
		const visibleNodeTypes = deepCopy(nodeTypes);
		const actions: ActionsRecord<typeof mergedNodes> = {};
		const mergedNodes: SimplifiedNodeType[] = [];

		visibleNodeTypes
			.filter((node) => !node.group.includes('trigger'))
			.forEach((app) => {
				const appActions = generateNodeActions(app);
				actions[app.name] = appActions;

				mergedNodes.push(getSimplifiedNodeType(app));
			});

		visibleNodeTypes
			.filter((node) => node.group.includes('trigger'))
			.forEach((trigger) => {
				const normalizedName = trigger.name.replace('Trigger', '');
				const triggerActions = generateNodeActions(trigger);
				const appActions = actions?.[normalizedName] || [];
				const app = mergedNodes.find((node) => node.name === normalizedName);

				if (app && appActions?.length > 0) {
					// merge triggers into regular nodes that match
					const mergedActions = filterActions([...appActions, ...triggerActions]);
					actions[normalizedName] = mergedActions;

					app.description = trigger.description; // default to trigger description
				} else {
					actions[trigger.name] = filterActions(triggerActions);
					mergedNodes.push(getSimplifiedNodeType(trigger));
				}
			});

		return {
			actions,
			mergedNodes,
		};
	}

	return {
		generateMergedNodesAndActions,
	};
}
