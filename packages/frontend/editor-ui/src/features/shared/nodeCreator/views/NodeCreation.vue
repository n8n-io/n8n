<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { computed, defineAsyncComponent, nextTick } from 'vue';
import { getMidCanvasPosition } from '@/app/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import type {
	AddedNodesAndConnections,
	NodeTypeSelectedPayload,
	ToggleNodeCreatorOptions,
} from '@/Interface';
import { useActions } from '../composables/useActions';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import NodeCreatorShortcutCoachmark from '../components/NodeCreatorShortcutCoachmark.vue';
import { useNodeCreatorShortcutCoachmark } from '../composables/useNodeCreatorShortcutCoachmark';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';

import { N8nAssistantIcon, N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';

type Props = {
	nodeViewScale: number;
	createNodeActive?: boolean;
	focusPanelActive: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const LazyNodeCreator = defineAsyncComponent(
	async () => await import('../components/NodeCreator.vue'),
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
const setupPanelStore = useSetupPanelStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const assistantStore = useAssistantStore();
const builderStore = useBuilderStore();
const chatPanelStore = useChatPanelStore();

const { getAddedNodesAndConnections } = useActions();
const { shouldShowCoachmark, onDismissCoachmark } = useNodeCreatorShortcutCoachmark();

const sidePanelTooltip = computed(() => {
	if (setupPanelStore.isFeatureEnabled) {
		return i18n.baseText('nodeView.openSidePanel');
	}
	return i18n.baseText('nodeView.openFocusPanel');
});

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
	// Start builder mode if enabled; privacy setting is respected at payload creation level
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

function openCommandBar(event: MouseEvent) {
	event.stopPropagation();

	void nextTick(() => {
		const keyboardEvent = new KeyboardEvent('keydown', {
			key: 'k',
			code: 'KeyK',
			metaKey: true,
			bubbles: true,
			cancelable: true,
		});
		document.dispatchEvent(keyboardEvent);
	});
}
</script>

<template>
	<div v-if="!createNodeActive" :class="$style.nodeButtonsWrapper">
		<NodeCreatorShortcutCoachmark :visible="shouldShowCoachmark" @dismiss="onDismissCoachmark">
			<KeyboardShortcutTooltip
				:label="i18n.baseText('nodeView.openNodesPanel')"
				:shortcut="{ keys: ['N'] }"
				placement="left"
			>
				<N8nIconButton
					variant="subtle"
					size="large"
					icon="plus"
					:aria-label="i18n.baseText('nodeView.openNodesPanel')"
					data-test-id="node-creator-plus-button"
					@click="openNodeCreator"
				/>
			</KeyboardShortcutTooltip>
		</NodeCreatorShortcutCoachmark>
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.openCommandBar')"
			:shortcut="{ keys: ['k'], metaKey: true }"
			placement="left"
		>
			<N8nIconButton
				variant="subtle"
				size="large"
				icon="search"
				:aria-label="i18n.baseText('nodeView.openCommandBar')"
				data-test-id="command-bar-button"
				@click="openCommandBar"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.addStickyHint')"
			:shortcut="{ keys: ['s'], shiftKey: true }"
			placement="left"
		>
			<N8nIconButton
				variant="subtle"
				size="large"
				icon="sticky-note"
				:aria-label="i18n.baseText('nodeView.addStickyHint')"
				data-test-id="add-sticky-button"
				@click="addStickyNote"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:label="sidePanelTooltip"
			:shortcut="{ keys: ['f'], shiftKey: true }"
			placement="left"
		>
			<N8nIconButton
				variant="subtle"
				size="large"
				icon="panel-right"
				:aria-label="sidePanelTooltip"
				:active="focusPanelActive"
				data-test-id="toggle-focus-panel-button"
				@click="toggleFocusPanel"
			/>
		</KeyboardShortcutTooltip>
		<N8nTooltip v-if="chatPanelStore.canShowAiButtonOnCanvas" placement="left">
			<template #content> {{ i18n.baseText('aiAssistant.tooltip') }}</template>
			<N8nButton
				variant="subtle"
				iconOnly
				size="large"
				:aria-label="i18n.baseText('aiAssistant.tooltip')"
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
</style>
