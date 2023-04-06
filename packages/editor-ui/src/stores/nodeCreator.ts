import { startCase } from 'lodash-es';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import {
	INodePropertyCollection,
	INodePropertyOptions,
	IDataObject,
	INodeProperties,
	INodeTypeDescription,
	deepCopy,
	INodeParameters,
} from 'n8n-workflow';
import {
	STORES,
	MANUAL_TRIGGER_NODE_TYPE,
	CORE_NODES_CATEGORY,
	TRIGGER_NODE_FILTER,
	STICKY_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
} from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useWorkflowsStore } from './workflows';
import { CUSTOM_API_CALL_KEY, ALL_NODE_FILTER } from '@/constants';
import {
	ActionCreateElement,
	ActionTypeDescription,
	INodeCreatorState,
	INodeFilterType,
	IUpdateInformation,
	NodeCreatorOpenSource,
	SimplifiedNodeType,
} from '@/Interface';
import { BaseTextKey, i18n } from '@/plugins/i18n';
import { externalHooks } from '@/mixins/externalHooks';
import { Telemetry } from '@/plugins/telemetry';
import { ref, watch, computed } from 'vue';

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

type ExtractActionKeys<T> = T extends SimplifiedNodeType ? T['name'] : never;
type ActionsRecord<T extends SimplifiedNodeType[]> = {
	[K in ExtractActionKeys<T[number]>]: ActionTypeDescription[];
};
interface EventSubscriber {
	eventKey: string;
	callback: (e: unknown) => void;
	uuid: string;
}
interface EventQueueItem {
	eventKey: string;
	payload: unknown;
}

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, () => {
	const mergedNodes = ref<SimplifiedNodeType[]>([]);
	const actions = ref<ActionsRecord<typeof mergedNodes.value>>({});
	const showScrim = ref(false);
	const openSource = ref<NodeCreatorOpenSource>('');
	const eventsQueue = ref<EventQueueItem[]>([]);
	const eventsSubscribers = ref<EventSubscriber[]>([]);

	// We need to create a computed prop so we could watch for changes
	// in the eventsQueue
	const queueLength = computed(() => eventsQueue.value.length);
	function setAddedNodeActionParameters(
		action: IUpdateInformation,
		telemetry?: Telemetry,
		track = true,
	) {
		const { $onAction: onWorkflowStoreAction } = useWorkflowsStore();
		const storeWatcher = onWorkflowStoreAction(
			({ name, after, store: { setLastNodeParameters }, args }) => {
				if (name !== 'addNode' || args[0].type !== action.key) return;
				after(() => {
					setLastNodeParameters(action);
					if (track) trackActionSelected(action, telemetry);
					storeWatcher();
				});
			},
		);

		return storeWatcher;
	}

	function trackActionSelected(action: IUpdateInformation, telemetry?: Telemetry) {
		const { $externalHooks } = new externalHooks();

		const payload = {
			node_type: action.key,
			action: action.name,
			resource: (action.value as INodeParameters).resource || '',
		};
		$externalHooks().run('nodeCreateList.addAction', payload);
		telemetry?.trackNodesPanel('nodeCreateList.addAction', payload);
	}

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

				const isPlaceholderTriggerAction = action.actionKey === 'placeholder_recommended';
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

	function generateActions() {
		const visibleNodeTypes = deepCopy(useNodeTypesStore().visibleNodeTypes);

		visibleNodeTypes
			.filter((node) => !node.group.includes('trigger'))
			.forEach((app) => {
				const appActions = generateNodeActions(app);
				actions.value[app.name] = appActions;

				mergedNodes.value.push(getSimplifiedNodeType(app));
			});

		visibleNodeTypes
			.filter((node) => node.group.includes('trigger'))
			.forEach((trigger) => {
				const normalizedName = trigger.name.replace('Trigger', '');
				const triggerActions = generateNodeActions(trigger);
				const appActions = actions.value?.[normalizedName] || [];
				const app = mergedNodes.value.find((node) => node.name === normalizedName);

				if (app && appActions?.length > 0) {
					// merge triggers into regular nodes that match
					const mergedActions = filterActions([...appActions, ...triggerActions]);
					actions.value[normalizedName] = mergedActions;

					app.description = trigger.description; // default to trigger description
				} else {
					actions.value[trigger.name] = filterActions(triggerActions);
					mergedNodes.value.push(getSimplifiedNodeType(trigger));
				}
			});
	}

	function setShowScrim(isVisible: boolean) {
		console.log('🚀 ~ file: nodeCreator.ts:351 ~ setShowScrim ~ isVisible:', isVisible);
		showScrim.value = isVisible;
	}

	function addEventToQueue(eventKey: string, payload?: unknown) {
		eventsQueue.value.push({
			eventKey,
			payload,
		});
	}

	function getActionData(actionItem: ActionTypeDescription): IUpdateInformation {
		const displayOptions = actionItem.displayOptions;

		const displayConditions = Object.keys(displayOptions?.show || {}).reduce(
			(acc: IDataObject, showCondition: string) => {
				acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
				return acc;
			},
			{},
		);

		return {
			name: actionItem.displayName,
			key: actionItem.name as string,
			value: { ...actionItem.values, ...displayConditions } as INodeParameters,
		};
	}

	function getNodeTypesWithManualTrigger(nodeType?: string): string[] {
		if (!nodeType) return [];

		const { workflowTriggerNodes } = useWorkflowsStore();
		const isTrigger = useNodeTypesStore().isTriggerNode(nodeType);
		const workflowContainsTrigger = workflowTriggerNodes.length > 0;
		// const isTriggerPanel = useNodeCreatorStore().selectedView === TRIGGER_NODE_FILTER;
		const isStickyNode = nodeType === STICKY_NODE_TYPE;
		const singleNodeOpenSources = [
			NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
			NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
			NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
		];

		// If the node creator was opened from the plus endpoint, node connection action, or node connection drop
		// then we do not want to append the manual trigger
		const isSingleNodeOpenSource = singleNodeOpenSources.includes(openSource.value);

		const shouldAppendManualTrigger =
			!isSingleNodeOpenSource &&
			!isTrigger &&
			!workflowContainsTrigger &&
			// isTriggerPanel &&
			!isStickyNode;

		const nodeTypes = shouldAppendManualTrigger ? [MANUAL_TRIGGER_NODE_TYPE, nodeType] : [nodeType];

		return nodeTypes;
	}

	function subscribeToEvent(eventKey: string, callback: (payload?: unknown) => void) {
		const uuid = uuidv4();
		eventsSubscribers.value.push({
			uuid,
			eventKey,
			callback,
		});

		return () => unsubscribeFromEvent(uuid);
	}

	function unsubscribeFromEvent(uuid: string) {
		eventsSubscribers.value = eventsSubscribers.value.filter(
			(subscriber) => subscriber.uuid !== uuid,
		);
	}

	function processEventQueue() {
		// Create a separate array for the items to be processed in this cycle
		const itemsToProcess = [...eventsQueue.value];
		// Clear the queue
		eventsQueue.value = [];

		// Process items
		itemsToProcess.forEach(({ eventKey, payload }) => {
			const matchingSubscribers = eventsSubscribers.value.filter(
				(subscriber) => subscriber.eventKey === eventKey,
			);

			matchingSubscribers.forEach((subscriber) => subscriber.callback(payload));
		});
	}

	watch(queueLength, () => processEventQueue());

	return {
		getActionData,
		generateActions,
		setShowScrim,
		addEventToQueue,
		subscribeToEvent,
		getNodeTypesWithManualTrigger,
		setAddedNodeActionParameters,
		showScrim,
		mergedNodes,
		actions,
	};
});
