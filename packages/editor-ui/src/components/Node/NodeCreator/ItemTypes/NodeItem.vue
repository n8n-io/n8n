<template>
	<!-- Node Item is draggable only if it doesn't contain actions -->
	<n8n-node-creator-node
		:draggable="!showActionArrow"
		:class="$style.nodeItem"
		:description="description"
		:title="displayName"
		:show-action-arrow="showActionArrow"
		:is-trigger="isTrigger"
		:data-test-id="dataTestId"
		:tag="nodeType.tag"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
	>
		<template #icon>
			<div v-if="isSubNodeType" :class="$style.subNodeBackground"></div>
			<NodeIcon :class="$style.nodeIcon" :node-type="nodeType" />
		</template>

		<template v-if="isCommunityNode" #tooltip>
			<p
				:class="$style.communityNodeIcon"
				@click="onCommunityNodeTooltipClick"
				v-html="
					i18n.baseText('generic.communityNode.tooltip', {
						interpolate: {
							packageName: nodeType.name.split('.')[0],
							docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
						},
					})
				"
			/>
		</template>
		<template #dragContent>
			<div ref="draggableDataTransfer" :class="$style.draggableDataTransfer" />
			<div v-show="dragging" :class="$style.draggable" :style="draggableStyle">
				<NodeIcon :node-type="nodeType" :size="40" :shrink="false" @click.capture.stop />
			</div>
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SimplifiedNodeType } from '@/Interface';
import {
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
	CREDENTIAL_ONLY_NODE_PREFIX,
	DEFAULT_SUBCATEGORY,
	DRAG_EVENT_DATA_KEY,
} from '@/constants';

import { isCommunityPackageName } from '@/utils/nodeTypesUtils';
import { getNewNodePosition, NODE_SIZE } from '@/utils/nodeViewUtils';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import NodeIcon from '@/components/NodeIcon.vue';

import { useActions } from '../composables/useActions';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNodeType } from '@/composables/useNodeType';

export interface Props {
	nodeType: SimplifiedNodeType;
	subcategory?: string;
	active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	active: false,
	subcategory: undefined,
});

const i18n = useI18n();
const telemetry = useTelemetry();

const { actions } = useNodeCreatorStore();
const { getAddedNodesAndConnections } = useActions();
const { isSubNodeType } = useNodeType({
	nodeType: props.nodeType,
});

const dragging = ref(false);
const draggablePosition = ref({ x: -100, y: -100 });
const draggableDataTransfer = ref(null as Element | null);

const description = computed<string>(() => {
	if (
		props.subcategory === DEFAULT_SUBCATEGORY &&
		!props.nodeType.name.startsWith(CREDENTIAL_ONLY_NODE_PREFIX)
	) {
		return '';
	}

	return i18n.headerText({
		key: `headers.${shortNodeType.value}.description`,
		fallback: props.nodeType.description,
	});
});
const showActionArrow = computed(() => hasActions.value);
const dataTestId = computed(() =>
	hasActions.value ? 'node-creator-action-item' : 'node-creator-node-item',
);

const hasActions = computed(() => {
	return nodeActions.value.length > 1;
});

const nodeActions = computed(() => {
	return actions[props.nodeType.name] || [];
});

const shortNodeType = computed<string>(() => i18n.shortNodeType(props.nodeType.name) || '');

const draggableStyle = computed<{ top: string; left: string }>(() => ({
	top: `${draggablePosition.value.y}px`,
	left: `${draggablePosition.value.x}px`,
}));

const isCommunityNode = computed<boolean>(() => isCommunityPackageName(props.nodeType.name));

const displayName = computed<string>(() => {
	const trimmedDisplayName = props.nodeType.displayName.trimEnd();

	return i18n.headerText({
		key: `headers.${shortNodeType.value}.displayName`,
		fallback: hasActions.value ? trimmedDisplayName.replace('Trigger', '') : trimmedDisplayName,
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
			DRAG_EVENT_DATA_KEY,
			JSON.stringify(getAddedNodesAndConnections([{ type: props.nodeType.name }])),
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

function onDragEnd(): void {
	document.body.removeEventListener('dragover', onDragOver);

	dragging.value = false;
	setTimeout(() => {
		draggablePosition.value = { x: -100, y: -100 };
	}, 300);
}

function onCommunityNodeTooltipClick(event: MouseEvent) {
	if ((event.target as Element).localName === 'a') {
		telemetry.track('user clicked cnr docs link', { source: 'nodes panel node' });
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

.nodeIcon {
	z-index: 2;
}

.subNodeBackground {
	background-color: var(--node-type-supplemental-background);
	border-radius: 50%;
	height: 40px;
	position: absolute;
	transform: translate(-7px, -7px);
	width: 40px;
	z-index: 1;
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
