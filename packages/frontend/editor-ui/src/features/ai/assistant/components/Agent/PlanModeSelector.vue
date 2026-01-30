<script setup lang="ts">
/**
 * PlanModeSelector.vue
 *
 * Dropdown selector for switching between Build and Plan modes.
 * Appears next to the send button in the chat input area.
 */
import { computed } from 'vue';
import { N8nDropdownMenu, N8nIcon, N8nButton } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';

export type BuilderMode = 'build' | 'plan';

interface ModeOption {
	id: BuilderMode;
	label: string;
	icon: IconOrEmoji;
	checked: boolean;
}

interface Props {
	modelValue: BuilderMode;
	disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: BuilderMode];
}>();

const modeOptions = computed<ModeOption[]>(() => [
	{
		id: 'build',
		label: 'Build',
		icon: { type: 'icon', value: 'cube' } as IconOrEmoji,
		checked: props.modelValue === 'build',
	},
	{
		id: 'plan',
		label: 'Plan',
		icon: { type: 'icon', value: 'list-checks' } as IconOrEmoji,
		checked: props.modelValue === 'plan',
	},
]);

const currentMode = computed(() => {
	return modeOptions.value.find((opt) => opt.id === props.modelValue) ?? modeOptions.value[0];
});

function onModeSelect(modeId: BuilderMode) {
	emit('update:modelValue', modeId);
}
</script>

<template>
	<N8nDropdownMenu
		:items="modeOptions"
		:disabled="disabled"
		placement="top-end"
		teleported
		:class="$style.modeMenu"
		extra-popper-class="plan-mode-selector-popper"
		data-test-id="plan-mode-selector"
		@select="onModeSelect"
	>
		<template #trigger>
			<N8nButton
				:class="$style.trigger"
				type="secondary"
				:disabled="disabled"
				data-test-id="plan-mode-selector-trigger"
			>
				<N8nIcon
					:icon="currentMode.icon.type === 'icon' ? currentMode.icon.value : 'cube'"
					size="small"
				/>
				<span :class="$style.label">{{ currentMode.label }}</span>
				<N8nIcon icon="chevron-down" size="xsmall" :class="$style.chevron" />
			</N8nButton>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.modeMenu {
	display: inline-flex;
}

:global(.plan-mode-selector-popper) {
	z-index: var(--floating-ui--z);
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.label {
	font-weight: var(--font-weight--regular);
}

.chevron {
	color: var(--color--text--tint-1);
}
</style>
