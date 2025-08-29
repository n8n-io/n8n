<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import TidyUpIcon from '@/components/TidyUpIcon.vue';
import { useI18n } from '@n8n/i18n';
import { Controls } from '@vue-flow/controls';
import { computed } from 'vue';
import { useExperimentalNdvStore } from '../../experimental/experimentalNdv.store';
import { N8nIconButton } from '@n8n/design-system';

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
	'toggle-zoom-mode': [];
}>();

const i18n = useI18n();

const experimentalNdvStore = useExperimentalNdvStore();

const isExperimentalNdvActive = computed(() => experimentalNdvStore.isActive(props.zoom));

const isToggleZoomVisible = computed(() => experimentalNdvStore.isZoomedViewEnabled);

const isResetZoomVisible = computed(() => !isToggleZoomVisible.value && props.zoom !== 1);

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
</script>
<template>
	<Controls :show-zoom="false" :show-fit-view="false">
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.zoomToFit')"
			:shortcut="{ keys: ['1'] }"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="maximize"
				data-test-id="zoom-to-fit"
				@click="onZoomToFit"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip :label="i18n.baseText('nodeView.zoomIn')" :shortcut="{ keys: ['+'] }">
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="zoom-in"
				data-test-id="zoom-in-button"
				@click="onZoomIn"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip :label="i18n.baseText('nodeView.zoomOut')" :shortcut="{ keys: ['-'] }">
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="zoom-out"
				data-test-id="zoom-out-button"
				@click="onZoomOut"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			v-if="isToggleZoomVisible"
			:label="
				i18n.baseText(isExperimentalNdvActive ? 'nodeView.leaveZoomMode' : 'nodeView.enterZoomMode')
			"
			:shortcut="{ keys: ['Z'] }"
		>
			<N8nIconButton
				square
				type="tertiary"
				size="large"
				:class="$style.iconButton"
				:icon="isExperimentalNdvActive ? 'undo-2' : 'crosshair'"
				@click="emit('toggle-zoom-mode')"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			v-if="isResetZoomVisible"
			:label="i18n.baseText('nodeView.resetZoom')"
			:shortcut="{ keys: ['0'] }"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="undo-2"
				data-test-id="reset-zoom-button"
				@click="onResetZoom"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			v-if="!readOnly"
			:label="i18n.baseText('nodeView.tidyUp')"
			:shortcut="{ shiftKey: true, altKey: true, keys: ['T'] }"
		>
			<N8nButton
				square
				type="tertiary"
				size="large"
				data-test-id="tidy-up-button"
				:class="$style.iconButton"
				@click="onTidyUp"
			>
				<TidyUpIcon />
			</N8nButton>
		</KeyboardShortcutTooltip>
		<N8nTooltip
			v-if="isExperimentalNdvActive"
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
			v-if="isExperimentalNdvActive"
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
	</Controls>
</template>

<style module lang="scss">
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
	gap: var(--spacing-xs);
	box-shadow: none;
}
</style>
