<script setup lang="ts">
import type { ApiKeyScope } from '@n8n/permissions';

import ScopesSelector from '@/app/components/scopes/ScopesSelector.vue';

import { API_KEY_SCOPE_GROUPS, READ_SCOPE_ACTIONS } from '../apiKeys.constants';

const props = withDefaults(
	defineProps<{
		modelValue: ApiKeyScope[];
		availableScopes: ApiKeyScope[];
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'update:modelValue': [scopes: ApiKeyScope[]];
}>();
</script>

<template>
	<ScopesSelector
		:model-value="props.modelValue"
		:available-scopes="props.availableScopes"
		:groups="API_KEY_SCOPE_GROUPS"
		:read-actions="READ_SCOPE_ACTIONS"
		i18n-key-prefix="settings.api.scopes"
		root-test-id="api-key-scopes"
		:disabled="props.disabled"
		@update:model-value="emit('update:modelValue', $event)"
	/>
</template>
