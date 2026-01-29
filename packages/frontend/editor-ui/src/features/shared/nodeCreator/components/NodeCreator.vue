<script setup lang="ts">
import { watch, reactive, toRefs, computed, onBeforeUnmount } from 'vue';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import SlideTransition from '@/app/components/transitions/SlideTransition.vue';

import { useViewStacks } from '../composables/useViewStacks';
import { useKeyboardNavigation } from '../composables/useKeyboardNavigation';
import { useActionsGenerator } from '../composables/useActionsGeneration';
import NodesListPanel from './Panel/NodesListPanel.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { DRAG_EVENT_DATA_KEY } from '@/app/constants';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import type { NodeTypeSelectedPayload, SimplifiedNodeType } from '@/Interface';
import { onClickOutside } from '@vueuse/core';
import { useNodeGovernanceStore } from '@/features/settings/nodeGovernance/nodeGovernance.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { N8nIconButton } from '@n8n/design-system';
// elements that should not trigger onClickOutside
const OUTSIDE_CLICK_WHITELIST = [
	// different modals
	'.el-overlay-dialog',
];

export interface Props {
	active?: boolean;
	onNodeTypeSelected?: (value: NodeTypeSelectedPayload[]) => void;
}

const props = defineProps<Props>();
const { resetViewStacks } = useViewStacks();
const { registerKeyHook } = useKeyboardNavigation();
const emit = defineEmits<{
	closeNodeCreator: [];
	nodeTypeSelected: [value: NodeTypeSelectedPayload[]];
}>();
const uiStore = useUIStore();
const bannersStore = useBannersStore();
const chatPanelStore = useChatPanelStore();

const { setShowScrim, setActions, setMergeNodes } = useNodeCreatorStore();
const { generateMergedNodesAndActions } = useActionsGenerator();
const nodeGovernanceStore = useNodeGovernanceStore();
const projectsStore = useProjectsStore();

const state = reactive({
	nodeCreator: null as HTMLElement | null,
	mousedownInsideEvent: null as MouseEvent | null,
});

const showScrim = computed(() => useNodeCreatorStore().showScrim);

const viewStacksLength = computed(() => useViewStacks().viewStacks.length);

const nodeCreatorInlineStyle = computed(() => {
	const rightPosition = getRightOffset();
	return {
		top: `${bannersStore.bannersHeight + uiStore.headerHeight}px`,
		right: `${rightPosition}px`,
	};
});

function getRightOffset() {
	if (chatPanelStore.isOpen) {
		return chatPanelStore.width;
	}

	return 0;
}

function onMouseUpOutside() {
	if (state.mousedownInsideEvent) {
		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
		});
		state.mousedownInsideEvent.target?.dispatchEvent(clickEvent);
		state.mousedownInsideEvent = null;
		unBindOnMouseUpOutside();
	}
}
function unBindOnMouseUpOutside() {
	document.removeEventListener('mouseup', onMouseUpOutside);
	document.removeEventListener('touchstart', onMouseUpOutside);
}
function onMouseUp() {
	state.mousedownInsideEvent = null;
	unBindOnMouseUpOutside();
}
function onMouseDown(event: MouseEvent) {
	state.mousedownInsideEvent = event;
	document.addEventListener('mouseup', onMouseUpOutside);
	document.addEventListener('touchstart', onMouseUpOutside);
}
function onDragOver(event: DragEvent) {
	event.preventDefault();
}
function onDrop(event: DragEvent) {
	if (!event.dataTransfer) {
		return;
	}

	const dragData = event.dataTransfer.getData(DRAG_EVENT_DATA_KEY);
	const nodeCreatorBoundingRect = (state.nodeCreator as Element).getBoundingClientRect();

	// Abort drag end event propagation if dropped inside nodes panel
	if (
		dragData &&
		event.pageX >= nodeCreatorBoundingRect.x &&
		event.pageY >= nodeCreatorBoundingRect.y
	) {
		event.stopPropagation();
	}
}

watch(
	() => props.active,
	async (isActive) => {
		if (!isActive) {
			setShowScrim(false);
			resetViewStacks();
		} else {
			// Fetch governance data when node creator opens
			const projectId = projectsStore.currentProjectId ?? projectsStore.personalProject?.id ?? null;
			if (projectId) {
				// Clear previous status and fetch fresh governance data
				nodeGovernanceStore.clearGovernanceData();
				await nodeGovernanceStore.fetchGovernanceData(projectId);
			}
		}
	},
);

