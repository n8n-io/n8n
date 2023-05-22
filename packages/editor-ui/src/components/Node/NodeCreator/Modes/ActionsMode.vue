<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, defineComponent } from 'vue';
import type { VNode, PropType } from 'vue';
import type {
	INodeCreateElement,
	ActionTypeDescription,
	NodeFilterType,
	IUpdateInformation,
	ActionCreateElement,
} from '@/Interface';
import {
	HTTP_REQUEST_NODE_TYPE,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
	CUSTOM_API_CALL_KEY,
	AUTO_INSERT_ACTION_EXPERIMENT,
} from '@/constants';

import { usePostHog } from '@/stores/posthog.store';
import { useUsersStore } from '@/stores/users.store';
import { useWebhooksStore } from '@/stores/webhooks.store';
import { runExternalHook } from '@/utils';

import { useActions } from '../composables/useActions';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import { useViewStacks } from '../composables/useViewStacks';

import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});
const instance = getCurrentInstance();
const telemetry = instance?.proxy.$telemetry;

const { userActivated } = useUsersStore();
const { popViewStack, updateCurrentViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const {
	getNodeTypesWithManualTrigger,
	setAddedNodeActionParameters,
	getActionData,
	getPlaceholderTriggerActions,
	parseCategoryActions,
	actionsCategoryLocales,
} = useActions();

// We only inject labels if search is empty
const parsedTriggerActions = computed(() =>
	parseActions(actions.value, actionsCategoryLocales.value.triggers, false),
);
const parsedActionActions = computed(() =>
	parseActions(actions.value, actionsCategoryLocales.value.actions, !search.value),
);
const parsedTriggerActionsBaseline = computed(() =>
	parseActions(
		useViewStacks().activeViewStack.baselineItems || [],
		actionsCategoryLocales.value.triggers,
		false,
	),
);
const parsedActionActionsBaseline = computed(() =>
	parseActions(
		useViewStacks().activeViewStack.baselineItems || [],
		actionsCategoryLocales.value.actions,
		!search.value,
	),
);

// Because the placeholder items are inserted into the slots, we need to
// add the placeholder count to the category name manually
const triggerCategoryName = computed(() =>
	parsedTriggerActions.value.length || search.value
		? actionsCategoryLocales.value.triggers
		: `${actionsCategoryLocales.value.triggers} (${placeholderTriggerActions.length})`,
);

const actions = computed(() => {
	return (useViewStacks().activeViewStack.items || []).filter(
		(p) => (p as ActionCreateElement).properties.actionKey !== CUSTOM_API_CALL_KEY,
	);
});

const search = computed(() => useViewStacks().activeViewStack.search);

const subcategory = computed(() => useViewStacks().activeViewStack.subcategory);

const rootView = computed(() => useViewStacks().activeViewStack.rootView);

const placeholderTriggerActions = getPlaceholderTriggerActions(subcategory.value || '');

const hasNoTriggerActions = computed(
	() =>
		parseCategoryActions(
			useViewStacks().activeViewStack.baselineItems || [],
			actionsCategoryLocales.value.triggers,
			!search.value,
		).length === 0,
);

const containsAPIAction = computed(() => {
	const actions = useViewStacks().activeViewStack.baselineItems || [];

	const result = actions.some((p) => {
		return ((p as ActionCreateElement).properties.actionKey ?? '') === CUSTOM_API_CALL_KEY;
	});

	return result === true;
});

const isTriggerRootView = computed(() => rootView.value === TRIGGER_NODE_CREATOR_VIEW);

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

function parseActions(base: INodeCreateElement[], locale: string, withLabels = false) {
	return parseCategoryActions(base, locale, withLabels);
}

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
	const isPlaceholderTriggerAction = placeholderTriggerActions.some(
		(p) => p.key === actionCreateElement.key,
	);
	const includeNodeWithPlaceholderTrigger = usePostHog().isVariantEnabled(
		AUTO_INSERT_ACTION_EXPERIMENT.name,
		AUTO_INSERT_ACTION_EXPERIMENT.variant,
	);

	if (includeNodeWithPlaceholderTrigger && isPlaceholderTriggerAction && isTriggerRootView) {
		const actionNode = actions.value[0].key;

		emit('nodeTypeSelected', [actionData.key as string, actionNode]);
	} else {
		emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionData.key));
	}

	if (telemetry) setAddedNodeActionParameters(actionData, telemetry, rootView.value);
}

function trackActionsView() {
	const activeViewStack = useViewStacks().activeViewStack;

	const trigger_action_count = (activeViewStack.baselineItems || [])?.filter((action) =>
		action.key.toLowerCase().includes('trigger'),
	).length;

	const appIdentifier = [...actions.value, ...placeholderTriggerActions][0].key;

	const trackingPayload = {
		app_identifier: appIdentifier,
		actions: (activeViewStack.baselineItems || [])?.map(
			(action) => (action as ActionCreateElement).properties.displayName,
		),
		regular_action_count: (activeViewStack.baselineItems || [])?.length - trigger_action_count,
		trigger_action_count,
	};

	void runExternalHook('nodeCreateList.onViewActions', useWebhooksStore(), trackingPayload);
	telemetry?.trackNodesPanel('nodeCreateList.onViewActions', trackingPayload);
}

