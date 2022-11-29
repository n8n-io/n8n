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
			:placeholder="$locale.baseText('nodeCreator.actionsCategory.searchActions', { interpolate: { nodeNameTitle }})"
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
						<n8n-node-creator-node
							v-for="item in action.items"
							v-show="item.key !== CUSTOM_API_CALL_KEY"
							:key="`${action.key}_${item.key}`"
							@click="onActionClick(item)"
							@dragstart="$e => onDragStart($e, item)"
							@dragend="$emit('dragend')"
							draggable
							:class="$style.action"
							:title="item.title"
							:isTrigger="isTriggerAction(item)"
						>
							<template #icon>
								<node-icon :nodeType="nodeType" />
							</template>
						</n8n-node-creator-node>
					</ul>
				</div>

				<!-- Flat actions -->
				<n8n-node-creator-node
					v-else
					v-show="action.key !== CUSTOM_API_CALL_KEY"
					:key="`${action.key}__${action.title}`"
					@click="onActionClick(action)"
					@dragstart="$e => onDragStart($e, action)"
					@dragend="$emit('dragend')"
					draggable
					:class="$style.action"
					:title="action.title"
					:isTrigger="isTriggerAction(action)"
				>
					<template #icon>
						<node-icon :nodeType="nodeType" />
					</template>
				</n8n-node-creator-node>
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
import { reactive, computed, toRefs, getCurrentInstance, onUnmounted, onMounted } from 'vue';
import { IDataObject, INodeTypeDescription, INodeAction, INodeParameters, INodeTypeNameVersion } from 'n8n-workflow';
import { externalHooks } from '@/mixins/externalHooks';
import { IUpdateInformation } from '@/Interface';
import NodeIcon from '@/components/NodeIcon.vue';
import SearchBar from './SearchBar.vue';
import { sublimeSearch } from '@/utils';
import { CUSTOM_API_CALL_KEY, HTTP_REQUEST_NODE_TYPE } from '@/constants';
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
});

const nodeNameTitle = computed(() => props.nodeType?.displayName?.replace(' Trigger', ''));

const orderedActions = computed(() => {
	const recommendedTitle = instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.recommended');

	// Make sure recommended actions are always on top
	return [
		...props.actions.filter(action => action.title === recommendedTitle),
		...props.actions.filter(action => action.title !== recommendedTitle),
	];
});

const containsAPIAction = computed(() => {
	return props.actions
		.flatMap(action => action.items || [action])
		.some(action => action.key === CUSTOM_API_CALL_KEY);
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

const isTriggerAction = (action: INodeAction) => action.nodeName?.toLowerCase().includes('trigger');

async function fechNodeDetails() {
	const { getNodesInformation } = useNodeTypesStore();
	const { version, name } = props.nodeType;
	const payload = {
		name,
		version: Array.isArray(version) ? version.slice(-1)[0] : version,
	} as INodeTypeNameVersion;

	const details = await getNodesInformation([payload]);
	console.log("🚀 ~ file: NodeActions.vue:149 ~ fechNodeDetails ~ details", details);
}
fechNodeDetails();
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
onMounted(() => {
	trackView();
});

const { subtractedCategories, search } = toRefs(state);
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
