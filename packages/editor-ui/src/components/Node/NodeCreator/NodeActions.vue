<template>
	<aside :class="$style.nodeActions" v-if="nodeType">
		<header :class="$style.header">
			<button :class="$style.backButton" @click.stop="onBack">
				<font-awesome-icon :class="$style.backIcon" icon="arrow-left" size="2x" />
			</button>
			<p :class="$style.headerContent">
				<node-icon :class="$style.nodeIcon" :nodeType="nodeType" :size="16" :shrink="false" />
				<span v-text="nodeNameTitle" />
			</p>
		</header>
		<search-bar
			v-model="search"
			class="ignore-key-press"
			:class="$style.search"
			:placeholder="`Search ${nodeNameTitle} Actions...`"
		/>
		<main :class="$style.content">
			<template v-for="action in filteredActions">
				<!-- Categorised actions -->
				<div v-if="action.type === 'category'" :key="`${action.key} + ${action.title}`" :class="$style.category">
					<header :class="$style.categoryHeader" @click="toggleCategory(action.key)" v-if="actions.length > 1">
						<p v-text="action.title" :class="$style.categoryTitle" />
						<font-awesome-icon
							:class="$style.categoryArrow"
							:icon="!subtractedCategories.includes(action.key) ? 'chevron-up' : 'chevron-down'"
						/>
					</header>
					<ul :class="$style.categoryActions" v-show="!subtractedCategories.includes(action.key)">
						<node-action
							v-for="item in action.items"
							:key="`${action.key}_${item.key}`"
							:action="item"
							:nodeType="nodeType"
							@click="onActionClick(item)"

							@dragstart="$e => onDragStart($e, item)"
							@dragend="$emit('dragend')"
						/>
					</ul>
				</div>

				<!-- Flat actions -->
				<node-action
					v-else
					:key="`${action.key}__${action.title}`"
					:action="action"
					:nodeType="nodeType"
					@click="onActionClick(action)"

					@dragstart="$e => onDragStart($e, action)"
					@dragend="$emit('dragend')"
				/>
			</template>
		</main>
	</aside>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs } from 'vue';
import { IDataObject, INodeTypeDescription, INodeAction } from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';
import SearchBar from './SearchBar.vue';
import NodeAction from './NodeAction.vue';
import { sublimeSearch } from './sortUtils';

export interface Props {
	nodeType: INodeTypeDescription,
	actions: INodeAction[],
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'actionSelected', action: { key: string, value: IDataObject }): void,
	(event: 'back'): void,
	(event: 'dragstart', $e: DragEvent): void,
	(event: 'dragend', $e: DragEvent): void,
}>();

const state = reactive({
	subtractedCategories: [] as string[],
	search: '',
});

const nodeNameTitle = computed(() => props.nodeType?.displayName?.replace(' Trigger', ''));

const orderedActions = computed(() => {
	const recommendedTitle = 'Recommended';
	return [
		...props.actions.filter(action => action.title === recommendedTitle),
		...props.actions.filter(action => action.title !== recommendedTitle),
	];
});

const filteredActions = computed(() => {
	if(state.search.length === 0) return orderedActions.value;


	const flattenActions = orderedActions.value.flatMap(actionCategory => actionCategory.items) || [];
	const matchedActions = sublimeSearch<INodeAction>(
		state.search, flattenActions as INodeAction[],
		[{key: 'title', weight: 1}],
	);

	return matchedActions.map(({item}) => item);
});



function toggleCategory(category: string) {
	if (state.subtractedCategories.includes(category)) {
		state.subtractedCategories = state.subtractedCategories.filter((item) => item !== category);
	} else {
		state.subtractedCategories.push(category);
	}
}

function getActionData(actionItem: INodeAction) {
	const displayOptions = actionItem?.displayOptions ;

	const displayConditions = Object.keys(displayOptions?.show || {})
		.reduce((acc: IDataObject, showCondition: string) => {
			acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
			return acc;
		}, {});


	return {
		key: actionItem.nodeName as string,
		value: { ...actionItem.values , ...displayConditions},
	};
}

function onActionClick(actionItem: INodeAction) {
	emit('actionSelected', getActionData(actionItem));
}

function onBack() {
	emit('back');
}

function onDragStart(event: DragEvent, action: INodeAction) {
	event.dataTransfer?.setData('actionData', JSON.stringify(getActionData(action)));
	emit('dragstart', event);
}

function onDragEnd(event: DragEvent) {
	event.dataTransfer?.setData('text/plain', 'drag');
}
const { subtractedCategories, search } = toRefs(state);
</script>

<style lang="scss" module>
.nodeActions {
	border: $node-creator-border-color solid 1px;
	z-index: 1;
	display: flex;
	flex-direction: column;
	height: 100%;
	background: white;
	position: absolute;
	left: 0;
	right: 0;

	--search-margin: 0;
}
.content {
	height: 100%;
	padding: var(--spacing-s);
	padding-top: 1px;
	overflow-y: auto;
	overflow-x: visible;
	padding-bottom: var(--spacing-2xl);
	scrollbar-width: none;

	&::-webkit-scrollbar {
    display: none;
	}
}
.search {
	margin: var(--spacing-s);
}
.header {
	border-bottom: $node-creator-border-color solid 1px;
	height: 50px;
	background-color: $node-creator-subcategory-panel-header-bacground-color;

	font-size: var(--font-size-l);
	font-weight: var(-font-weight-bold);
	line-height: var(--font-line-height-compact);

	display: flex;
	align-items: center;
	padding: 11px 15px;
}
.categoryHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.categoryTitle {
	font-weight: 700;
	font-size: 11px;
	line-height: 11px;
	letter-spacing: 1px;
	text-transform: uppercase;
}
.categoryArrow {
	font-size: var(--font-size-2xs);
	width: 12px;
	color: $node-creator-arrow-color;
}
.backButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: var(--spacing-s) 0;
}

.backIcon {
	color: $node-creator-arrow-color;
	height: 16px;
	margin-right: var(--spacing-s);
	padding: 0;
}
.categoryHeader {
	border-bottom: 1px solid $node-creator-border-color;
	padding: var(--spacing-xs) 0;
	cursor: pointer;
	display: flex;
	align-items: center;
}
.categoryActions {
	margin: var(--spacing-xs) 0;
}
.headerContent {
	display: flex;
	align-items: center;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-loose);

	color: var(--color-text-dark);
}
.nodeIcon {
	margin-right: var(--spacing-s);
}
</style>