function resetSearch() {
	updateCurrentViewStack({ search: '' });
}

function addHttpNode() {
	const updateData = {
		name: '',
		key: HTTP_REQUEST_NODE_TYPE,
		value: {
			authentication: 'predefinedCredentialType',
		},
	} as IUpdateInformation;

	emit('nodeTypeSelected', [HTTP_REQUEST_NODE_TYPE]);
	if (telemetry) setAddedNodeActionParameters(updateData);

	const app_identifier = actions.value[0].key;
	void runExternalHook('nodeCreateList.onActionsCustmAPIClicked', useWebhooksStore(), {
		app_identifier,
	});
	telemetry?.trackNodesPanel('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
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
			this.rootView === REGULAR_NODE_CREATOR_VIEW ? [actions, triggers] : [triggers, actions],
		);
	},
});

onMounted(() => {
	trackActionsView();
});
</script>

<template>
	<div :class="$style.container">
		<OrderSwitcher :rootView="rootView">
			<template #triggers v-if="isTriggerRootView || parsedTriggerActionsBaseline.length !== 0">
				<!-- Triggers Category -->
				<CategorizedItemsRenderer
					:elements="parsedTriggerActions"
					:category="triggerCategoryName"
					:mouseOverTooltip="$locale.baseText('nodeCreator.actionsTooltip.triggersStartWorkflow')"
					isTriggerCategory
					:expanded="isTriggerRootView || parsedActionActions.length === 0"
					@selected="onSelected"
				>
					<!-- Empty state -->
					<template #empty>
						<template v-if="hasNoTriggerActions">
							<n8n-callout
								theme="info"
								iconless
								slim
								data-test-id="actions-panel-no-triggers-callout"
							>
								<span
									v-html="
										$locale.baseText('nodeCreator.actionsCallout.noTriggerItems', {
											interpolate: { nodeName: subcategory },
										})
									"
								/>
							</n8n-callout>
							<ItemsRenderer @selected="onSelected" :elements="placeholderTriggerActions" />
						</template>

						<template v-else>
							<p
								:class="$style.resetSearch"
								v-html="$locale.baseText('nodeCreator.actionsCategory.noMatchingTriggers')"
								@click="resetSearch"
							/>
						</template>
					</template>
				</CategorizedItemsRenderer>
			</template>
			<template #actions v-if="!isTriggerRootView || parsedActionActionsBaseline.length !== 0">
				<!-- Actions Category -->
				<CategorizedItemsRenderer
					:elements="parsedActionActions"
					:category="actionsCategoryLocales.actions"
					:mouseOverTooltip="$locale.baseText('nodeCreator.actionsTooltip.actionsPerformStep')"
					:expanded="!isTriggerRootView || parsedTriggerActions.length === 0"
					@selected="onSelected"
				>
					<template>
						<n8n-callout
							theme="info"
							iconless
							v-if="!userActivated && isTriggerRootView"
							slim
							data-test-id="actions-panel-activation-callout"
						>
							<span v-html="$locale.baseText('nodeCreator.actionsCallout.triggersStartWorkflow')" />
						</n8n-callout>
					</template>
					<!-- Empty state -->
					<template #empty>
						<n8n-info-tip theme="info" type="note" v-if="!search" :class="$style.actionsEmpty">
							<span
								v-html="
									$locale.baseText('nodeCreator.actionsCallout.noActionItems', {
										interpolate: { nodeName: subcategory },
									})
								"
							/>
						</n8n-info-tip>
						<template v-else>
							<p
								:class="$style.resetSearch"
								v-html="$locale.baseText('nodeCreator.actionsCategory.noMatchingActions')"
								@click="resetSearch"
								data-test-id="actions-panel-no-matching-actions"
							/>
						</template>
					</template>
				</CategorizedItemsRenderer>
			</template>
		</OrderSwitcher>
		<div :class="$style.apiHint" v-if="containsAPIAction">
			<span
				@click.prevent="addHttpNode"
				v-html="
					$locale.baseText('nodeCreator.actionsList.apiCall', {
						interpolate: { node: subcategory },
					})
				"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing-3xl);
}

.resetSearch {
	cursor: pointer;
	line-height: var(--font-line-height-regular);
	font-weight: var(--font-weight-regular);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-2xs) var(--spacing-s) 0;
	color: var(--color-text-base);

	i {
		font-weight: var(--font-weight-bold);
		font-style: normal;
		text-decoration: underline;
	}
}
.actionsEmpty {
	padding: var(--spacing-2xs) var(--spacing-xs) var(--spacing-s);
	font-weight: var(--font-weight-regular);

	strong {
		font-weight: var(--font-weight-bold);
	}
}
.apiHint {
	padding: 0 var(--spacing-s) var(--spacing-xl);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	line-height: var(--font-line-height-regular);
	z-index: 1;
}
</style>
