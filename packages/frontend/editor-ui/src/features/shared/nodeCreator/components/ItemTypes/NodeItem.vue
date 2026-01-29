<script setup lang="ts">
import type { SimplifiedNodeType } from '@/Interface';
import {
	CREDENTIAL_ONLY_NODE_PREFIX,
	DEFAULT_SUBCATEGORY,
	DRAG_EVENT_DATA_KEY,
	HITL_SUBCATEGORY,
	HUMAN_IN_THE_LOOP_CATEGORY,
} from '@/app/constants';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL } from '@/features/settings/communityNodes/communityNodes.constants';
import { computed, ref } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { isCommunityPackageName } from 'n8n-workflow';
import OfficialIcon from 'virtual:icons/mdi/verified';

import { useNodeType } from '@/app/composables/useNodeType';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useI18n } from '@n8n/i18n';
import { useActions } from '../../composables/useActions';
import { useViewStacks } from '../../composables/useViewStacks';
import {
	isNodePreviewKey,
	removePreviewToken,
	shouldShowCommunityNodeDetails,
} from '../../nodeCreator.utils';
import { NODE_ACCESS_REQUEST_MODAL_KEY } from '@/features/settings/nodeGovernance/nodeGovernance.constants';
import { useNodeGovernanceStore } from '@/features/settings/nodeGovernance/nodeGovernance.store';

import { N8nIcon, N8nNodeCreatorNode, N8nTooltip } from '@n8n/design-system';
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
const { activeViewStack } = useViewStacks();
const { isSubNodeType } = useNodeType({
	nodeType: props.nodeType,
});
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const emit = defineEmits<{
	requestAccess: [nodeType: string];
}>();

const dragging = ref(false);

// Node Governance - check props first, then fallback to store lookup
const isBlocked = computed(() => {
	const governanceStatus = props.nodeType.governance?.status;
	if (governanceStatus !== undefined) {
		return governanceStatus === 'blocked';
	}
	// Fallback to store lookup for category views where governance might not be augmented
	const storeStatus = nodeGovernanceStore.getGovernanceForNode(props.nodeType.name);
	return storeStatus?.status === 'blocked';
});
const isPendingRequest = computed(() => {
	const governanceStatus = props.nodeType.governance?.status;
	if (governanceStatus !== undefined) {
		return governanceStatus === 'pending_request';
	}
	// Fallback to store lookup for category views where governance might not be augmented
	const storeStatus = nodeGovernanceStore.getGovernanceForNode(props.nodeType.name);
	return storeStatus?.status === 'pending_request';
});
const governanceStatus = computed(() => {
	const governanceStatus = props.nodeType.governance?.status;
	if (governanceStatus !== undefined) {
		return governanceStatus;
	}
	// Fallback to store lookup for category views where governance might not be augmented
	const storeStatus = nodeGovernanceStore.getGovernanceForNode(props.nodeType.name);
	return storeStatus?.status ?? 'allowed';
});
const draggablePosition = ref({ x: -100, y: -100 });
const draggableDataTransfer = ref(null as Element | null);

