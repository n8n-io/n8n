<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { ASSIGNMENT_TYPES } from './constants';
import { computed } from 'vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

interface Props {
	modelValue: string;
	isReadOnly?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:model-value': [type: string];
}>();

const i18n = useI18n();

const types = ASSIGNMENT_TYPES;

const icon = computed(
	(): IconName => types.find((type) => type.type === props.modelValue)?.icon ?? 'box',
);

const onTypeChange = (type: string): void => {
	emit('update:model-value', type);
};
</script>

<template>
	<n8n-select
		data-test-id="assignment-type-select"
		size="small"
		:model-value="modelValue"
		:disabled="isReadOnly"
		@update:model-value="onTypeChange"
	>
		<template #prefix>
			<n8n-icon :class="$style.icon" :icon="icon" color="text-light" size="small" />
		</template>
		<n8n-option
			v-for="option in types"
			:key="option.type"
			:value="option.type"
			:label="i18n.baseText(`type.${option.type}` as BaseTextKey)"
			:class="$style.option"
		>
			<n8n-icon
				:icon="option.icon"
				:color="modelValue === option.type ? 'primary' : 'text-light'"
				size="small"
			/>
			<span>{{ i18n.baseText(`type.${option.type}` as BaseTextKey) }}</span>
		</n8n-option>
	</n8n-select>
</template>

<style lang="scss" module>
.icon {
	color: var(--color-text-light);
}

.option {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
	font-size: var(--font-size-s);
}
</style>
