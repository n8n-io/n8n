import type { ActionTypeDescription, ActionsRecord, SimplifiedNodeType } from '@/Interface';
import {
	AI_CATEGORY_ROOT_NODES,
	AI_CATEGORY_TOOLS,
	AI_SUBCATEGORY,
	CUSTOM_API_CALL_KEY,
	HTTP_REQUEST_NODE_TYPE,
} from '@/constants';
import memoize from 'lodash/memoize';
import startCase from 'lodash/startCase';
import type {
	ICredentialType,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';

import { i18n } from '@n8n/i18n';

import { getCredentialOnlyNodeType } from '@/utils/credentialOnlyNodes';
import { formatTriggerActionName } from '../utils';
import { useEvaluationStore } from '@/features/evaluation.ee/evaluation.store';
import { useSettingsStore } from '@/stores/settings.store';

const PLACEHOLDER_RECOMMENDED_ACTION_KEY = 'placeholder_recommended';

function translate(...args: Parameters<typeof i18n.baseText>) {
	return i18n.baseText(...args);
}

// Memoize the translation function so we don't have to re-translate the same string
// multiple times when generating the actions
const cachedBaseText = memoize(translate, (...args) => JSON.stringify(args));

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
				displayName: cachedBaseText('nodeCreator.actionsCategory.onEvent', {
					interpolate: { event: startCase(categoryItem.name) },
				}),
				description: categoryItem.description ?? '',
				displayOptions: matchedProperty.displayOptions,
				values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
			}),
		);
	},
	['n8n-nodes-base.code']: (matchedProperty, nodeTypeDescription) => {
		if (matchedProperty.name !== 'language') return;

		const languageOptions = matchedProperty.options as INodePropertyOptions[] | undefined;
		if (!languageOptions) return;

		return languageOptions.map(
			(option): ActionTypeDescription => ({
				...getNodeTypeBase(nodeTypeDescription),
				actionKey: `language_${option.value}`,
				displayName: `Code in ${option.name}`,
				description: `Run custom ${option.name} code`,
				displayOptions: matchedProperty.displayOptions,
				values: {
					language: option.value,
				},
			}),
		);
	},
};

function getNodeTypeBase(nodeTypeDescription: INodeTypeDescription, label?: string) {
	const isTrigger = nodeTypeDescription.group.includes('trigger');
	const category = isTrigger
		? cachedBaseText('nodeCreator.actionsCategory.triggers')
		: cachedBaseText('nodeCreator.actionsCategory.actions');
	return {
		name: nodeTypeDescription.name,
		group: nodeTypeDescription.group,
		codex: {
			label: label ?? '',
			categories: [category],
		},
		iconUrl: nodeTypeDescription.iconUrl,
		iconColor: nodeTypeDescription.iconColor,
		outputs: nodeTypeDescription.outputs,
		icon: nodeTypeDescription.icon,
		defaults: nodeTypeDescription.defaults,
	};
}

function operationsCategory(nodeTypeDescription: INodeTypeDescription): ActionTypeDescription[] {
	if (nodeTypeDescription.properties.find((property) => property.name === 'resource')) return [];

	if (nodeTypeDescription.name === 'n8n-nodes-base.code') {
		const languageProperty = nodeTypeDescription.properties.find(
			(property) =>
				property.name === 'language' && property.displayOptions?.show?.['@version']?.[0] === 2,
		);

		if (languageProperty) {
			const customParsedItems = customNodeActionsParsers[nodeTypeDescription.name]?.(
				languageProperty,
				nodeTypeDescription,
			);
			if (customParsedItems) {
				// temporary until native Python runner is GA
				return useSettingsStore().isNativePythonRunnerEnabled
					? customParsedItems.filter((item) => item.actionKey !== 'language_python')
					: customParsedItems.filter((item) => item.actionKey !== 'language_pythonNative');
			}
		}
	}

	const matchedProperty = nodeTypeDescription.properties.find(
		(property) => property.name?.toLowerCase() === 'operation',
	);

	if (!matchedProperty?.options) return [];

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const items = filteredOutItems.map((item: INodePropertyOptions) => ({
		...getNodeTypeBase(nodeTypeDescription),
		actionKey: item.value as string,
		displayName: item.action ?? startCase(item.name),
		description: item.description ?? '',
		displayOptions: matchedProperty.displayOptions,
		outputConnectionType: item.outputConnectionType,
		values: {
			[matchedProperty.name]: matchedProperty.type === 'multiOptions' ? [item.value] : item.value,
		},
	}));

	// Do not return empty category
	if (items.length === 0) return [];

	return items;
}

