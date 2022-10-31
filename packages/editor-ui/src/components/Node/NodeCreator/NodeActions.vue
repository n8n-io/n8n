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
			<template v-for="(action, index) in orderedActions">
				<div v-if="action.type === 'category'" :key="`${action.key} + ${index}`" :class="$style.category">
					<header :class="$style.categoryHeader" @click="toggleCategory(action.key)" v-if="actions.length > 1">
						<p v-text="action.title" :class="$style.categoryTitle" />
						<font-awesome-icon
							:class="$style.categoryArrow"
							:icon="!subtractedCategories.includes(action.key) ? 'chevron-up' : 'chevron-down'"
						/>
					</header>
					<ul :class="$style.categoryActions" v-show="!subtractedCategories.includes(action.key)">
						<li
							v-for="item in action.items"
							:key="`${action.key}_${item.key}`"
							:class="$style.categoryAction"
						>
							<button :class="$style.categoryActionButton" @click="onActionClick(item)">
								<node-icon :class="$style.nodeIcon" :nodeType="nodeType"/>
								<p v-text="item.title" />
								<trigger-icon v-if="isTriggerAction(item)" :class="$style.triggerIcon" />
							</button>
						</li>
					</ul>
				</div>
			</template>
		</main>
	</aside>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs, PropType } from 'vue';
import { IDataObject, INodeTypeDescription, INodeAction, INode } from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';
import TriggerIcon from '@/components/TriggerIcon.vue';
import SearchBar from './SearchBar.vue';

const emit = defineEmits(['actionSelected', 'back']);

const props = defineProps({
	nodeType: {
		type: Object as PropType<INodeTypeDescription>,
		required: true,
	},
	actions: {
		type: Array as PropType<INodeAction[]>,
		required: true,
	},
});

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

const isTriggerAction = (action: INodeAction) => action.nodeName?.toLowerCase().includes('trigger');

function toggleCategory(category: string) {
	if (state.subtractedCategories.includes(category)) {
		state.subtractedCategories = state.subtractedCategories.filter((item) => item !== category);
	} else {
		state.subtractedCategories.push(category);
	}
}

function onActionClick(actionItem: INodeAction) {
	const displayOptions = actionItem?.displayOptions ;

	const displayConditions = Object.keys(displayOptions?.show || {})
		.reduce((acc: IDataObject, showCondition: string) => {
			acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
			return acc;
		}, {});


	emit('actionSelected', {
		key: actionItem.nodeName,
		value: { ...actionItem.values , ...displayConditions},
	});
}

function onBack() {
	emit('back');
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
	padding-bottom: 3rem;
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
	font-weight: 600;
	line-height: 16px;

	display: flex;
	align-items: center;
	padding: 11px 15px;
}
.categoryHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.categoryAction {
	list-style: none;
	cursor: pointer;
}

.categoryActionButton {
	border: none;
	background: none;
	display: flex;
	align-items: center;
	text-align: left;
	position: relative;
	cursor: pointer;
	padding: 0;
	color: var(--color-text-dark);

	&:hover:before {
		content: "";
		position: absolute;
		right: calc(100% + var(--spacing-s) - 1px);
		top: 0;
		bottom: 0;
		width: 2px;
		// height: 10px;
		background: var(--color-primary);
	}
}
.categoryTitle {
	font-weight: 700;
	font-size: 11px;
	line-height: 11px;
	letter-spacing: 1px;
	text-transform: uppercase;
	// padding-top: 10px;
}
.categoryArrow {
	font-size: 12px;
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
	padding: 10px 0;
	cursor: pointer;
	display: flex;
	align-items: center;
}
.categoryActions {
	margin: 16px 0;
}
.category {
	&:not(:first-of-type) {
		// margin-top: 30px;
	}
}
.categoryAction {
	font-weight: 600;
	font-size: var(--font-size-s);
	line-height: 14px;
	color: var(--color-text-dark);
	display: flex;
	align-items: center;

	&:not(:last-child) {
		margin-bottom: 20px;
	}
}
.headerContent {
	display: flex;
	align-items: center;
	font-weight: 600;
	font-size: var(--font-size-m);
	line-height: 22px;

	color: var(--color-text-dark);
}
.triggerIcon {
	border: none;
	width: 20px;
	height: 20px;
}
.nodeIcon {
	margin-right: var(--spacing-s);
}
</style>
