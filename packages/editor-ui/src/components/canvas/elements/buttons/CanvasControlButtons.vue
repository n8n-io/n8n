<script setup lang="ts">
import { Controls } from '@vue-flow/controls';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { computed } from 'vue';

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
}>();

const isResetZoomVisible = computed(() => props.zoom !== 1);

function onResetZoom() {
	emit('reset-zoom');
}
</script>
<template>
	<Controls :show-zoom="false" :show-fit-view="false">
		<KeyboardShortcutTooltip
			:label="$locale.baseText('nodeView.zoomIn')"
			:shortcut="{ keys: ['+'] }"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="search-plus"
				data-test-id="zoom-in-button"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:label="$locale.baseText('nodeView.zoomOut')"
			:shortcut="{ keys: ['-'] }"
		>
			<N8nIconButton
				type="tertiary"
				size="large"
				icon="search-minus"
				data-test-id="zoom-out-button"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			:label="$locale.baseText('nodeView.zoomToFit')"
			:shortcut="{ keys: ['1'] }"
		>
			<N8nIconButton type="tertiary" size="large" icon="expand" data-test-id="zoom-to-fit" />
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip
			v-if="isResetZoomVisible"
			:label="$locale.baseText('nodeView.resetZoom')"
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
	</Controls>
</template>

<style lang="scss">
.vue-flow__controls {
	display: flex;
	gap: var(--spacing-xs);
}
</style>
