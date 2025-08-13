<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type {
	INodeCreateElement,
	IUpdateInformation,
	ActionCreateElement,
	NodeCreateElement,
	NodeTypeSelectedPayload,
} from '@/Interface';
import {
	HTTP_REQUEST_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
	CUSTOM_API_CALL_KEY,
	OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE,
	OPEN_AI_NODE_TYPE,
} from '@/constants';

import { useUsersStore } from '@/stores/users.store';
import { useExternalHooks } from '@/composables/useExternalHooks';

import { useActions } from '../composables/useActions';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import { useViewStacks } from '../composables/useViewStacks';

import ItemsRenderer from '../Renderers/ItemsRenderer.vue';
import CategorizedItemsRenderer from '../Renderers/CategorizedItemsRenderer.vue';
import type { IDataObject } from 'n8n-workflow';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import OrderSwitcher from './../OrderSwitcher.vue';
import { getActiveViewCallouts, isNodePreviewKey } from '../utils';

import CommunityNodeInfo from '../Panel/CommunityNodeInfo.vue';
import CommunityNodeFooter from '../Panel/CommunityNodeFooter.vue';
import { useCalloutHelpers } from '@/composables/useCalloutHelpers';

const emit = defineEmits<{
	nodeTypeSelected: [value: NodeTypeSelectedPayload[]];
}>();
const telemetry = useTelemetry();
const i18n = useI18n();

const { userActivated, isInstanceOwner } = useUsersStore();
const { popViewStack, updateCurrentViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const {
	setAddedNodeActionParameters,
	getActionData,
	actionDataToNodeTypeSelectedPayload,
	getPlaceholderTriggerActions,
	parseCategoryActions,
	actionsCategoryLocales,
} = useActions();

const nodeCreatorStore = useNodeCreatorStore();
const calloutHelpers = useCalloutHelpers();

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

const communityNodeDetails = computed(() => useViewStacks().activeViewStack?.communityNodeDetails);

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

	return result;
});

const isTriggerRootView = computed(() => rootView.value === TRIGGER_NODE_CREATOR_VIEW);

const shouldShowTriggers = computed(() => {
	if (communityNodeDetails.value && !parsedTriggerActions.value.length) {
		// do not show baseline trigger actions for community nodes if it is not installed
		return (
			!isNodePreviewKey(useViewStacks().activeViewStack?.items?.[0].key) && isTriggerRootView.value
		);
	}
	return isTriggerRootView.value || parsedTriggerActionsBaseline.value.length !== 0;
});

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
	const activeAction = mergedActions.find((a): a is NodeCreateElement => a.uuid === activeItemId);

	if (activeAction) onSelected(activeAction);
}