function modeCategory(nodeTypeDescription: INodeTypeDescription): ActionTypeDescription[] {
	// Mode actions should only be available for AI nodes
	const isAINode = nodeTypeDescription.codex?.categories?.includes(AI_SUBCATEGORY);
	if (!isAINode) return [];

	const matchedProperty = nodeTypeDescription.properties.find(
		(property) => property.name?.toLowerCase() === 'mode',
	);

	if (!matchedProperty?.options) return [];

	const modeOptions = matchedProperty.options as INodePropertyOptions[];

	const items = modeOptions.map((item: INodePropertyOptions) => ({
		...getNodeTypeBase(nodeTypeDescription),
		actionKey: item.value as string,
		displayName: item.action ?? startCase(item.name),
		description: item.description ?? '',
		displayOptions: matchedProperty.displayOptions,
		outputConnectionType: item.outputConnectionType,
		values: {
			[matchedProperty.name]: item.value,
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
	if (!matchedProperty?.options) {
		return [
			{
				...getNodeTypeBase(nodeTypeDescription),
				actionKey: PLACEHOLDER_RECOMMENDED_ACTION_KEY,
				displayName: cachedBaseText('nodeCreator.actionsCategory.onNewEvent', {
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
				cachedBaseText('nodeCreator.actionsCategory.onEvent', {
					interpolate: { event: formatTriggerActionName(categoryItem.name) },
				}),
			description: categoryItem.description ?? '',
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
		(property) => property.name === 'resource',
	);

	matchedProperties.forEach((property) => {
		((property.options as INodePropertyOptions[]) || [])
			.filter((option) => option.value !== CUSTOM_API_CALL_KEY)
			.forEach((resourceOption, _i, options) => {
				const isSingleResource = options.length === 1;

				// Match operations for the resource by checking if displayOptions matches or contains the resource name
				const operations = nodeTypeDescription.properties.find((operation) => {
					const isOperation = operation.name === 'operation';
					const isMatchingResource =
						operation.displayOptions?.show?.resource?.includes(resourceOption.value) ??
						isSingleResource;

					// If the operation doesn't have a version defined, it should be
					// available for all versions. Otherwise, make sure the node type
					// version matches the operation version
					const operationVersions = operation.displayOptions?.show?.['@version'];
					const nodeTypeVersions = Array.isArray(nodeTypeDescription.version)
						? nodeTypeDescription.version
						: [nodeTypeDescription.version];

					const isMatchingVersion = operationVersions
						? operationVersions.some(
								(version) => typeof version === 'number' && nodeTypeVersions.includes(version),
							)
						: true;

					return isOperation && isMatchingResource && isMatchingVersion;
				});

				if (!operations?.options) return;

				const items = ((operations.options as INodePropertyOptions[]) || []).map(
					(operationOption) => {
						const displayName =
							operationOption.action ?? `${resourceOption.name} ${startCase(operationOption.name)}`;

						// We need to manually populate displayOptions as they are not present in the node description
						// if the resource has only one option
						const displayOptions = isSingleResource
							? { show: { resource: [options[0]?.value] } }
							: operations?.displayOptions;

						return {
							...getNodeTypeBase(
								nodeTypeDescription,
								`${resourceOption.name} ${cachedBaseText('nodeCreator.actionsCategory.actions')}`,
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
						} as ActionTypeDescription;
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
		if (
			node.codex?.subcategories?.AI?.includes(AI_CATEGORY_TOOLS) &&
			!node.codex?.subcategories?.AI?.includes(AI_CATEGORY_ROOT_NODES)
		)
			return [];
		return [
			...triggersCategory(node),
			...operationsCategory(node),
			...resourceCategories(node),
			...modeCategory(node),
		];
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
		const {
			displayName,
			defaults,
			description,
			name,
			group,
			icon,
			iconUrl,
			iconColor,
			badgeIconUrl,
			outputs,
			codex,
		} = node;

		return {
			displayName,
			defaults,
			description,
			name,
			group,
			icon,
			iconColor,
			iconUrl,
			badgeIconUrl,
			outputs,
			codex,
		};
	}

	function generateMergedNodesAndActions(
		nodeTypes: INodeTypeDescription[],
		httpOnlyCredentials: ICredentialType[],
	) {
		const evaluationStore = useEvaluationStore();

		const visibleNodeTypes = nodeTypes.filter((node) => {
			if (evaluationStore.isEvaluationEnabled) {
				return true;
			}
			return (
				node.name !== 'n8n-nodes-base.evaluation' &&
				node.name !== 'n8n-nodes-base.evaluationTrigger'
			);
		});

		const actions: ActionsRecord<typeof mergedNodes> = {};
		const mergedNodes: SimplifiedNodeType[] = [];
		visibleNodeTypes
			.filter((node) => !node.group.includes('trigger'))
			.forEach((app) => {
				const appActions = generateNodeActions(app);
				actions[app.name] = appActions;

				if (app.name === HTTP_REQUEST_NODE_TYPE) {
					const credentialOnlyNodes = httpOnlyCredentials.map((credentialType) => {
						const credsOnlyNode = getCredentialOnlyNodeType(app, credentialType);
						if (credsOnlyNode) return getSimplifiedNodeType(credsOnlyNode);
						return null;
					});

					const filteredNodes = credentialOnlyNodes.filter(
						(node): node is SimplifiedNodeType => node !== null,
					);

					mergedNodes.push(...filteredNodes);
				}

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
