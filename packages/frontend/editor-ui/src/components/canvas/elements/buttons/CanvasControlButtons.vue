<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@n8n/i18n';
import { Controls } from '@vue-flow/controls';
import { computed } from 'vue';
import { useExperimentalNdvStore } from '../../experimental/experimentalNdv.store';

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
</script>
<template>
	<Controls :class="$style.viewControls" :show-zoom="false" :show-fit-view="false">
		<KeyboardShortcutTooltip :label="i18n.baseText('nodeView.zoomOut')" :shortcut="{ keys: ['-'] }">
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
		<KeyboardShortcutTooltip :label="i18n.baseText('nodeView.zoomIn')" :shortcut="{ keys: ['+'] }">
			<N8nIconButton
				type="tertiary"
				size="medium"
				icon="plus"
				text
				data-test-id="zoom-in-button"
				@click="onZoomIn"
			/>
		</KeyboardShortcutTooltip>
	</Controls>
</template>

<style module lang="scss">
.viewControls {
	display: flex;
	gap: var(--spacing-xs);
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
	gap: var(--spacing-xs);
	box-shadow: none;
	background-color: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	margin: 12px;
	padding: 0;
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
