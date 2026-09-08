<script setup lang="ts">
import { computed } from 'vue';

import { N8nSelect2, N8nText } from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

type BuilderMode = 'build' | 'plan';

interface ModeSelectItem extends SelectOptionBase<BuilderMode> {
	description: string;
}

const props = defineProps<{
	modelValue: BuilderMode;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: BuilderMode];
}>();

const i18n = useI18n();

const modeOptions = computed<ModeSelectItem[]>(() => [
	{
		value: 'build',
		label: i18n.baseText('aiAssistant.builder.planMode.selector.build'),
		description: i18n.baseText(
			'aiAssistant.builder.planMode.selector.build.description' as BaseTextKey,
		),
		icon: 'box',
	},
	{
		value: 'plan',
		label: i18n.baseText('aiAssistant.builder.planMode.selector.plan'),
		description: i18n.baseText(
			'aiAssistant.builder.planMode.selector.plan.description' as BaseTextKey,
		),
		icon: 'scroll-text',
	},
]);

const currentMode = computed(() => {
	return modeOptions.value.find((opt) => opt.value === props.modelValue) ?? modeOptions.value[0];
});

function onSelect(value: SelectValue | undefined) {
	if (value) {
		emit('update:modelValue', value as BuilderMode);
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="plan-mode-selector">
		<N8nSelect2
			:class="$style.select"
			:items="modeOptions"
			:model-value="props.modelValue"
			:icon="currentMode.icon"
			variant="ghost"
			size="medium"
			position="popper"
			@update:model-value="onSelect"
		>
			<template #default>
				{{ currentMode.label }}
			</template>
			<template #item-label="{ item }">
				<span :class="$style.itemStack">
					<N8nText tag="span" size="medium">{{ item.label }}</N8nText>
					<N8nText tag="span" size="small" color="text-base">
						{{ (item as ModeSelectItem).description }}
					</N8nText>
				</span>
			</template>
		</N8nSelect2>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
}

.select {
	background-color: transparent;

	&:not([data-disabled]):hover {
		background-color: transparent;
	}
}

.itemStack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
</style>
