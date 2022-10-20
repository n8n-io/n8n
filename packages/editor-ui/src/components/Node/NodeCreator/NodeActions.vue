<template>
	<aside :class="$style.nodeActions" v-if="nodeType">
		<header :class="$style.header">
			<button :class="$style.backButton" @click="$emit('back')">
				<font-awesome-icon :class="$style.backIcon" icon="arrow-left" size="2x" />
			</button>
			<p :class="$style.headerContent">
				<node-icon :class="$style.nodeIcon" :nodeType="nodeType" :size="16" :shrink="false" />
				<span v-text="nodeNameTitle" />
			</p>
		</header>
		<main :class="$style.content">
			<search-bar
				v-model="search"
				:placeholder="`Search ${nodeNameTitle} Actions...`"
			/>
			<template v-for="action in actions">
				<div v-if="action.type === 'category'" :key="action.key" :class="$style.category">
					<header :class="$style.categoryHeader" @click="toggleCategory(action.key)">
						<p v-text="action.title" :class="$style.categoryTitle" />
						<font-awesome-icon
							:class="$style.categoryArrow"
							:icon="!subtractedCategories.includes(action.key) ? 'chevron-up' : 'chevron-down'"
						/>
					</header>
					<ul :class="$style.categoryActions" v-show="!subtractedCategories.includes(action.key)">
						<li
							v-for="actionItem in action.actions"
							:key="actionItem.key"
							:class="$style.categoryAction"
						>
							<p v-text="actionItem.title" />
							<trigger-icon :class="$style.triggerIcon" />
						</li>
					</ul>
				</div>
			</template>
		</main>
	</aside>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs } from 'vue';
import { INodeTypeDescription } from 'n8n-workflow';

import { store } from '@/store';
import NodeIcon from '@/components/NodeIcon.vue';
import TriggerIcon from '@/components/TriggerIcon.vue';
import SearchBar from './SearchBar.vue';

const actions = [
	{
		key: 'recommened',
		title: 'Recommended',
		type: 'category',
		actions: [
			{
				key: 'event_created',
				title: 'When Event Created',
			},
			{
				key: 'event_ended',
				title: 'When Event Created',
			},
			{
				key: 'event_started',
				title: 'When Event Started',
			},
			{
				key: 'event_updated',
				title: 'When Event Updated',
			},
		],
	}, {
		key: 'event',
		title: 'Event',
		type: 'category',
		actions: [
			{
				key: 'get_many_events',
				title: 'Get Many Events',
				description: "Retrieve many events from a calendar",
			},
		],
	},
];

const props = defineProps({
	nodeTypeName: {
		type: String,
		required: true,
	},
});

const state = reactive({
	nodeType: {} as INodeTypeDescription,
	subtractedCategories: [] as string[],
	search: '',
});

const nodeNameTitle = computed(() => state.nodeType?.displayName?.replace(' Trigger', ''));

function toggleCategory(category: string) {
	if (state.subtractedCategories.includes(category)) {
		state.subtractedCategories = state.subtractedCategories.filter((item) => item !== category);
	} else {
		state.subtractedCategories.push(category);
	}
	console.log("🚀 ~ file: NodeActions.vue ~ line 99 ~ toggleCategory ~ state.subtractedCategories", state.subtractedCategories);
}

async function loadData() {
	state.nodeType = (
		await store.dispatch('nodeTypes/getNodesInformation', [{
			name: props.nodeTypeName,
			version: 1.0,
		}]) as INodeTypeDescription[]
	)[0];
}

loadData();
const { nodeType, subtractedCategories, search } = toRefs(state);
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
}
.header {
	border-bottom: $node-creator-border-color solid 1px;
	height: 54px;
	background-color: $node-creator-subcategory-panel-header-bacground-color;

	font-size: 18px;
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

.categoryTitle {
	font-weight: 700;
	font-size: 11px;
	line-height: 11px;
	letter-spacing: 1px;
	text-transform: uppercase;
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
	border-bottom: 1px solid #DBDFE7;
	padding-bottom: 12px;
	cursor: pointer;
}
.categoryActions {
	padding-top: 16px;
}
.category {
	&:not(:first-of-type) {
		margin-top: 30px;
	}
}
.categoryAction {
	font-weight: 600;
	font-size: 14px;
	line-height: 14px;
	color: #555555;
	display: flex;
	align-items: center;

	&:not(:last-child) {
		margin-bottom: 20px;
	}
}
.headerContent {
	display: flex;
	align-items: center;
}
.triggerIcon {
	border: none;
	width: 20px;
	height: 20px;
}
.nodeIcon {
	margin-right: var(--spacing-2xs);
}
</style>