// Close node creator when the last view stacks is closed
watch(viewStacksLength, (value) => {
	if (value === 0) {
		emit('closeNodeCreator');
		setShowScrim(false);
	}
});

registerKeyHook('NodeCreatorCloseEscape', {
	keyboardKeys: ['Escape'],
	handler: () => emit('closeNodeCreator'),
});
registerKeyHook('NodeCreatorCloseTab', {
	keyboardKeys: ['Tab'],
	handler: () => emit('closeNodeCreator'),
});

// Helper to augment nodes with governance status using local resolution
function augmentNodesWithGovernance(nodes: SimplifiedNodeType[]): SimplifiedNodeType[] {
	return nodes.map((node) => {
		// Use local resolution which handles caching internally
		const governanceStatus = nodeGovernanceStore.resolveGovernanceForNode(node.name);
		return {
			...node,
			governance: governanceStatus,
		};
	});
}

watch(
	() => ({
		httpOnlyCredentials: useCredentialsStore().httpOnlyCredentialTypes,
		nodeTypes: useNodeTypesStore().visibleNodeTypes,
		governanceDataLoaded: nodeGovernanceStore.governanceDataLoaded,
	}),
	async ({ nodeTypes, httpOnlyCredentials }) => {
		const { actions, mergedNodes } = generateMergedNodesAndActions(nodeTypes, httpOnlyCredentials);

		// Fetch governance data if not already loaded
		// Use currentProjectId or fallback to personal project
		const projectId = projectsStore.currentProjectId ?? projectsStore.personalProject?.id ?? null;
		if (projectId && !nodeGovernanceStore.governanceDataLoaded) {
			await nodeGovernanceStore.fetchGovernanceData(projectId);
		}

		// Augment nodes with governance status using local resolution
		const nodesWithGovernance = augmentNodesWithGovernance(mergedNodes);

		setActions(actions);
		setMergeNodes(nodesWithGovernance);
	},
	{ immediate: true },
);
const { nodeCreator } = toRefs(state);

onBeforeUnmount(() => {
	unBindOnMouseUpOutside();
});

onClickOutside(
	nodeCreator,
	() => {
		emit('closeNodeCreator');
	},
	{ ignore: OUTSIDE_CLICK_WHITELIST },
);
</script>

<template>
	<div>
		<aside
			:class="{
				[$style.nodeCreatorScrim]: true,
				[$style.active]: showScrim,
			}"
		/>
		<N8nIconButton
			v-if="active"
			:class="$style.close"
			type="secondary"
			icon="x"
			aria-label="Close Node Creator"
			@click="emit('closeNodeCreator')"
		/>
		<SlideTransition>
			<div
				v-if="active"
				ref="nodeCreator"
				:class="{ [$style.nodeCreator]: true }"
				:style="nodeCreatorInlineStyle"
				data-test-id="node-creator"
				@dragover="onDragOver"
				@drop="onDrop"
				@mousedown="onMouseDown"
				@mouseup="onMouseUp"
			>
				<NodesListPanel @node-type-selected="onNodeTypeSelected" />
			</div>
		</SlideTransition>
	</div>
</template>

<style module lang="scss">
:global(strong) {
	font-weight: var(--font-weight--bold);
}
.nodeCreator {
	--node-creator--width: #{$node-creator-width};
	--node-creator--icon--color: var(--node--icon--color--neutral);
	position: fixed;
	top: $header-height;
	bottom: 0;
	right: 0;
	z-index: var(--node-creator--z);
	width: var(--node-creator--width);
	color: $node-creator-text-color;
}

.nodeCreatorScrim {
	position: fixed;
	top: $header-height;
	right: 0;
	bottom: 0;
	left: $sidebar-width;
	opacity: 0;
	z-index: 1;
	background: var(--dialog--overlay--color--background);
	pointer-events: none;
	transition: opacity 200ms ease-in-out;

	&.active {
		opacity: 0.7;
	}
}

.close {
	position: absolute;
	z-index: calc(var(--node-creator--z) + 1);
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	background: transparent;
	border: 0;
	display: none;
}

@media screen and (max-width: #{$node-creator-width + $sidebar-width}) {
	.nodeCreator {
		--node-creator--width: calc(100vw - #{$sidebar-width});
	}

	.close {
		display: inline-flex;
	}
}
</style>