function onSelected(actionCreateElement: INodeCreateElement) {
	if (actionCreateElement.type === 'openTemplate') {
		calloutHelpers.openSampleWorkflowTemplate(actionCreateElement.properties.templateId, {
			telemetry: {
				source: 'nodeCreator',
				section: useViewStacks().activeViewStack.title,
			},
		});
	}

	if (actionCreateElement.type !== 'action') return;

	const actionData = getActionData(actionCreateElement.properties);
	const isPlaceholderTriggerAction = placeholderTriggerActions.some(
		(p) => p.key === actionCreateElement.key,
	);

	if (isPlaceholderTriggerAction && isTriggerRootView.value) {
		const actionNode = actions.value[0]?.key;
		if (actionNode) emit('nodeTypeSelected', [{ type: actionData.key }, { type: actionNode }]);
	} else if (
		actionData?.key === OPEN_AI_NODE_TYPE &&
		(actionData?.value as IDataObject)?.resource === 'assistant' &&
		(actionData?.value as IDataObject)?.operation === 'message'
	) {
		emit('nodeTypeSelected', [{ type: OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE }]);
	} else if (isNodePreviewKey(actionData?.key)) {
		return;
	} else {
		const payload = actionDataToNodeTypeSelectedPayload(actionData);
		emit('nodeTypeSelected', [payload]);
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

	void useExternalHooks().run('nodeCreateList.onViewActions', trackingPayload);
	nodeCreatorStore.onViewActions(trackingPayload);
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

	emit('nodeTypeSelected', [{ type: HTTP_REQUEST_NODE_TYPE }]);
	if (telemetry) setAddedNodeActionParameters(updateData);

	const app_identifier = actions.value[0]?.key;
	if (!app_identifier) return;
	void useExternalHooks().run('nodeCreateList.onActionsCustmAPIClicked', {
		app_identifier,
	});
	nodeCreatorStore.onActionsCustomAPIClicked({ app_identifier });
}

onMounted(() => {
	trackActionsView();
});

const callouts = computed<INodeCreateElement[]>(() =>
	getActiveViewCallouts(
		useViewStacks().activeViewStack.title,
		calloutHelpers.isPreBuiltAgentsCalloutVisible.value,
		calloutHelpers.getPreBuiltAgentNodeCreatorItems(),
	),
);
</script>

<template>
	<div
		:class="{
			[$style.container]: true,
			[$style.containerPaddingBottom]: !communityNodeDetails,
		}"
	>
		<ItemsRenderer :elements="callouts" :class="$style.items" @selected="onSelected" />

		<CommunityNodeInfo v-if="communityNodeDetails" />
		<OrderSwitcher v-if="rootView" :root-view="rootView">
			<template v-if="shouldShowTriggers" #triggers>
				<!-- Triggers Category -->

				<CategorizedItemsRenderer
					v-memo="[search]"
					:elements="parsedTriggerActions"
					:category="triggerCategoryName"
					:mouse-over-tooltip="i18n.baseText('nodeCreator.actionsTooltip.triggersStartWorkflow')"
					is-trigger-category
					:expanded="isTriggerRootView || parsedActionActions.length === 0"
					@selected="onSelected"
				>
					<!-- Empty state -->
					<template v-if="hasNoTriggerActions" #empty>
						<n8n-callout
							v-if="hasNoTriggerActions"
							theme="info"
							iconless
							slim
							data-test-id="actions-panel-no-triggers-callout"
						>
							<span
								v-n8n-html="
									i18n.baseText('nodeCreator.actionsCallout.noTriggerItems', {
										interpolate: { nodeName: subcategory ?? '' },
									})
								"
							/>
						</n8n-callout>
						<ItemsRenderer :elements="placeholderTriggerActions" @selected="onSelected" />
					</template>
					<template v-else #empty>
						<p
							v-n8n-html="i18n.baseText('nodeCreator.actionsCategory.noMatchingTriggers')"
							:class="$style.resetSearch"
							@click="resetSearch"
						/>
					</template>
				</CategorizedItemsRenderer>
			</template>
			<template v-if="!isTriggerRootView || parsedActionActionsBaseline.length !== 0" #actions>
				<!-- Actions Category -->
				<CategorizedItemsRenderer
					v-memo="[search]"
					:elements="parsedActionActions"
					:category="actionsCategoryLocales.actions"
					:mouse-over-tooltip="i18n.baseText('nodeCreator.actionsTooltip.actionsPerformStep')"
					:expanded="!isTriggerRootView || parsedTriggerActions.length === 0"
					@selected="onSelected"
				>
					<n8n-callout
						v-if="!userActivated && isTriggerRootView"
						theme="info"
						iconless
						slim
						data-test-id="actions-panel-activation-callout"
					>
						<span v-n8n-html="i18n.baseText('nodeCreator.actionsCallout.triggersStartWorkflow')" />
					</n8n-callout>
					<!-- Empty state -->
					<template #empty>
						<n8n-info-tip v-if="!search" theme="info" type="note" :class="$style.actionsEmpty">
							<span
								v-n8n-html="
									i18n.baseText('nodeCreator.actionsCallout.noActionItems', {
										interpolate: { nodeName: subcategory ?? '' },
									})
								"
							/>
						</n8n-info-tip>
						<p
							v-else
							v-n8n-html="i18n.baseText('nodeCreator.actionsCategory.noMatchingActions')"
							:class="$style.resetSearch"
							data-test-id="actions-panel-no-matching-actions"
							@click="resetSearch"
						/>
					</template>
				</CategorizedItemsRenderer>
			</template>
		</OrderSwitcher>
		<div v-if="containsAPIAction && !communityNodeDetails" :class="$style.apiHint">
			<span
				v-n8n-html="
					i18n.baseText('nodeCreator.actionsList.apiCall', {
						interpolate: { node: subcategory ?? '' },
					})
				"
				@click.prevent="addHttpNode"
			/>
		</div>
		<CommunityNodeFooter
			v-if="communityNodeDetails"
			:class="$style.communityNodeFooter"
			:package-name="communityNodeDetails.packageName"
			:show-manage="communityNodeDetails.installed && isInstanceOwner"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.containerPaddingBottom {
	padding-bottom: var(--spacing-3xl);
}

.communityNodeFooter {
	margin-top: auto;
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
