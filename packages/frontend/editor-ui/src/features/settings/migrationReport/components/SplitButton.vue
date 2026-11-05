<script lang="ts" setup>
import { N8nActionToggle, N8nButton, N8nIconButton } from '@n8n/design-system';

// Attributes such as `data-test-id` belong on the main button, not on the wrapper.
defineOptions({ inheritAttrs: false });

defineProps<{
	label: string;
	// Also disables the menu, so the bar shows one state for the whole button.
	disabled?: boolean;
	// More actions in the chevron menu.
	actions: Array<{ label: string; value: string; disabled?: boolean }>;
}>();

const emit = defineEmits<{
	click: [];
	action: [value: string];
}>();
</script>

<template>
	<div :class="$style.group">
		<N8nButton
			variant="outline"
			:label="label"
			:disabled="disabled"
			:class="$style.main"
			v-bind="$attrs"
			@click="emit('click')"
		/>
		<!-- The selection bar sits at the bottom of the page, so the menu opens upward. -->
		<N8nActionToggle
			:actions="actions"
			:disabled="disabled"
			placement="top-end"
			@action="emit('action', $event)"
		>
			<N8nIconButton
				variant="outline"
				icon="chevron-down"
				:disabled="disabled"
				:class="$style.toggle"
				data-test-id="split-button-toggle"
			/>
		</N8nActionToggle>
	</div>
</template>

<style lang="scss" module>
// Each outline button draws its own border ring, so two halves side by side show a
// double divider. The wrapper draws one border around both halves instead, and the
// toggle draws a single divider. Same approach as the split button in instanceAi, with
// the border color of the outline buttons next to it. The rules sit inside `.group` so
// they outrank the button's own outline styles.
.group {
	display: inline-flex;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--full);

	.main,
	.toggle {
		--button--border--shadow: 0 0 0 0 transparent;
		--button--border--shadow--hover: 0 0 0 0 transparent;
		--button--border--shadow--active: 0 0 0 0 transparent;
	}

	.main {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.toggle {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: 1px solid var(--border-color);
	}
}
</style>
