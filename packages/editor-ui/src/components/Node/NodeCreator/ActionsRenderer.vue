<script setup lang="ts">
import ItemsRenderer from './ItemsRenderer.vue';
import { INodeCreateElement, LabelCreateElement } from '@/Interface';
import CategorizedItemsRenderer from './CategorizedItemsRenderer.vue';
import { useActions } from './composables/useActions';
import { computed } from 'vue';

export interface Props {
	actions: INodeCreateElement[];
	rootView: 'trigger' | 'action';
	search: string;
	subcategory: string;
}
const props = withDefaults(defineProps<Props>(), {
	search: '',
});

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
</script>

<template>
	<div :class="{ [$style.container]: true, [$style.reversed]: rootView === 'action' }">
		<!-- Triggers Category -->
		<CategorizedItemsRenderer
			:elements="parsedTriggerActions"
			:category="triggerCategoryName"
			isTriggerCategory
			v-on="$listeners"
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
				<ItemsRenderer :elements="placeholderTriggerActions" v-on="$listeners" />
			</template>
		</CategorizedItemsRenderer>

		<!-- Actions Category -->
		<CategorizedItemsRenderer
			:elements="parsedActionActions"
			:category="actionsCategoryLocales.actions"
			v-on="$listeners"
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
