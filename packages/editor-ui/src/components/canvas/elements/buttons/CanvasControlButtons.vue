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
	<Controls>
		<template #icon-zoom-in>
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
		</template>
		<template #icon-zoom-out>
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
		</template>
		<template #icon-fit-view>
			<KeyboardShortcutTooltip
				:label="$locale.baseText('nodeView.zoomToFit')"
				:shortcut="{ keys: ['1'] }"
			>
				<N8nIconButton type="tertiary" size="large" icon="expand" data-test-id="zoom-to-fit" />
			</KeyboardShortcutTooltip>
		</template>
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
	box-shadow: none;

	.button {
		transition-property: transform, background, border, color;
		transition-duration: 300ms;
		transition-timing-function: ease;

		&:hover {
			transform: scale(1.1);
		}
	}
}

.vue-flow__controls-button {
	border: 0;
	padding: 0;
	width: 42px;
	height: 42px;
	svg {
		max-height: 16px;
		max-width: 16px;
	}
}
</style>
