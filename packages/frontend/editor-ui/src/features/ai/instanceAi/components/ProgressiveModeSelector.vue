<script setup lang="ts">
import { computed } from 'vue';

import { N8nSelect2 } from '@n8n/design-system';
import type { SelectItemProps, SelectValue } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

type BuildStyle = 'default' | 'progressive';

interface ModeSelectItem extends SelectItemProps {
	description: string;
}

const props = defineProps<{
	modelValue: BuildStyle;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: BuildStyle];
}>();

const i18n = useI18n();

const modeOptions = computed<ModeSelectItem[]>(() => [
	{
		value: 'default',
		label: i18n.baseText('instanceAi.progressiveMode.selector.default'),
		description: i18n.baseText(
			'instanceAi.progressiveMode.selector.default.description' as BaseTextKey,
		),
		icon: 'box',
	},
	{
		value: 'progressive',
		label: i18n.baseText('instanceAi.progressiveMode.selector.progressive'),
		description: i18n.baseText(
			'instanceAi.progressiveMode.selector.progressive.description' as BaseTextKey,
		),
		icon: 'trending-up',
	},
]);

const currentMode = computed(() => {
	return modeOptions.value.find((opt) => opt.value === props.modelValue) ?? modeOptions.value[0];
});

function onSelect(value: SelectValue | undefined) {
	if (value === 'default' || value === 'progressive') {
		emit('update:modelValue', value);
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="progressive-mode-selector">
		<N8nSelect2
			:class="$style.select"
			:items="modeOptions"
			:model-value="props.modelValue"
			:icon="currentMode.icon"
			:disabled="props.disabled"
			variant="ghost"
			size="small"
			position="popper"
			side="top"
			:content-class="$style.content"
			@update:model-value="onSelect"
		>
			<template #default>
				{{ currentMode.label }}
			</template>
			<template #item-label="{ item }">
				<div :class="$style.itemContent">
					<span>{{ item.label }}</span>
					<span :class="$style.description">
						{{ (item as ModeSelectItem).description }}
					</span>
				</div>
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

.content [role='option'] {
	height: auto;
	padding: var(--spacing--3xs) var(--spacing--2xs);
}

.itemContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.description {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--sm);
}
</style>
