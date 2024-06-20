<script setup lang="ts">
import type { KeyboardShortcut } from '@/Interface';
import type { Placement } from 'element-plus';

interface Props {
	label: string;
	shortcut: KeyboardShortcut;
	placement?: Placement;
}
withDefaults(defineProps<Props>(), { placement: 'top' });
</script>

<template>
	<n8n-tooltip :placement="placement" :show-after="500">
		<template #content>
			<div :class="$style.shortcut">
				<div :class="$style.label">{{ label }}</div>
				<n8n-keyboard-shortcut v-bind="shortcut"></n8n-keyboard-shortcut>
			</div>
		</template>
		<slot />
	</n8n-tooltip>
</template>

<style lang="scss" module>
.shortcut {
	display: flex;
	align-items: center;
	font-size: var(--font-size-2xs);
	gap: var(--spacing-2xs);
}

.label {
	flex-shrink: 0;
}
</style>
