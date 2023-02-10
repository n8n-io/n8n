<template>
	<n8n-node-creator-node
		:key="`${action.actionKey}_${action.displayName}`"
		@click="onActionClick(action)"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
		draggable
		:class="$style.action"
		:title="action.displayName"
		:isTrigger="isTriggerAction(action)"
	>
		<template #dragContent>
			<div :class="$style.draggableDataTransfer" ref="draggableDataTransfer" />
			<div :class="$style.draggable" :style="draggableStyle" v-show="dragging">
				<node-icon :nodeType="nodeType" @click.capture.stop :size="40" :shrink="false" />
			</div>
		</template>
		<template #icon>
			<node-icon :nodeType="action" />
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs, getCurrentInstance } from 'vue';
import { INodeTypeDescription, INodeActionTypeDescription } from 'n8n-workflow';
import { getNewNodePosition, NODE_SIZE } from '@/utils/nodeViewUtils';
import { IUpdateInformation } from '@/Interface';
import NodeIcon from '@/components/NodeIcon.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

export interface Props {
	nodeType: INodeTypeDescription;
	action: INodeActionTypeDescription;
}

const props = defineProps<Props>();
const instance = getCurrentInstance();
const telemetry = instance?.proxy.$telemetry;
const { getActionData, getNodeTypesWithManualTrigger, setAddedNodeActionParameters } =
	useNodeCreatorStore();

const state = reactive({
	dragging: false,
	draggablePosition: {
		x: -100,
		y: -100,
	},
	storeWatcher: null as Function | null,
	draggableDataTransfer: null as Element | null,
});
const emit = defineEmits<{
	(event: 'actionSelected', action: IUpdateInformation): void;
	(event: 'dragstart', $e: DragEvent): void;
	(event: 'dragend', $e: DragEvent): void;
}>();

const draggableStyle = computed<{ top: string; left: string }>(() => ({
	top: `${state.draggablePosition.y}px`,
	left: `${state.draggablePosition.x}px`,
}));

const actionData = computed(() => getActionData(props.action));

const isTriggerAction = (action: INodeActionTypeDescription) =>
	action.name?.toLowerCase().includes('trigger');
function onActionClick(actionItem: INodeActionTypeDescription) {
	emit('actionSelected', getActionData(actionItem));
}

function onDragStart(event: DragEvent): void {
	/**
	 * Workaround for firefox, that doesn't attach the pageX and pageY coordinates to "ondrag" event.
	 * All browsers attach the correct page coordinates to the "dragover" event.
	 * @bug https://bugzilla.mozilla.org/show_bug.cgi?id=505521
	 */
	document.body.addEventListener('dragover', onDragOver);
	const { pageX: x, pageY: y } = event;
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'copy';
		event.dataTransfer.dropEffect = 'copy';
		event.dataTransfer.setDragImage(state.draggableDataTransfer as Element, 0, 0);
		event.dataTransfer.setData(
			'nodeTypeName',
			getNodeTypesWithManualTrigger(actionData.value?.key).join(','),
		);

		state.storeWatcher = setAddedNodeActionParameters(actionData.value, telemetry);
		document.body.addEventListener('dragend', onDragEnd);
	}

	state.dragging = true;
	state.draggablePosition = { x, y };
	emit('dragstart', event);
}

function onDragOver(event: DragEvent): void {
	if (!state.dragging || (event.pageX === 0 && event.pageY === 0)) {
		return;
	}

	const [x, y] = getNewNodePosition([], [event.pageX - NODE_SIZE / 2, event.pageY - NODE_SIZE / 2]);

	state.draggablePosition = { x, y };
}

function onDragEnd(event: DragEvent): void {
	if (state.storeWatcher) state.storeWatcher();
	document.body.removeEventListener('dragend', onDragEnd);
	document.body.removeEventListener('dragover', onDragOver);

	emit('dragend', event);

	state.dragging = false;
	setTimeout(() => {
		state.draggablePosition = { x: -100, y: -100 };
	}, 300);
}
const { draggableDataTransfer, dragging } = toRefs(state);
</script>

<style lang="scss" module>
.action {
	margin-left: 15px;
	margin-right: 12px;

	--trigger-icon-background-color: #{$trigger-icon-background-color};
	--trigger-icon-border-color: #{$trigger-icon-border-color};
}
.nodeIcon {
	margin-right: var(--spacing-s);
}

.apiHint {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	padding-top: var(--spacing-s);
	line-height: var(--font-line-height-regular);
	border-top: 1px solid #dbdfe7;
	z-index: 1;
	// Prevent double borders when the last category is collapsed
	margin-top: -1px;
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