const description = computed<string>(() => {
	if (isCommunityNodePreview.value) {
		return props.nodeType.description;
	}
	if (isSendAndWaitCategory.value) {
		return '';
	}
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

const showActionArrow = computed(() => {
	if (shouldShowCommunityNodeDetails(isCommunityNode.value, activeViewStack)) {
		return true;
	}

	return hasActions.value && !isSendAndWaitCategory.value;
});
const isSendAndWaitCategory = computed(
	() =>
		activeViewStack.subcategory === HITL_SUBCATEGORY ||
		activeViewStack.rootView === HUMAN_IN_THE_LOOP_CATEGORY,
);
const dataTestId = computed(() =>
	hasActions.value ? 'node-creator-action-item' : 'node-creator-node-item',
);

const hasActions = computed(() => {
	return nodeActions.value.length > 1 && !activeViewStack.hideActions;
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
const isCommunityNodePreview = computed<boolean>(() => isNodePreviewKey(props.nodeType.name));

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

const communityNodeType = computed(() => {
	return nodeTypesStore.communityNodeType(removePreviewToken(props.nodeType.name));
});

const isOfficial = computed(() => {
	return communityNodeType.value?.isOfficialNode ?? false;
});

const author = computed(() => {
	return communityNodeType.value?.displayName ?? displayName.value;
});

const tag = computed(() => {
	// Show governance status as tag
	if (isBlocked.value) {
		return { text: i18n.baseText('nodeCreator.nodeItem.blocked'), type: 'danger' };
	}
	if (isPendingRequest.value) {
		return { text: i18n.baseText('nodeCreator.nodeItem.pendingRequest'), type: 'warning' };
	}
	if (props.nodeType.tag) {
		return props.nodeType.tag;
	}
	if (description.value.toLowerCase().includes('deprecated')) {
		return { text: i18n.baseText('nodeCreator.nodeItem.deprecated'), type: 'info' };
	}
	return undefined;
});

function onRequestAccess() {
	uiStore.openModalWithData({
		name: NODE_ACCESS_REQUEST_MODAL_KEY,
		data: { nodeType: props.nodeType.name, displayName: props.nodeType.displayName },
	});
}

function onDragStart(event: DragEvent): void {
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
}

function onDragEnd(): void {
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

<template>
	<!-- Node Item is draggable only if it doesn't contain actions and is not blocked -->
	<N8nNodeCreatorNode
		:draggable="!showActionArrow && !isBlocked && !isPendingRequest"
		:class="[$style.nodeItem, { [$style.blocked]: isBlocked || isPendingRequest }]"
		:description="description"
		:title="displayName"
		:show-action-arrow="showActionArrow && !isBlocked && !isPendingRequest"
		:is-trigger="isTrigger"
		:is-official="isOfficial"
		:data-test-id="dataTestId"
		:tag="tag"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
	>
		<template #icon>
			<div v-if="isSubNodeType" :class="$style.subNodeBackground"></div>
			<div :class="{ [$style.iconWrapper]: true, [$style.dimmed]: isBlocked || isPendingRequest }">
				<NodeIcon
					:class="$style.nodeIcon"
					:node-type="nodeType"
					color-default="var(--color--foreground--shade-2)"
				/>
				<N8nIcon v-if="isBlocked" icon="lock" size="small" :class="$style.lockIcon" />
			</div>
		</template>

		<template v-if="isBlocked" #afterTitle>
			<button :class="$style.requestAccessLink" @click.stop="onRequestAccess">
				{{ i18n.baseText('nodeCreator.nodeItem.requestAccess') }}
			</button>
		</template>

		<template v-if="isOfficial" #extraDetails>
			<N8nTooltip placement="top" :show-after="500">
				<template #content>
					{{ i18n.baseText('generic.officialNode.tooltip', { interpolate: { author: author } }) }}
				</template>
				<OfficialIcon :class="[$style.icon, $style.official]" />
			</N8nTooltip>
		</template>

		<template
			v-else-if="
				isCommunityNode && !isCommunityNodePreview && !activeViewStack?.communityNodeDetails
			"
			#extraDetails
		>
			<N8nTooltip placement="top" :show-after="500">
				<template #content>
					<p
						v-n8n-html="
							i18n.baseText('generic.communityNode.tooltip', {
								interpolate: {
									packageName: nodeType.name.split('.')[0],
									docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
								},
							})
						"
						:class="$style.communityNodeIcon"
						@click="onCommunityNodeTooltipClick"
					/>
				</template>
				<N8nIcon size="small" :class="$style.icon" icon="box" />
			</N8nTooltip>
		</template>
		<template #dragContent>
			<div
				v-show="dragging"
				ref="draggableDataTransfer"
				:class="$style.draggable"
				:style="draggableStyle"
			>
				<NodeIcon
					:node-type="nodeType"
					:size="40"
					:shrink="false"
					color-default="var(--color--foreground--shade-2)"
					@click.capture.stop
				/>
			</div>
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.nodeItem {
	--trigger-icon--color--background: #{$trigger-icon-background-color};
	--trigger-icon--border-color: #{$trigger-icon-border-color};
	margin-left: 15px;
	margin-right: 12px;
	user-select: none;
}

.nodeIcon {
	z-index: 2;
}

.subNodeBackground {
	background-color: var(--node-type--supplemental--color--background);
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
	border: 2px solid var(--color--foreground--shade-2);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	display: flex;
	justify-content: center;
	align-items: center;
}

.draggableDataTransfer {
	width: 1px;
	height: 1px;
}

.icon {
	display: inline-flex;
	color: var(--color--text);
	width: 12px;

	&.official {
		width: 14px;
	}
}

.blocked {
	opacity: 0.6;
	cursor: not-allowed;
}

.iconWrapper {
	position: relative;
	display: inline-flex;

	&.dimmed {
		opacity: 0.5;
	}
}

.lockIcon {
	position: absolute;
	bottom: -2px;
	right: -2px;
	background: var(--color--background--light-2);
	border-radius: 50%;
	padding: 2px;
	color: var(--color--danger);
}

.requestAccessLink {
	background: none;
	border: none;
	color: var(--color--primary);
	cursor: pointer;
	font-size: var(--font-size--2xs);
	padding: 0;
	margin-left: var(--spacing--2xs);
	text-decoration: underline;

	&:hover {
		color: var(--color--primary--shade-1);
	}
}
</style>
