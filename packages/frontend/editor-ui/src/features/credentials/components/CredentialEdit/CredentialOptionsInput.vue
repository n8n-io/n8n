<script setup lang="ts">
import { N8nInputLabel, N8nOption, N8nSelect, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeProperties } from 'n8n-workflow';
import { computed, useId } from 'vue';

import {
	useCredentialOptions,
	type CredentialOptionsContext,
} from '../../composables/useCredentialOptions';

const props = defineProps<
	CredentialOptionsContext & {
		parameter: INodeProperties;
		modelValue: string;
		showValidationWarnings?: boolean;
		compact?: boolean;
	}
>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const i18n = useI18n();
const inputId = useId();
const { options: loadedOptions, loading } = useCredentialOptions(props);
const options = computed(() => [
	...(props.parameter.options?.filter((option) => 'value' in option) ?? []),
	...loadedOptions.value,
]);
const hasRequiredError = computed(
	() => props.parameter.required && props.showValidationWarnings && !props.modelValue,
);
</script>

<template>
	<N8nInputLabel
		:input-name="inputId"
		:label="i18n.credText(credentialType ?? '').inputLabelDisplayName(parameter)"
		:tooltip-text="i18n.credText(credentialType ?? '').inputLabelDescription(parameter)"
		:bold="!compact"
		:size="compact ? 'small' : 'medium'"
		show-tooltip
	>
		<N8nSelect
			:id="inputId"
			:model-value="modelValue"
			:size="compact ? 'small' : 'large'"
			:placeholder="parameter.placeholder"
			:teleported="false"
			:no-data-text="i18n.baseText('credentialEdit.options.empty')"
			:aria-invalid="Boolean(hasRequiredError)"
			:aria-busy="loading || undefined"
			:aria-describedby="hasRequiredError ? `${inputId}-error` : undefined"
			filterable
			default-first-option
			@update:model-value="emit('update:modelValue', $event)"
		>
			<template v-if="loading" #prefix>
				<N8nSpinner role="status" :aria-label="i18n.baseText('parameterInput.loadingOptions')" />
			</template>
			<N8nOption
				v-for="option in options"
				:key="String(option.value)"
				:value="String(option.value)"
				:label="option.name"
			/>
		</N8nSelect>
		<N8nText
			v-if="hasRequiredError"
			:id="`${inputId}-error`"
			class="mt-2xs"
			size="small"
			color="danger"
			role="alert"
		>
			{{ i18n.baseText('parameterInputExpanded.thisFieldIsRequired') }}
		</N8nText>
	</N8nInputLabel>
</template>
