<template>
	<aside :class="$style.nodeActions" v-if="nodeType" @keydown.capture="onKeyDown" tabindex="1">
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
			:class="$style.search"
			:placeholder="$locale.baseText('nodeCreator.actionsCategory.searchActions', { interpolate: { nodeNameTitle }})"
		/>
		<main :class="$style.content" ref="contentRef">
			<template v-for="action in filteredActions">
				<div v-if="action.type === 'category'" :key="`${action.key} + ${action.title}`">
					<header
						:class="{
							[$style.categoryHeader]: true,
							[$style.active]: activeCategoryAction.action === '' && activeCategoryAction.category === action.key
						}"
						@click="toggleCategory(action.key)"
						v-if="filteredActions.length > 1"
					>
						<p v-text="action.title" :class="$style.categoryTitle" />
						<font-awesome-icon
							:class="$style.categoryArrow"
							:icon="!subtractedCategories.includes(action.key) ? 'chevron-up' : 'chevron-down'"
						/>
					</header>
					<ul :class="$style.categoryActions" v-show="!subtractedCategories.includes(action.key)">
						<n8n-node-creator-node
							v-for="item in action.items"
							:key="`${action.key}_${item.title.replace(/\s/g, '')}`"
							@click="onActionClick(item)"
							@dragstart="$e => onDragStart($e, item)"
							@dragend="$emit('dragend')"
							draggable
							:class="{
								[$style.action]: true,
								[$style.active]: activeCategoryAction.action === item.title && activeCategoryAction.category === action.key
							}"
							:title="item.title"
							:isTrigger="isTriggerAction(item)"
						>
							<template #icon>
								<node-icon :nodeType="nodeType" />
							</template>
						</n8n-node-creator-node>
					</ul>
				</div>
			</template>
			<footer
				v-if="containsAPIAction"
				:class="$style.apiHint"
				@click.stop="addHttpNode"
				v-html="$locale.baseText('nodeCreator.actionsList.apiCall', { interpolate: { nodeNameTitle }})"
			/>
		</main>
	</aside>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs, getCurrentInstance, onMounted, watch, ref, nextTick } from 'vue';
