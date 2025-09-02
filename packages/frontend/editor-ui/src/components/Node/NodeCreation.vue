<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { defineAsyncComponent } from 'vue';
import { getMidCanvasPosition } from '@/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import type {
	AddedNodesAndConnections,
	NodeTypeSelectedPayload,
	ToggleNodeCreatorOptions,
} from '@/Interface';
import { useActions } from './NodeCreator/composables/useActions';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import AssistantIcon from '@n8n/design-system/components/AskAssistantIcon/AssistantIcon.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useAssistantStore } from '@/stores/assistant.store';

type Props = {
	nodeViewScale: number;
	createNodeActive?: boolean;
	focusPanelActive: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const LazyNodeCreator = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreator/NodeCreator.vue'),
);

const props = withDefaults(defineProps<Props>(), {
	createNodeActive: false, // Determines if the node creator is open
});

const emit = defineEmits<{
	addNodes: [value: AddedNodesAndConnections];
	toggleNodeCreator: [value: ToggleNodeCreatorOptions];
}>();

const uiStore = useUIStore();
const focusPanelStore = useFocusPanelStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const assistantStore = useAssistantStore();

const { getAddedNodesAndConnections } = useActions();

function openNodeCreator() {
	emit('toggleNodeCreator', {
		source: NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
		createNodeActive: true,
	});
}

function addStickyNote() {
	if (document.activeElement) {
		(document.activeElement as HTMLElement).blur();
	}

	const offset: [number, number] = [...uiStore.nodeViewOffsetPosition];

	const position = getMidCanvasPosition(props.nodeViewScale, offset);
	position[0] -= DEFAULT_STICKY_WIDTH / 2;
	position[1] -= DEFAULT_STICKY_HEIGHT / 2;

	emit('addNodes', getAddedNodesAndConnections([{ type: STICKY_NODE_TYPE, position }]));
}

function closeNodeCreator(hasAddedNodes = false) {
	if (props.createNodeActive) {
		emit('toggleNodeCreator', { createNodeActive: false, hasAddedNodes });
	}
}

function nodeTypeSelected(value: NodeTypeSelectedPayload[]) {
	emit('addNodes', getAddedNodesAndConnections(value));
	closeNodeCreator(true);
}

function toggleFocusPanel() {
	focusPanelStore.toggleFocusPanel();

	telemetry.track(
		focusPanelStore.focusPanelActive ? 'User opened focus panel' : 'User closed focus panel',
		{
			source: 'canvasButton',
			parameters: focusPanelStore.focusedNodeParametersInTelemetryFormat,
		},
	);
}

function onAskAssistantButtonClick() {
	if (!assistantStore.chatWindowOpen)
		assistantStore.trackUserOpenedAssistant({
			source: 'canvas',
			task: 'placeholder',
			has_existing_session: !assistantStore.isSessionEnded,
		});

	assistantStore.toggleChatOpen();
}
</script>

<template>
	<div v-if="!createNodeActive" :class="$style.nodeButtonsWrapper">
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.openNodesPanel')"
			:shortcut="{ keys: ['Tab'] }"
			placement="left"
		>
			<n8n-icon-button
				size="large"
				icon="plus"
				type="tertiary"
				data-test-id="node-creator-plus-button"
				@click="openNodeCreator"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.addStickyHint')"
			:shortcut="{ keys: ['s'], shiftKey: true }"
			placement="left"
		>
			<n8n-icon-button
				size="large"
				type="tertiary"
				icon="sticky-note"
				data-test-id="add-sticky-button"
				@click="addStickyNote"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.openFocusPanel')"
			:shortcut="{ keys: ['f'], shiftKey: true }"
			placement="left"
		>
			<n8n-icon-button
				type="tertiary"
				size="large"
				icon="panel-right"
				:class="focusPanelActive ? $style.activeButton : ''"
				:active="focusPanelActive"
				data-test-id="toggle-focus-panel-button"
				@click="toggleFocusPanel"
			/>
		</KeyboardShortcutTooltip>
		<n8n-tooltip v-if="assistantStore.canShowAssistantButtonsOnCanvas" placement="left">
			<template #content> {{ i18n.baseText('aiAssistant.tooltip') }}</template>
			<n8n-button
				type="tertiary"
				size="large"
				square
				:class="$style.icon"
				data-test-id="ask-assistant-canvas-action-button"
				@click="onAskAssistantButtonClick"
			>
				<template #default>
					<div>
						<AssistantIcon size="large" />
					</div>
				</template>
			</n8n-button>
		</n8n-tooltip>
	</div>
	<Suspense>
		<LazyNodeCreator
			:active="createNodeActive"
			@node-type-selected="nodeTypeSelected"
			@close-node-creator="closeNodeCreator"
		/>
	</Suspense>
</template>

<style lang="scss" module>
.nodeButtonsWrapper {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	padding: var(--spacing-s);
	pointer-events: all !important;
}

.icon {
	display: inline-flex;
	justify-content: center;
	align-items: center;

	svg {
		display: block;
	}
}

.activeButton {
	background-color: var(--button-hover-background-color) !important;
}
</style>
