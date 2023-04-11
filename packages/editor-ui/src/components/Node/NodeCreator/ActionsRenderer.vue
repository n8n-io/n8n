<script setup lang="ts">
import {
	computed,
	onMounted,
	getCurrentInstance,
	DefineComponent,
	VNode,
	PropType,
	defineComponent,
} from 'vue';
import ItemsRenderer from './ItemsRenderer.vue';
import { INodeCreateElement, ActionTypeDescription, NodeFilterType } from '@/Interface';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';
import { useActions } from './composables/useActions';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { useViewStacks } from './composables/useViewStacks';
import { REGULAR_NODE_CREATOR_MODE } from '@/constants';

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});
const instance = getCurrentInstance();
const telemetry = instance?.proxy.$telemetry;

const { popViewStack, activeViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const { getNodeTypesWithManualTrigger, setAddedNodeActionParameters, getActionData } =
	useNodeCreatorStore();
const { getPlaceholderTriggerActions, parseCategoryActions, actionsCategoryLocales } = useActions();

// We only inject labels if search is empty
const parsedTriggerActions = computed(() =>
	parseCategoryActions(actions.value, actionsCategoryLocales.value.triggers, !search.value),
);
const parsedActionActions = computed(() =>
	parseCategoryActions(actions.value, actionsCategoryLocales.value.actions, !search.value),
);

// Because the placeholder items are inserted into the slots, we need to
// add the placeholder count to the category name manually
const triggerCategoryName = computed(() =>
	parsedTriggerActions.value.length || search.value
		? actionsCategoryLocales.value.triggers
		: `${actionsCategoryLocales.value.triggers} (${placeholderTriggerActions.length})`,
);

const actions = computed(() => useViewStacks().activeViewStack.items || []);
const search = computed(() => useViewStacks().activeViewStack.search);
const subcategory = computed(() => useViewStacks().activeViewStack.subcategory);
const rootView = computed(() => useViewStacks().activeViewStack.rootView);
const placeholderTriggerActions = getPlaceholderTriggerActions(subcategory.value || '');
const hasNoTriggerActions = computed(
	() =>
		parseCategoryActions(
			activeViewStack.baselineItems || [],
			actionsCategoryLocales.value.triggers,
			!search.value,
		).length === 0,
);

registerKeyHook('ActionsKeyRight', {
	keyboardKeys: ['ArrowRight', 'Enter'],
	condition: (type) => type === 'action',
	handler: onKeySelect,
});

registerKeyHook('ActionsKeyLeft', {
	keyboardKeys: ['ArrowLeft'],
	condition: (type) => type === 'action',
	handler: arrowLeft,
});

function arrowLeft() {
	popViewStack();
}

function onKeySelect(activeItemId: string) {
	const mergedActions = [...actions.value, ...placeholderTriggerActions];
	const activeAction = mergedActions.find((a) => a.uuid === activeItemId);

	if (activeAction) onSelected(activeAction);
}

function onSelected(actionCreateElement: INodeCreateElement) {
	const actionData = getActionData(actionCreateElement.properties as ActionTypeDescription);

	emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionData.key));
	setAddedNodeActionParameters(actionData, telemetry);
}

// Anonymous component to handle triggers and actions rendering order
const OrderSwitcher = defineComponent({
	props: {
		rootView: {
			type: String as PropType<NodeFilterType>,
		},
	},
	render(h): VNode {
		const triggers = this.$slots?.triggers?.[0];
		const actions = this.$slots?.actions?.[0];

		return h(
			'div',
			{},
			this.rootView === REGULAR_NODE_CREATOR_MODE ? [actions, triggers] : [triggers, actions],
		);
	},
});
</script>

<template>
	<div :class="$style.container">
		<OrderSwitcher :rootView="rootView">
			<template #triggers>
				<!-- Triggers Category -->
				<CategorizedItemsRenderer
					:elements="parsedTriggerActions"
					:category="triggerCategoryName"
					:mouseOverTooltip="$locale.baseText('nodeCreator.actionsTooltip.triggersStartWorkflow')"
					isTriggerCategory
					@selected="onSelected"
				>
					<!-- Permanent slot callout -->
					<template>
						<n8n-callout theme="info" iconless>
							<p v-html="$locale.baseText('nodeCreator.actionsCallout.triggersStartWorkflow')" />
						</n8n-callout>
					</template>
					<!-- Empty state -->
					<template #empty v-if="hasNoTriggerActions">
						<n8n-callout theme="warning" iconless>
							<p
								v-html="
									$locale.baseText('nodeCreator.actionsCallout.noTriggerItems', {
										interpolate: { nodeName: subcategory },
									})
								"
							/>
						</n8n-callout>
						<ItemsRenderer @selected="onSelected" :elements="placeholderTriggerActions" />
					</template>
				</CategorizedItemsRenderer>
			</template>
			<template #actions>
				<!-- Actions Category -->
				<CategorizedItemsRenderer
					:elements="parsedActionActions"
					:category="actionsCategoryLocales.actions"
					:mouseOverTooltip="$locale.baseText('nodeCreator.actionsTooltip.actionsPerformStep')"
					@selected="onSelected"
				>
					<template>
						<n8n-callout theme="warning" iconless>
							<p v-html="$locale.baseText('nodeCreator.actionsCallout.wfStartedAction')" />
						</n8n-callout>
					</template>
					<!-- Empty state -->
					<template #empty v-if="!search">
						<n8n-callout theme="custom">
							<p
								v-html="
									$locale.baseText('nodeCreator.actionsCallout.noActionItems', {
										interpolate: { nodeName: subcategory },
									})
								"
							/>
						</n8n-callout>
					</template>
				</CategorizedItemsRenderer>
			</template>
		</OrderSwitcher>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xl);
	& > [data-category-collapsed='true']:nth-child(1) {
		margin-bottom: calc(-1 * var(--spacing-xl));
	}
}
</style>
