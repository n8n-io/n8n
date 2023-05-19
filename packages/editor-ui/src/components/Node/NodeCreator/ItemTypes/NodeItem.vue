<template>
	<!-- Node Item is draggable only if it doesn't contain actions -->
	<n8n-node-creator-node
		:draggable="!showActionArrow"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
		:class="$style.nodeItem"
		:description="subcategory !== DEFAULT_SUBCATEGORY ? description : ''"
		:title="displayName"
		:show-action-arrow="showActionArrow"
		:is-trigger="isTrigger"
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
import { computed, ref, getCurrentInstance } from 'vue';
import type { SimplifiedNodeType } from '@/Interface';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL, DEFAULT_SUBCATEGORY } from '@/constants';

import { isCommunityPackageName } from '@/utils';
import { getNewNodePosition, NODE_SIZE } from '@/utils/nodeViewUtils';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import NodeIcon from '@/components/NodeIcon.vue';

import { useActions } from '../composables/useActions';

export interface Props {
	nodeType: SimplifiedNodeType;
	subcategory?: string;
	active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	active: false,
});

const { actions } = useNodeCreatorStore();
const { getNodeTypesWithManualTrigger } = useActions();
const instance = getCurrentInstance();

const dragging = ref(false);
const draggablePosition = ref({ x: -100, y: -100 });
const draggableDataTransfer = ref(null as Element | null);

const description = computed<string>(() => {
	return instance?.proxy.$locale.headerText({
		key: `headers.${shortNodeType.value}.description`,
		fallback: props.nodeType.description,
	}) as string;
});
const showActionArrow = computed(() => hasActions.value);

const hasActions = computed(() => {
	return nodeActions.value.length > 1;
});

const nodeActions = computed(() => {
	const nodeActions = actions[props.nodeType.name] || [];
	return nodeActions;
});

const shortNodeType = computed<string>(
	() => instance?.proxy.$locale.shortNodeType(props.nodeType.name) || '',
);

const draggableStyle = computed<{ top: string; left: string }>(() => ({
	top: `${draggablePosition.value.y}px`,
	left: `${draggablePosition.value.x}px`,
}));

const isCommunityNode = computed<boolean>(() => isCommunityPackageName(props.nodeType.name));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayName = computed<any>(() => {
	const displayName = props.nodeType.displayName.trimEnd();

	return instance?.proxy.$locale.headerText({
		key: `headers.${shortNodeType.value}.displayName`,
		fallback: hasActions.value ? displayName.replace('Trigger', '') : displayName,
	});
});

const isTrigger = computed<boolean>(() => {
	return props.nodeType.group.includes('trigger') && !hasActions.value;
});
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
		event.dataTransfer.setDragImage(draggableDataTransfer.value as Element, 0, 0);
		event.dataTransfer.setData(
			'nodeTypeName',
			getNodeTypesWithManualTrigger(props.nodeType.name).join(','),
		);
	}

	dragging.value = true;
	draggablePosition.value = { x, y };
}

function onDragOver(event: DragEvent): void {
	if (!dragging.value || (event.pageX === 0 && event.pageY === 0)) {
		return;
	}

	const [x, y] = getNewNodePosition([], [event.pageX - NODE_SIZE / 2, event.pageY - NODE_SIZE / 2]);

	draggablePosition.value = { x, y };
}

function onDragEnd(event: DragEvent): void {
	document.body.removeEventListener('dragover', onDragOver);

	dragging.value = false;
	setTimeout(() => {
		draggablePosition.value = { x: -100, y: -100 };
	}, 300);
}

function onCommunityNodeTooltipClick(event: MouseEvent) {
	if ((event.target as Element).localName === 'a') {
		instance?.proxy.$telemetry.track('user clicked cnr docs link', { source: 'nodes panel node' });
	}
}
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
