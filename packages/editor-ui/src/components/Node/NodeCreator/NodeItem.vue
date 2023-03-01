<template>
	<!-- Node Item is draggable only if it doesn't contain actions -->
	<n8n-node-creator-node
		:draggable="!showActionArrow"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
		@click.stop="onClick"
		:class="$style.nodeItem"
		:description="allowDescription ? description : ''"
		:title="displayName"
		:isTrigger="!allowActions && isTriggerNode"
		:show-action-arrow="showActionArrow"
	>
		<template #icon>
			<node-icon :nodeType="nodeType" />
		</template>

		<template #tooltip v-if="isCommunityNode">
			<p
				:class="$style.communityNodeIcon"
				v-html="
					$locale.baseText('generic.communityNode.tooltip', {
						interpolate: {
							packageName: nodeType.name.split('.')[0],
							docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
						},
					})
				"
				@click="onCommunityNodeTooltipClick"
			/>
		</template>
		<template #dragContent>
			<div :class="$style.draggableDataTransfer" ref="draggableDataTransfer" />
			<div :class="$style.draggable" :style="draggableStyle" v-show="dragging">
				<node-icon :nodeType="nodeType" @click.capture.stop :size="40" :shrink="false" />
			</div>
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import { reactive, computed, toRefs, getCurrentInstance } from 'vue';
import { INodeTypeDescription } from 'n8n-workflow';

import { getNewNodePosition, NODE_SIZE } from '@/utils/nodeViewUtils';
import { isCommunityPackageName } from '@/utils';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

import NodeIcon from '@/components/NodeIcon.vue';

export interface Props {
	nodeType: INodeTypeDescription;
	active?: boolean;
	allowActions?: boolean;
	allowDescription?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	active: false,
	allowActions: false,
	allowDescription: false,
});

const emit = defineEmits<{
	(event: 'dragstart', $e: DragEvent): void;
	(event: 'dragend', $e: DragEvent): void;
	(event: 'nodeTypeSelected', value: string[]): void;
	(event: 'actionsOpen', value: INodeTypeDescription): void;
}>();

const instance = getCurrentInstance();
const state = reactive({
	dragging: false,
	draggablePosition: {
		x: -100,
		y: -100,
	},
	draggableDataTransfer: null as Element | null,
});
const description = computed<string>(() => {
	return instance?.proxy.$locale.headerText({
		key: `headers.${shortNodeType.value}.description`,
		fallback: props.nodeType.description,
	}) as string;
});
const showActionArrow = computed(() => props.allowActions && hasActions.value);

const hasActions = computed<boolean>(() => (props.nodeType.actions?.length || 0) > 0);

const shortNodeType = computed<string>(
	() => instance?.proxy.$locale.shortNodeType(props.nodeType.name) || '',
);

const draggableStyle = computed<{ top: string; left: string }>(() => ({
	top: `${state.draggablePosition.y}px`,
	left: `${state.draggablePosition.x}px`,
}));

const isCommunityNode = computed<boolean>(() => isCommunityPackageName(props.nodeType.name));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayName = computed<any>(() => {
	const displayName = props.nodeType.displayName.trimEnd();

	return instance?.proxy.$locale.headerText({
		key: `headers.${shortNodeType}.displayName`,
		fallback: props.allowActions ? displayName.replace('Trigger', '') : displayName,
	});
});

const isTriggerNode = computed<boolean>(() =>
	props.nodeType.displayName.toLowerCase().includes('trigger'),
);

function onClick() {
	if (hasActions.value && props.allowActions) emit('actionsOpen', props.nodeType);
	else emit('nodeTypeSelected', [props.nodeType.name]);
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
			useNodeCreatorStore().getNodeTypesWithManualTrigger(props.nodeType.name).join(','),
		);
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
	document.body.removeEventListener('dragover', onDragOver);

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

defineExpose({
	onClick,
});
const { dragging, draggableDataTransfer } = toRefs(state);
</script>
<style lang="scss" module>
.nodeItem {
	--trigger-icon-background-color: #{$trigger-icon-background-color};
	--trigger-icon-border-color: #{$trigger-icon-border-color};
	margin-left: 15px;
	margin-right: 12px;
	user-select: none;
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