import { IDataObject, INodeTypeDescription, INodeAction, INodeParameters, INodeTypeNameVersion } from 'n8n-workflow';
import { externalHooks } from '@/mixins/externalHooks';
import { IUpdateInformation } from '@/Interface';
import NodeIcon from '@/components/NodeIcon.vue';
import SearchBar from './SearchBar.vue';
import { sublimeSearch } from '@/utils';
import { CUSTOM_API_CALL_KEY, CUSTOM_API_CALL_NAME, HTTP_REQUEST_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes';
export interface Props {
	nodeType: INodeTypeDescription,
	actions: INodeAction[],
}

const props = defineProps<Props>();
const instance = getCurrentInstance();
const { $externalHooks } = new externalHooks();

const emit = defineEmits<{
	(event: 'actionSelected', action: IUpdateInformation): void,
	(event: 'back'): void,
	(event: 'dragstart', $e: DragEvent): void,
	(event: 'dragend', $e: DragEvent): void,
}>();

const state = reactive({
	subtractedCategories: [] as string[],
	search: '',
	latestNodeData: null as INodeTypeDescription | null,
	activeCategoryAction: {
		category: '',
		action: '',
	},
});
const contentRef = ref<HTMLElement | null>(null);
const nodeNameTitle = computed(() => props.nodeType?.displayName?.replace(' Trigger', ''));

const orderedActions = computed(() => {
	const recommendedTitle = instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.recommended');

	// Make sure recommended actions are always on top
	return [
		...props.actions.filter(action => action.title === recommendedTitle),
		...props.actions.filter(action => action.title !== recommendedTitle),
	];
});

const containsAPIAction = computed(() => state.latestNodeData?.properties.some((p) => p.options?.find((o) => o.name === CUSTOM_API_CALL_NAME)) === true);

const filteredActions = computed(() => {
	if(state.search.length === 0) return orderedActions.value;

	const flattenActions = orderedActions.value.flatMap(actionCategory => actionCategory.items) || [];
	const matchedActions = sublimeSearch<INodeAction>(
		state.search, flattenActions as INodeAction[],
		[{key: 'title', weight: 1}],
	);

	return [{
		items: matchedActions.map(({item}) => item),
		key: 'filtered_actions',
		type: 'category',
	}] as INodeAction[];
});

const activeCategoryIndex = computed(() => filteredActions.value.findIndex((category) => category.key === state.activeCategoryAction.category));
const activeCategory = computed(() => filteredActions.value[activeCategoryIndex.value]);
const activeActionIndex = computed(() => filteredActions.value[activeCategoryIndex.value].items?.findIndex((action) => action.title === state.activeCategoryAction.action) ?? -1);
const activeAction = computed(() => filteredActions.value[activeCategoryIndex.value]?.items?.[activeActionIndex.value]);
const isTriggerAction = (action: INodeAction) => action.nodeName?.toLowerCase().includes('trigger');

// The nodes.json doesn't contain API CALL option so we need to fetch the node detail
// to determine if need to render the API CALL hint
async function fechNodeDetails() {
	const { getNodesInformation } = useNodeTypesStore();
	const { version, name } = props.nodeType;
	const payload = {
		name,
		version: Array.isArray(version) ? version?.slice(-1)[0] : version,
	} as INodeTypeNameVersion;

	const nodesInfo = await getNodesInformation([payload], false);

	state.latestNodeData = nodesInfo[0];
}

// Set previous action as active unless it's the first action
// then only set the previous category as active
function setPreviousActionActive() {
	const previousActionIndex = activeActionIndex.value - 1;
	const isFirstActionInCategory = activeActionIndex.value === 0;
	const previousCategory = filteredActions.value[activeCategoryIndex.value - 1];
	const isCategory = state.activeCategoryAction.action === '' && state.activeCategoryAction.category !== '';
	const isFirstItem = activeCategoryIndex.value === 0;

	if(isFirstItem && isCategory) return;

	if(isFirstActionInCategory) {
		state.activeCategoryAction.action = '';
		return;
	}

	if(isCategory) {
		state.activeCategoryAction.category = previousCategory.key;
		state.activeCategoryAction.action = state.subtractedCategories.includes(previousCategory.key)
			? ''
			: previousCategory.items?.slice(-1)[0].title ?? '';
		return;
	}

	state.activeCategoryAction.action = activeCategory.value.items?.[previousActionIndex].title ?? '';
}
function onKeyDown(e: KeyboardEvent) {
	// We only want to propagate 'Escape' as it closes the node-creator and
  // 'Tab' which toggles it
  if (!['Escape', 'Tab'].includes(e.key)) e.stopPropagation();

	const actions = filteredActions.value;
	const isSingleCategory = actions.length === 1;
	const nextCategory = actions[activeCategoryIndex.value + 1];
	const isSubstractedCategory = state.subtractedCategories.includes(state.activeCategoryAction.category);
	const previousCategory = actions[activeCategoryIndex.value - 1];
	const isCategory = state.activeCategoryAction.action === '' && state.activeCategoryAction.category !== '';
	const isCategoryOpen = !state.subtractedCategories.includes(state.activeCategoryAction.category);

	// If key is arrowd down
	if (e.key === 'ArrowDown') {
		if(isSubstractedCategory) {
			state.activeCategoryAction.category = nextCategory.key || state.activeCategoryAction.category;
			state.activeCategoryAction.action = '';
			return;
		}
		const nextAction = activeCategory.value
		? activeCategory.value.items?.[activeActionIndex.value + 1]
		: actions[activeCategoryIndex.value + 1];

		const isLastActionInCategory = activeActionIndex.value === (activeCategory.value.items ?? []).length - 1;
		if(isLastActionInCategory) {
			if(!nextCategory) return;
			state.activeCategoryAction.category = actions[activeCategoryIndex.value + 1]?.key;
			state.activeCategoryAction.action = '';
			return;
		}
		if (nextAction) {
			state.activeCategoryAction.action = nextAction.title;
			return;
		}

		const nextCategoryFirstAction = nextCategory?.items?.[0];

		if (nextCategoryFirstAction) {
			state.activeCategoryAction.category = nextCategory.key;
			state.activeCategoryAction.action = nextCategoryFirstAction.title;
		}
	}

	if (e.key === 'ArrowUp') {
		setPreviousActionActive();
		// const firstNonSubstractedCategory = actions.slice(0, activeCategoryIndex.value).findLast((category) => !state.subtractedCategories.includes(category.key));
		// const previousAction = activeCategory
		// 	? activeCategory.value.items?.[activeActionIndex.value - 1]
		// 	: actions[activeCategoryIndex.value + 1];

		// const isFirstActionInCategory = activeActionIndex.value === 0;

		// if(isCategory) {
		// 	state.activeCategoryAction.category = previousCategory.key;
		// 	state.activeCategoryAction.action = '';
		// 	return;
		// }
		// if(isSubstractedCategory) {
		// 	state.activeCategoryAction.category = previousCategory?.key || state.activeCategoryAction.category;
		// 	state.activeCategoryAction.action = '';
		// 	return;
		// }
		// if(isFirstActionInCategory) {
		// 	state.activeCategoryAction.category = state.activeCategoryAction.category;
		// 	state.activeCategoryAction.action = isSingleCategory ? state.activeCategoryAction.action : '';
		// 	return;
		// }
		// if (previousAction) {
		// 	state.activeCategoryAction.action = previousAction.key;
		// 	return;
		// }

		// const previousCategoryLastAction = previousCategory?.items?.[previousCategory.items.length - 1];

		// if (previousCategoryLastAction) {
		// 	state.activeCategoryAction.category = previousCategory.key;
		// 	state.activeCategoryAction.action = previousCategoryLastAction.key;
		// }
	}


	if(e.key === 'ArrowRight') {
		if(isCategory) {
			if(isSingleCategory || isCategoryOpen) return;
			toggleCategory(state.activeCategoryAction.category);
			return;
		}
		if(activeAction.value) onActionClick(activeAction.value);
	}

	if(e.key === 'ArrowLeft') {
		if(isCategory && !isSingleCategory && isCategoryOpen) {
			toggleCategory(state.activeCategoryAction.category);
			return;
		}

		onBack();
	}
}

function toggleCategory(category: string) {
	if (state.subtractedCategories.includes(category)) {
		state.subtractedCategories = state.subtractedCategories.filter((item) => item !== category);
	} else {
		state.subtractedCategories.push(category);
	}
}

function getActionData(actionItem: INodeAction): IUpdateInformation {
	const displayOptions = actionItem?.displayOptions ;

	const displayConditions = Object.keys(displayOptions?.show || {})
		.reduce((acc: IDataObject, showCondition: string) => {
			acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
			return acc;
		}, {});

	return {
		name: actionItem.title,
		key: actionItem.nodeName as string,
		value: { ...actionItem.values , ...displayConditions} as INodeParameters,
	};
}

function addHttpNode() {
	emit('actionSelected', {
		name: '',
		key: HTTP_REQUEST_NODE_TYPE,
		value: {
			authentication: "predefinedCredentialType",
		} as INodeParameters,
	});

	const app_identifier = props.nodeType.name;
	$externalHooks().run('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
	instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
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

function trackView() {
	const flatActions = props.actions
		.flatMap(action => action.items as INodeAction[])
		.filter(action => action.key !== CUSTOM_API_CALL_KEY);

	const trigger_action_count = flatActions.filter((action) => isTriggerAction(action)).length;
	const trackingPayload = {
		app_identifier: props.nodeType.name,
		actions: flatActions.map(action => action.key),
		trigger_action_count,
		regular_action_count: flatActions.length - trigger_action_count,
	};

	$externalHooks().run('nodeCreateList.onViewActions', trackingPayload);
	instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onViewActions', trackingPayload);
}

function setFirstActive() {
	const firstCategory = filteredActions.value.find((action) => action.type === 'category');
	state.activeCategoryAction.category = firstCategory?.key || '';
	state.activeCategoryAction.action = (firstCategory?.items || filteredActions.value)[0]?.title || '';
}

fechNodeDetails();
watch(() => state.search, setFirstActive);
watch(() => `${state.activeCategoryAction.category} ${state.activeCategoryAction.action}`, () => nextTick(() => {
	// Active element could be both category header and action item so we
	// query DOM directly instead of keeping refs of both
	contentRef.value?.querySelector('[class*=active]')?.scrollIntoView({ block: 'end' });
}));
onMounted(() => {
	trackView();
	setFirstActive();
});

const { subtractedCategories, search, activeCategoryAction } = toRefs(state);
</script>

<style lang="scss" module>
.nodeActions {
	border: $node-creator-border-color solid 1px;
	border-top: none;
	z-index: 1;
	display: flex;
	flex-direction: column;
	height: 100%;
	background: white;
	position: absolute;
	left: 0;
	right: 0;
	cursor: default;

	--search-margin: 0;
}

.action {
	position: relative;
	&:hover:before {
		content: "";
		position: absolute;
		right: calc(100% + var(--spacing-s) - 1px);
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-text-light);
	}

}
.active {
	position: relative;
	&::before {
		content: "";
		height: 100%;
		left: calc(var(--spacing-s) * -1);
		border-left: 2px solid $color-primary;
		position: absolute;
	}
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
.categoryTitle {
	font-weight: var(--font-weight-bold);
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
	padding: 10px 0;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: space-between;
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

.apiHint {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	padding-top: var(--spacing-s);
	line-height: var(--font-line-height-regular);
	border-top: 1px solid #DBDFE7;
	z-index: 1;
	// Prevent double borders when the last category is collapsed
	margin-top: -1px;
}
</style>
