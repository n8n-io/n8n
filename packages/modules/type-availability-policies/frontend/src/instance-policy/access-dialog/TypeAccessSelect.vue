<script setup lang="ts">
import { policyActionSchema, type PolicyAction } from '@n8n/api-types';
import { N8nIcon, N8nOption, N8nSelect, type IconColor, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

const {
	modelValue,
	label,
	disabled = false,
} = defineProps<{
	/** `undefined` while the access of the type is not loaded. */
	modelValue: PolicyAction | undefined;
	/** The name of the type, for the accessible label. */
	label: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [action: PolicyAction] }>();

const i18n = useI18n();

const ACCESS_LABEL_KEY: Record<PolicyAction, BaseTextKey> = {
	allow: 'typeAvailabilityPolicies.access.allow',
	deny: 'typeAvailabilityPolicies.access.deny',
	delegate: 'typeAvailabilityPolicies.access.delegate',
};

// The design has no icon for a delegated type.
const ACCESS_ICON: Partial<Record<PolicyAction, { icon: IconName; color: IconColor }>> = {
	allow: { icon: 'check', color: 'success' },
	deny: { icon: 'lock', color: 'danger' },
};

// The design offers only Allowed and Restricted. A type that the API delegated keeps its value.
const options = computed<PolicyAction[]>(() =>
	modelValue === 'delegate' ? ['allow', 'deny', 'delegate'] : ['allow', 'deny'],
);

function onChange(value: unknown) {
	const action = policyActionSchema.safeParse(value);
	if (action.success && action.data !== modelValue) emit('update:modelValue', action.data);
}
</script>

<template>
	<N8nSelect
		:model-value="modelValue"
		:disabled="disabled || modelValue === undefined"
		:teleported="false"
		:aria-label="
			i18n.baseText('typeAvailabilityPolicies.access.ariaLabel', { interpolate: { name: label } })
		"
		size="small"
		:class="$style.select"
		data-test-id="type-access-select"
		@update:model-value="onChange"
	>
		<template v-if="modelValue && ACCESS_ICON[modelValue]" #prefix>
			<N8nIcon
				:icon="ACCESS_ICON[modelValue].icon"
				:color="ACCESS_ICON[modelValue].color"
				size="small"
				data-test-id="type-access-select-icon"
			/>
		</template>
		<N8nOption
			v-for="action in options"
			:key="action"
			:value="action"
			:label="i18n.baseText(ACCESS_LABEL_KEY[action])"
		>
			<span :class="$style.option">
				<N8nIcon
					v-if="ACCESS_ICON[action]"
					:icon="ACCESS_ICON[action].icon"
					:color="ACCESS_ICON[action].color"
					size="small"
				/>
				{{ i18n.baseText(ACCESS_LABEL_KEY[action]) }}
			</span>
		</N8nOption>
	</N8nSelect>
</template>

<style lang="scss" module>
.select {
	width: 9.5rem;
	flex-shrink: 0;
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
