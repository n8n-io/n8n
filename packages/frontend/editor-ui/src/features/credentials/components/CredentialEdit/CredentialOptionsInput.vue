<script setup lang="ts">
import { N8nInputLabel, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
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
const { options, loading, failed, canLoad, onVisibleChange } = useCredentialOptions(props);
const hasRequiredError = computed(
	() => props.parameter.required && props.showValidationWarnings && !props.modelValue,
);
const status = computed(() => {
	if (!canLoad.value) return i18n.baseText('credentialEdit.options.missingFields');
	if (loading.value) return i18n.baseText('parameterInput.loadingOptions');
	if (failed.value) return i18n.baseText('credentialEdit.options.loadFailed');
	return '';
});

function onInput(event: Event) {
	if (event.target instanceof HTMLInputElement) {
		emit('update:modelValue', event.target.value);
	}
}
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
			:aria-describedby="hasRequiredError ? `${inputId}-error` : undefined"
			filterable
			allow-create
			default-first-option
			@input="onInput"
			@update:model-value="emit('update:modelValue', $event)"
			@visible-change="onVisibleChange"
		>
			<N8nOption
				v-for="option in options"
				:key="String(option.value)"
				:value="String(option.value)"
				:label="option.name"
			/>
		</N8nSelect>
		<N8nText v-if="status" class="mt-2xs" size="small" color="text-light" role="status">
			{{ status }}
		</N8nText>
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
