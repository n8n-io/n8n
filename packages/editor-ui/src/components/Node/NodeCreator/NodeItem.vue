<template>
	<div
		draggable
		@dragstart="onDragStart"
		@dragend="onDragEnd"
		@click.stop="onClick"
		:class="$style.nodeItem"
	>
		<node-icon :class="$style['node-icon']" :nodeType="nodeType" />
		<div>
			<div :class="$style.details">
				<span :class="$style.name">
					{{ $locale.headerText({
							key: `headers.${shortNodeType}.displayName`,
							fallback: nodeType.displayName.replace('Trigger', ''),
						})
					}}
				</span>
				<n8n-tooltip v-if="isCommunityNode" placement="top" >
					<div
						:class="$style['communityNodeIcon']"
						slot="content"
						v-html="$locale.baseText('generic.communityNode.tooltip', { interpolate: { packageName: nodeType.name.split('.')[0], docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL } })"
						@click="onCommunityNodeTooltipClick"
					>
					</div>
					<n8n-icon icon="cube" />
				</n8n-tooltip>
			</div>
			<div :class="$style.description" v-if="!simpleStyle">
				{{ $locale.headerText({
						key: `headers.${shortNodeType}.description`,
						fallback: nodeType.description,
					})
				}}
			</div>

			<div :class="$style.draggableDataTransfer" ref="draggableDataTransfer" />
			<transition name="node-item-transition">
				<div
					:class="$style.draggable"
					:style="draggableStyle"
					v-show="dragging"
				>
					<node-icon class="node-icon" :nodeType="nodeType" :size="40" :shrink="false" />
				</div>
			</transition>
		</div>
		<node-actions
			:class="$style.actions"
			v-if="allowActions && nodeType.actions && showActions"
			:nodeType="nodeType"
			:actions="nodeType.actions"
			@actionSelected="onActionSelected"
			@back="showActions = false"

			@dragstart="onDragStart"
			@dragend="onDragEnd"
		/>
		<div :class="{[$style.actionIcon]: true, [$style.visible]: allowActions && hasActions}" >
			<font-awesome-icon :class="$style.actionArrow" icon="arrow-right" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs, getCurrentInstance } from 'vue';
import { INodeTypeDescription, IDataObject } from 'n8n-workflow';

import { getNewNodePosition, NODE_SIZE } from '@/views/canvasHelpers';
import { isCommunityPackageName } from '@/components/helpers';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import { IUpdateInformation } from '@/Interface';

import NodeIcon from '@/components/NodeIcon.vue';
import NodeActions from './NodeActions.vue';
import { useWorkflowsStore } from '@/stores/workflows';


export interface Props {
	nodeType: INodeTypeDescription;
	active?: boolean;
	simpleStyle?: boolean;
	hideDescription?: boolean;
	allowActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	active: false,
	simpleStyle: false,
	hideDescription: false,
	allowActions: false,
});

const emit = defineEmits<{
	(event: 'dragstart', $e: DragEvent): void,
	(event: 'dragend', $e: DragEvent): void,
	(event: 'nodeTypeSelected', value: string[]): void,
}>();

const instance = getCurrentInstance();
const { workflowTriggerNodes, $onAction: onWorkflowStoreAction } = useWorkflowsStore();

const state = reactive({
	dragging: false,
	showActions: false,
	draggablePosition: {
		x: -100,
		y: -100,
	},
	draggableDataTransfer: null as Element | null,
});

const hasActions = computed<boolean>(() => (props.nodeType.actions?.length || 0) > 0);

const shortNodeType = computed<string>(() => instance?.proxy.$locale.shortNodeType(props.nodeType.name) || '');

const draggableStyle = computed<{ top: string; left: string; }>(() => ({
	top: `${state.draggablePosition.y}px`,
	left: `${state.draggablePosition.x}px`,
}));

const isCommunityNode = computed<boolean>(() => isCommunityPackageName(props.nodeType.name));

function onClick() {
	if(hasActions.value && props.allowActions) state.showActions = true;
	else emit('nodeTypeSelected', [props.nodeType.name]);
}

function getActionNodeTypes(action: IUpdateInformation): string[] {
	const actionKey = action.key as string;
	const isTriggerAction = actionKey.toLocaleLowerCase().includes('trigger');
	const workflowContainsTrigger = workflowTriggerNodes.length > 0;

	const nodeTypes = !isTriggerAction && !workflowContainsTrigger
		? [MANUAL_TRIGGER_NODE_TYPE, actionKey]
		: [actionKey];

	return nodeTypes;
}

