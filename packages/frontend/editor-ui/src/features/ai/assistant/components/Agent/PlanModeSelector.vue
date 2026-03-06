<script setup lang="ts">
import { computed } from 'vue';

import { N8nActionDropdown, N8nButton, N8nIcon } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

type BuilderMode = 'build' | 'plan';

const props = defineProps<{
	modelValue: BuilderMode;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: BuilderMode];
}>();

const i18n = useI18n();

const modeOptions = computed<Array<ActionDropdownItem<BuilderMode>>>(() => [
	{
		id: 'build',
		label: i18n.baseText('aiAssistant.builder.planMode.selector.build'),
		description: i18n.baseText(
			'aiAssistant.builder.planMode.selector.build.description' as BaseTextKey,
		),
		icon: 'box',
		checked: props.modelValue === 'build',
	},
	{
		id: 'plan',
		label: i18n.baseText('aiAssistant.builder.planMode.selector.plan'),
		description: i18n.baseText(
			'aiAssistant.builder.planMode.selector.plan.description' as BaseTextKey,
		),
		icon: 'scroll-text',
		checked: props.modelValue === 'plan',
	},
]);

const currentMode = computed(() => {
	return modeOptions.value.find((opt) => opt.id === props.modelValue) ?? modeOptions.value[0];
});

function onSelect(value: BuilderMode) {
	emit('update:modelValue', value);
}
</script>

<template>
	<div :class="$style.container" data-test-id="plan-mode-selector">
		<N8nActionDropdown :items="modeOptions" placement="bottom-end" hide-arrow @select="onSelect">
			<template #activator>
				<N8nButton type="secondary" size="small" :class="$style.trigger">
					<N8nIcon v-if="currentMode.icon" :icon="currentMode.icon" size="small" />
					<span :class="$style.triggerLabel">{{ currentMode.label }}</span>
					<N8nIcon icon="chevron-down" size="xsmall" />
				</N8nButton>
			</template>
			<template #menuItem="item">
				<div :class="$style.menuItem">
					<span :class="$style.label">{{ item.label }}</span>
					<span :class="$style.description">{{ item.description }}</span>
				</div>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
}

.triggerLabel {
	font-size: var(--font-size--2xs);
}

.menuItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.label {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
}

.description {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--sm);
}
</style>
