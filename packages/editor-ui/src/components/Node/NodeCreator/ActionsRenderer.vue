<script setup lang="ts">
import { computed, onMounted, getCurrentInstance } from 'vue';
import ItemsRenderer from './ItemsRenderer.vue';
import { INodeCreateElement, ActionTypeDescription } from '@/Interface';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';
import { useActions } from './composables/useActions';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { useKeyboardNavigation } from './composables/useKeyboardNavigation';
import { useViewStacks } from './composables/useViewStacks';
export interface Props {
	actions: INodeCreateElement[];
	rootView: 'trigger' | 'action';
	search: string;
	subcategory: string;
}
const props = withDefaults(defineProps<Props>(), {
	search: '',
});

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});
const instance = getCurrentInstance();
const telemetry = instance?.proxy.$telemetry;

const { popViewStack } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const { getNodeTypesWithManualTrigger, setAddedNodeActionParameters, getActionData } =
	useNodeCreatorStore();
const { getPlaceholderTriggerActions, parseCategoryActions, actionsCategoryLocales } = useActions();
const placeholderTriggerActions = getPlaceholderTriggerActions(props.subcategory);

// We only inject labels if search is empty
const parsedTriggerActions = computed(() =>
	parseCategoryActions(props.actions, actionsCategoryLocales.value.triggers, !props.search),
);
const parsedActionActions = computed(() =>
	parseCategoryActions(props.actions, actionsCategoryLocales.value.actions, !props.search),
);

// Because the placeholder items are inserted into the slots, we need to
// add the placeholder count to the category name manually
const triggerCategoryName = computed(() =>
	parsedTriggerActions.value.length || props.search
		? actionsCategoryLocales.value.triggers
		: `${actionsCategoryLocales.value.triggers} (${placeholderTriggerActions.length})`,
);

registerKeyHook('ActionsKeyRight', {
	keyboardKey: 'ArrowRight',
	condition: ({ type, activeItemId }) => type === 'action',
	handler: arrowRight,
});

registerKeyHook('ActionsKeyLeft', {
	keyboardKey: 'ArrowLeft',
	condition: ({ type, activeItemId }) => type === 'action',
	handler: arrowLeft,
});

function arrowLeft() {
	popViewStack();
}

function arrowRight({ activeItemId }) {
	const mergedActions = [...props.actions, ...placeholderTriggerActions];
	const activeAction = mergedActions.find((a) => a.uuid === activeItemId);
	if (activeAction) onSelected(activeAction);
}

function onSelected(actionCreateElement: INodeCreateElement) {
	const actionData = getActionData(actionCreateElement.properties as ActionTypeDescription);
	emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionData.key));
	setAddedNodeActionParameters(actionData, telemetry);
}
</script>

<template>
	<div :class="{ [$style.container]: true, [$style.reversed]: rootView === 'action' }">
		<!-- Triggers Category -->
		<CategorizedItemsRenderer
			:elements="parsedTriggerActions"
			:category="triggerCategoryName"
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
			<template #empty v-if="!search">
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

		<!-- Actions Category -->
		<CategorizedItemsRenderer
			:elements="parsedActionActions"
			:category="actionsCategoryLocales.actions"
			@selected="onSelected"
		>
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
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
	&.reversed {
		flex-direction: column-reverse;
		& > [data-category-collapsed='true'] {
			margin-bottom: calc(-1 * var(--spacing-l));
		}
	}
	& > [data-category-collapsed='true']:nth-child(1) {
		margin-bottom: calc(-1 * var(--spacing-l));
	}
}
</style>
