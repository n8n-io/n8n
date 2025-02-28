<script setup lang="ts">
import { Controls } from '@vue-flow/controls';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import TidyUpIcon from '@/components/TidyUpIcon.vue';
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';

const props = withDefaults(
	defineProps<{
		zoom?: number;
	}>(),
	{
		zoom: 1,
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
	<Controls :show-zoom="false" :show-fit-view="false">
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.zoomToFit')"
			:shortcut="{ keys: ['1'] }"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="expand"
				data-test-id="zoom-to-fit"
				@click="onZoomToFit"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip :label="i18n.baseText('nodeView.zoomIn')" :shortcut="{ keys: ['+'] }">
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="search-plus"
				data-test-id="zoom-in-button"
				@click="onZoomIn"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip :label="i18n.baseText('nodeView.zoomOut')" :shortcut="{ keys: ['-'] }">
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="search-minus"
				data-test-id="zoom-out-button"
				@click="onZoomOut"
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
				icon="undo"
				data-test-id="reset-zoom-button"
				@click="onResetZoom"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
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
	</Controls>
</template>

<style module lang="scss">
.iconButton {
	display: flex;
	align-items: center;
	justify-content: center;

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