function setAddedNodeActionParameters(action: IUpdateInformation) {
	onWorkflowStoreAction(({ name, after, store: { setLastNodeParameters } }) => {
		if (name !== 'addNode') return;
		after(() => setLastNodeParameters(action));
	});
}

function onActionSelected(action: IUpdateInformation) {
	emit('nodeTypeSelected', getActionNodeTypes(action));
	setAddedNodeActionParameters(action);
}
function onDragActionSelected(action: IUpdateInformation) {
	setAddedNodeActionParameters(action);
}
function onDragStart(event: DragEvent): void {
	/**
	 * Workaround for firefox, that doesn't attach the pageX and pageY coordinates to "ondrag" event.
	 * All browsers attach the correct page coordinates to the "dragover" event.
	 * @bug https://bugzilla.mozilla.org/show_bug.cgi?id=505521
	 */
	document.body.addEventListener("dragover", onDragOver);

	const { pageX: x, pageY: y } = event;

	emit('dragstart', event);

	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = "copy";
		event.dataTransfer.dropEffect = "copy";
		event.dataTransfer.setDragImage(state.draggableDataTransfer as Element, 0, 0);
		event.dataTransfer.setData('nodeTypeName', props.nodeType.name);

		const actionData = event.dataTransfer.getData('actionData');
		if(actionData) {
			try {
				const action = JSON.parse(actionData) as IDataObject;

				event.dataTransfer.setData('nodeTypeName', getActionNodeTypes(action).join(','));
				document.body.addEventListener("dragend", () => onDragActionSelected(action));
			} catch (error) {
				// Fail silently
			}
		}
	}

	state.dragging = true;
	state.draggablePosition = { x, y };
}

function onDragOver(event: DragEvent): void {
	if (!state.dragging || event.pageX === 0 && event.pageY === 0) {
		return;
	}

	const [x,y] = getNewNodePosition([], [event.pageX - NODE_SIZE / 2, event.pageY - NODE_SIZE / 2]);

	state.draggablePosition = { x, y };
}

function onDragEnd(event: DragEvent): void {
	document.body.removeEventListener("dragover", onDragOver);

	emit('dragend', event);

	state.dragging = false;
	setTimeout(() => {
		state.draggablePosition = { x: -100, y: -100 };
	}, 300);
}

function onCommunityNodeTooltipClick(event: MouseEvent) {
	if ((event.target as Element).localName === 'a') {
		instance?.proxy.$telemetry.track('user clicked cnr docs link', { source: 'nodes panel node' });
	}
}

const { showActions, dragging, draggableDataTransfer } = toRefs(state);
</script>

<style lang="scss" module>
.actions {
	position: absolute;
	top: 0;
	z-index: 1;
}

.actionIcon {
	opacity: 0;
	flex-grow: 1;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-left: 8px;
	color: var(--color-text-lighter);

	&.visible {
		opacity: 1;
	}
}
.nodeItem:hover .actionIcon {
	color: var(--color-text-light)
}
.actionArrow {
	font-size: 12px;
	width: 12px;
}
.nodeItem {
	padding: 11px 8px 11px 0;
	margin-left: 15px;
	margin-right: 12px;
	display: flex;
	cursor: grab;
	align-items: center;
}

.details {
	align-items: center;
}

.node-icon {
	min-width: 26px;
	max-width: 26px;
	margin-right: 15px;
}

.name {
	font-weight: var(--font-weight-bold);
	font-size: 14px;
	line-height: 18px;
	margin-right: 5px;
}

.packageName {
	margin-right: 5px;
}

.description {
	margin-top: 2px;
	font-size: var(--font-size-2xs);
	line-height: 16px;
	font-weight: 400;
	color: $node-creator-description-color;
}

.trigger-icon {
	height: 16px;
	width: 16px;
	display: inline-block;
	margin-right: var(--spacing-3xs);
	vertical-align: middle;
}

.communityNodeIcon {
	vertical-align: top;
}

.draggable {
	width: 100px;
	height: 100px;
	position: fixed;
	z-index: 1;
	opacity: 0.66;
	border: 2px solid var(--color-foreground-xdark);
	border-radius: var(--border-radius-large);
	background-color: var(--color-background-xlight);
	display: flex;
	justify-content: center;
	align-items: center;
}

.draggableDataTransfer {
	width: 1px;
	height: 1px;
}
</style>

<style lang="scss" scoped>
.nodeItem-transition {
	&-enter-active,
	&-leave-active {
		transition-property: opacity, transform;
		transition-duration: 300ms;
		transition-timing-function: ease;
	}

	&-enter,
	&-leave-to {
		opacity: 0;
		transform: scale(0);
	}
}

.el-tooltip svg {
	color: var(--color-foreground-xdark);
}
</style>
