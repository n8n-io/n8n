import { reactive, toRefs, getCurrentInstance, computed, onUnmounted, ref } from 'vue';
import { INodeCreateElement, IActionItemProps, LabelCreateElement } from '@/Interface';
import { SCHEDULE_TRIGGER_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { externalHooks } from '@/mixins/externalHooks';
import { BaseTextKey } from '@/plugins/i18n';
import { useRootStore } from '@/stores/n8nRootStore';
import { sortNodeCreateElements, transformNodeType } from '../utils';

export const useActions = () => {
	const {
		getActionData,
		getNodeTypesWithManualTrigger,
		setAddedNodeActionParameters,
		getNodeTypeBase,
		visibleNodesWithActions,
	} = useNodeCreatorStore();

	const instance = getCurrentInstance();
	const { baseUrl } = useRootStore();
	const { $externalHooks } = new externalHooks();
	const telemetry = instance?.proxy.$telemetry;

	// const { transformCreateElements, isRoot } = useMainPanelView();

	// const containsAPIAction = computed(
	// 	() =>
	// 		activeNodeActions.value?.properties.some((p) =>
	// 			p.options?.find((o) => o.name === CUSTOM_API_CALL_NAME),
	// 		) === true,
	// );

	function getPlaceholderTriggerActions(subcategory: string) {
		const nodes = [WEBHOOK_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE];

		const matchedNodeTypes = visibleNodesWithActions
			.filter((node) => nodes.some((n) => n === node.name))
			.map((node) => {
				const transformed = transformNodeType(node, subcategory, 'action');

				if (transformed.type === 'action') {
					const nameBase = node.name.replace('n8n-nodes-base.', '');
					const localeKey = `nodeCreator.actionsPlaceholderNode.${nameBase}` as BaseTextKey;
					const overwriteLocale = instance?.proxy.$locale.baseText(localeKey) as string;

					// If the locale key is not the same as the node name, it means it contain a translation
					// and we should use it
					if (overwriteLocale !== localeKey) {
						transformed.properties.displayName = overwriteLocale;
					}
				}
				return transformed;
			});

		return matchedNodeTypes;
	}

	const actionsCategoryLocales = computed(() => {
		return {
			actions: instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.actions') ?? '',
			triggers: instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.triggers') ?? '',
		};
	});

	function filterActionsCategory(items: INodeCreateElement[], category: string) {
		return items.filter(
			(item) => item.type === 'action' && item.properties.codex.categories.includes(category),
		);
	}

	function injectActionsLabels(items: INodeCreateElement[]): INodeCreateElement[] {
		const extendedActions = sortNodeCreateElements([...items]);
		const labelsSet = new Set<string>();

		// Collect unique labels
		for (const action of extendedActions) {
			if (action.type !== 'action') continue;
			const label = action.properties.codex.label;
			labelsSet.add(label);
		}

		if (labelsSet.size <= 1) return extendedActions;

		// Create a map to store the first index of each label
		const firstIndexMap = new Map<string, number>();

		// Iterate through the extendedActions to find the first index of each label
		for (let i = 0; i < extendedActions.length; i++) {
			const action = extendedActions[i];
			if (action.type !== 'action') continue;
			const label = action.properties.codex.label;
			if (!firstIndexMap.has(label)) {
				firstIndexMap.set(label, i);
			}
		}

		// Keep track of the number of inserted labels
		let insertedLabels = 0;

		// Create and insert new label objects at the first index of each label
		for (const label of labelsSet) {
			const newLabel: LabelCreateElement = {
				uuid: label,
				type: 'label',
				key: label,
				subcategory: extendedActions[0].key,
				properties: {
					key: label,
				},
			};

			const insertIndex = firstIndexMap.get(label)! + insertedLabels;
			extendedActions.splice(insertIndex, 0, newLabel);
			insertedLabels++;
		}

		return extendedActions;
	}

	function parseCategoryActions(actions: INodeCreateElement[], category: string) {
		return injectActionsLabels(filterActionsCategory(actions, category));
	}

	// const actionsSearchPlaceholder = computed(() => {
	// 	const nodeNameTitle = activeNodeActions.value?.displayName?.trim() as string;
	// 	return instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.searchActions', {
	// 		interpolate: { nodeNameTitle },
	// 	});
	// });

	// const nodeAppActionsSubcategory = computed<SubcategoryCreateElement | undefined>(() => {
	// 	if (!activeNodeActions.value) return undefined;

	// 	const icon = activeNodeActions.value.iconUrl
	// 		? `${baseUrl}${activeNodeActions.value.iconUrl}`
	// 		: activeNodeActions.value.icon?.split(':')[1];

	// 	return {
	// 		type: 'subcategory',
	// 		key: activeNodeActions.value.name,
	// 		properties: {
	// 			subcategory: activeNodeActions.value.displayName,
	// 			description: '',
	// 			iconType: activeNodeActions.value.iconUrl ? 'file' : 'icon',
	// 			icon,
	// 			color: activeNodeActions.value.defaults.color,
	// 		},
	// 	};
	// });

	// function getCustomAPICallHintLocale(key: string) {
	// 	if (!isActionsActive.value) return '';

	// 	const nodeNameTitle = activeNodeActions.value?.displayName || '';
	// 	return instance?.proxy.$locale.baseText(`nodeCreator.actionsList.${key}` as BaseTextKey, {
	// 		interpolate: { nodeNameTitle },
	// 	});
	// }

	// function trackActionsView() {
	// 	const trigger_action_count = selectedNodeActions.value.filter((action) =>
	// 		action.name.toLowerCase().includes('trigger'),
	// 	).length;

	// 	const trackingPayload = {
	// 		app_identifier: activeNodeActions.value?.name,
	// 		actions: selectedNodeActions.value.map((action) => action.displayName),
	// 		regular_action_count: selectedNodeActions.value.length - trigger_action_count,
	// 		trigger_action_count,
	// 	};

	// 	$externalHooks().run('nodeCreateList.onViewActions', trackingPayload);
	// 	telemetry?.trackNodesPanel('nodeCreateList.onViewActions', trackingPayload);
	// }

	function onActionSelected(actionCreateElement: INodeCreateElement) {
		const action = (actionCreateElement.properties as IActionItemProps).nodeType;
		const actionUpdateData = getActionData(action);
		instance?.proxy.$emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionUpdateData.key));
		setAddedNodeActionParameters(actionUpdateData, telemetry);
	}

	return {
		actionsCategoryLocales,
		getPlaceholderTriggerActions,
		parseCategoryActions,
	};
};
