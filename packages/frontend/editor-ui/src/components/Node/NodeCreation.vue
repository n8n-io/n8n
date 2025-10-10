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
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { useBuilderStore } from '@/features/assistant/builder.store';
import { useChatPanelStore } from '@/features/assistant/chatPanel.store';

import { N8nAssistantIcon, N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';

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
	close: [];
}>();

const uiStore = useUIStore();
const focusPanelStore = useFocusPanelStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const assistantStore = useAssistantStore();
const builderStore = useBuilderStore();
const chatPanelStore = useChatPanelStore();

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
	emit('close');
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

async function onAskAssistantButtonClick() {
	if (builderStore.isAIBuilderEnabled) {
		await chatPanelStore.toggle({ mode: 'builder' });
	} else {
		await chatPanelStore.toggle({ mode: 'assistant' });
	}
	if (chatPanelStore.isOpen) {
		assistantStore.trackUserOpenedAssistant({
			source: 'canvas',
			task: 'placeholder',
			has_existing_session: !assistantStore.isSessionEnded,
		});
	}
}
</script>

<template>
	<div v-if="!createNodeActive" :class="$style.nodeButtonsWrapper">
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.openNodesPanel')"
			:shortcut="{ keys: ['Tab'] }"
			placement="left"
		>
			<N8nIconButton
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
			<N8nIconButton
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
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="panel-right"
				:class="focusPanelActive ? $style.activeButton : ''"
				:active="focusPanelActive"
				data-test-id="toggle-focus-panel-button"
				@click="toggleFocusPanel"
			/>
		</KeyboardShortcutTooltip>
		<N8nTooltip v-if="assistantStore.canShowAssistantButtonsOnCanvas" placement="left">
			<template #content> {{ i18n.baseText('aiAssistant.tooltip') }}</template>
			<N8nButton
				type="tertiary"
				size="large"
				square
				:class="$style.icon"
				data-test-id="ask-assistant-canvas-action-button"
				@click="onAskAssistantButtonClick"
			>
				<template #default>
					<div>
						<N8nAssistantIcon size="large" />
					</div>
				</template>
			</N8nButton>
		</N8nTooltip>
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
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
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
