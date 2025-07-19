<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@n8n/i18n';
import { Controls } from '@vue-flow/controls';
import { computed } from 'vue';
import { useExperimentalNdvStore } from '../../experimental/experimentalNdv.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { useLogsStore } from '@/stores/logs.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';

const props = withDefaults(
	defineProps<{
		zoom?: number;
		readOnly?: boolean;
	}>(),
	{
		zoom: 1,
		readOnly: false,
	},
);

const emit = defineEmits<{
	'reset-zoom': [];
	'zoom-in': [];
	'zoom-out': [];
	'zoom-to-fit': [];
	'tidy-up': [];
}>();

const i18n = useI18n();

const experimentalNdvStore = useExperimentalNdvStore();

const isResetZoomVisible = computed(() => props.zoom !== 1);

function onResetZoom() {
	emit('reset-zoom');
}

function onZoomIn() {
	emit('zoom-in');
}

function onZoomOut() {
	emit('zoom-out');
}

function onZoomToFit() {
	emit('zoom-to-fit');
}

function onTidyUp() {
	emit('tidy-up');
}

const assistantStore = useAssistantStore();
const logsStore = useLogsStore();
const focusPanelStore = useFocusPanelStore();

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
	<Controls :show-zoom="false" :show-fit-view="false">
		<div :class="$style.controlGroup">
			<div :class="$style.controlSurface">
				<KeyboardShortcutTooltip
					:label="i18n.baseText('nodeView.zoomOut')"
					:shortcut="{ keys: ['-'] }"
				>
					<N8nIconButton
						type="tertiary"
						size="medium"
						icon="minus"
						text
						data-test-id="zoom-out-button"
						@click="onZoomOut"
					/>
				</KeyboardShortcutTooltip>
				<KeyboardShortcutTooltip
					:label="i18n.baseText('nodeView.zoomToFit')"
					:shortcut="{ keys: ['1'] }"
				>
					<N8nButton type="tertiary" size="mini" text @click="onZoomToFit">
						{{ Math.round(props.zoom * 100) }}%
					</N8nButton>
				</KeyboardShortcutTooltip>
				<KeyboardShortcutTooltip
					:label="i18n.baseText('nodeView.zoomIn')"
					:shortcut="{ keys: ['+'] }"
				>
					<N8nIconButton
						type="tertiary"
						size="medium"
						icon="plus"
						text
						data-test-id="zoom-in-button"
						@click="onZoomIn"
					/>
				</KeyboardShortcutTooltip>
			</div>
			<div :class="$style.controlSurface">
				<slot name="chat"></slot>
			</div>
		</div>
		<div :class="$style.controlGroup">
			<div :class="$style.controlSurface">
				<slot name="trigger"></slot>
			</div>
			<div :class="$style.controlSurface">
				<slot name="nodes"></slot>
			</div>
		</div>
		<div :class="$style.controlGroup">
			<div :class="$style.controlSurface">
				<KeyboardShortcutTooltip label="Ask Assistant">
					<N8nIconButton
						type="tertiary"
						size="medium"
						icon="sparkles"
						text
						@click="onAskAssistantButtonClick"
					/>
				</KeyboardShortcutTooltip>
			</div>
			<div :class="$style.controlSurface">
				<KeyboardShortcutTooltip label="View logs" :shortcut="{ keys: ['l'] }">
					<N8nIconButton
						type="tertiary"
						size="medium"
						icon="panel-bottom"
						text
						data-test-id="zoom-in-button"
						@click="logsStore.toggleOpen()"
					/>
				</KeyboardShortcutTooltip>
				<KeyboardShortcutTooltip label="Open Focus Panel" :shortcut="{ keys: ['shift', 'f'] }">
					<N8nIconButton
						type="tertiary"
						size="medium"
						icon="panel-right"
						text
						data-test-id="zoom-in-button"
						@click="focusPanelStore.toggleFocusPanel()"
					/>
				</KeyboardShortcutTooltip>
			</div>
		</div>
	</Controls>
</template>

<style module lang="scss">
.controlSurface {
	display: flex;
	gap: var(--spacing-xs);
	background-color: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	gap: var(--spacing-6xs);
}

.controlGroup {
	display: flex;
	gap: var(--spacing-2xs);
}

.iconButton {
	padding-left: 0;
	padding-right: 0;

	svg {
		width: 16px;
		height: 16px;
	}
}
</style>

<style lang="scss">
.vue-flow__controls {
	display: flex;
	justify-content: space-between;
	box-shadow: none;
	margin: 12px;
	padding: 0;
	width: calc(100% - 24px);
}
</style>

<!--
	<div>
		<N8nTooltip
			v-if="experimentalNdvStore.isActive(props.zoom)"
			placement="top"
			:content="i18n.baseText('nodeView.expandAllNodes')"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="maximize-2"
				@click="experimentalNdvStore.expandAllNodes"
			/>
		</N8nTooltip>
		<N8nTooltip
			v-if="experimentalNdvStore.isActive(props.zoom)"
			placement="top"
			:content="i18n.baseText('nodeView.collapseAllNodes')"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="minimize-2"
				@click="experimentalNdvStore.collapseAllNodes"
			/>
		</N8nTooltip>
	</div> -->
