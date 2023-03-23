import { reactive, toRefs, getCurrentInstance, computed, onUnmounted, ref } from 'vue';
import {
	INodeTypeDescription,
	INodeActionTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import {
	INodeCreateElement,
	NodeCreateElement,
	IActionItemProps,
	SubcategoryCreateElement,
	IUpdateInformation,
} from '@/Interface';
import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	EMAIL_IMAP_NODE_TYPE,
	CUSTOM_API_CALL_NAME,
	HTTP_REQUEST_NODE_TYPE,
	STICKY_NODE_TYPE,
	REGULAR_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	N8N_NODE_TYPE,
} from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { getCategoriesWithNodes, getCategorizedList } from '@/utils';
import { externalHooks } from '@/mixins/externalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { BaseTextKey } from '@/plugins/i18n';
import { useRootStore } from '@/stores/n8nRootStore';
import useMainPanelView from './useMainPanelView';

export default () => {
	const { getActionData, getNodeTypesWithManualTrigger, setAddedNodeActionParameters } =
		useNodeCreatorStore();
	const instance = getCurrentInstance();
	const { baseUrl } = useRootStore();
	const { $externalHooks } = new externalHooks();
	const telemetry = instance?.proxy.$telemetry;

	const state = reactive({
		activeNodeActions: null as INodeActionTypeDescription | null,
	});

	const { transformCreateElements, isRoot } = useMainPanelView();
	const activeNodeActions = computed(() => state.activeNodeActions || null);
	const containsAPIAction = computed(
		() =>
			activeNodeActions.value?.properties.some((p) =>
				p.options?.find((o) => o.name === CUSTOM_API_CALL_NAME),
			) === true,
	);

	const selectedView = computed(() => useNodeCreatorStore().selectedView);

	const categoriesWithActions = computed(() => {
		return getCategoriesWithNodes(selectedNodeActions.value, activeNodeActions.value?.displayName);
	});

	const categorizedActions = computed(() => {
		return sortActions(getCategorizedList(categoriesWithActions.value, true));
	});

	const selectedNodeActions = computed<INodeActionTypeDescription[]>(
		() => activeNodeActions.value?.actions ?? [],
	);

	const isActionsActive = computed(() => activeNodeActions.value !== null);

	const searchableActions = computed<INodeCreateElement[]>(() => {
		return transformCreateElements(selectedNodeActions.value, 'action');
	});

	const actionsSearchPlaceholder = computed(() => {
		const nodeNameTitle = activeNodeActions.value?.displayName?.trim() as string;
		return instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.searchActions', {
			interpolate: { nodeNameTitle },
		});
	});

	const nodeAppActionsSubcategory = computed<SubcategoryCreateElement | undefined>(() => {
		if (!activeNodeActions.value) return undefined;

		const icon = activeNodeActions.value.iconUrl
			? `${baseUrl}${activeNodeActions.value.iconUrl}`
			: activeNodeActions.value.icon?.split(':')[1];

		return {
			type: 'subcategory',
			key: activeNodeActions.value.name,
			properties: {
				subcategory: activeNodeActions.value.displayName,
				description: '',
				iconType: activeNodeActions.value.iconUrl ? 'file' : 'icon',
				icon,
				color: activeNodeActions.value.defaults.color,
			},
		};
	});

	// If the user is in the root view, we want to show trigger nodes first
	// otherwise we want to show them last
	function sortActions(nodeCreateElements: INodeCreateElement[]): INodeCreateElement[] {
		const elements = {
			trigger: [] as INodeCreateElement[],
			regular: [] as INodeCreateElement[],
		};

		nodeCreateElements.forEach((el) => {
			const isTriggersCategory = el.type === 'category' && el.key === 'Triggers';
			const isTriggerAction = el.type === 'action' && el.category === 'Triggers';

			elements[isTriggersCategory || isTriggerAction ? 'trigger' : 'regular'].push(el);
		});

		if (selectedView.value === TRIGGER_NODE_FILTER) {
			return [...elements.trigger, ...elements.regular];
		}

		return [...elements.regular, ...elements.trigger];
	}

	function getCustomAPICallHintLocale(key: string) {
		if (!isActionsActive.value) return '';

		const nodeNameTitle = activeNodeActions.value?.displayName || '';
		return instance?.proxy.$locale.baseText(`nodeCreator.actionsList.${key}` as BaseTextKey, {
			interpolate: { nodeNameTitle },
		});
	}

	function setActiveActions(nodeType: INodeActionTypeDescription | null) {
		state.activeNodeActions = nodeType;

		if (nodeType) trackActionsView();
	}

	function trackActionsView() {
		const trigger_action_count = selectedNodeActions.value.filter((action) =>
			action.name.toLowerCase().includes('trigger'),
		).length;

		const trackingPayload = {
			app_identifier: activeNodeActions.value?.name,
			actions: selectedNodeActions.value.map((action) => action.displayName),
			regular_action_count: selectedNodeActions.value.length - trigger_action_count,
			trigger_action_count,
		};

		$externalHooks().run('nodeCreateList.onViewActions', trackingPayload);
		telemetry?.trackNodesPanel('nodeCreateList.onViewActions', trackingPayload);
	}

	function onActionSelected(actionCreateElement: INodeCreateElement) {
		const action = (actionCreateElement.properties as IActionItemProps).nodeType;
		const actionUpdateData = getActionData(action);
		instance?.proxy.$emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionUpdateData.key));
		setAddedNodeActionParameters(actionUpdateData, telemetry);
	}

	function shouldShowNodeActions(node: INodeCreateElement) {
		if (isRoot.value && useNodeCreatorStore().itemsFilter === '') return false;

		return true;
	}

	return {
		containsAPIAction,
		categoriesWithActions,
		categorizedActions,
		searchableActions,
		selectedNodeActions,
		isActionsActive,
		actionsSearchPlaceholder,
		nodeAppActionsSubcategory,
		getCustomAPICallHintLocale,
		trackActionsView,
		setActiveActions,
		onActionSelected,
		shouldShowNodeActions,
	};
};
