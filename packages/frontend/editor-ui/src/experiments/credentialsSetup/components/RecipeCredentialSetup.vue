<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useCredentialSetupRecipeStore } from '../stores/credentialSetupRecipe.store';
import ManagedOAuthSetup from './ManagedOAuthSetup.vue';
import TenantOAuthSetup from './TenantOAuthSetup.vue';

const props = defineProps<{
	credentialTypeName: string;
}>();

const emit = defineEmits<{
	success: [credential: ICredentialsResponse];
	failure: [];
	'manual-fallback': [step: string];
	'update:credential-data': [data: Record<string, unknown>];
}>();

const recipeStore = useCredentialSetupRecipeStore();
const credentialsStore = useCredentialsStore();

const activation = computed(() => recipeStore.getRecipeActivation(props.credentialTypeName));

const setupMode = computed(() => activation.value.resolved.recipe.setupMode);

const credentialDisplayName = computed(
	() =>
		credentialsStore.getCredentialTypeByName(props.credentialTypeName)?.displayName ??
		props.credentialTypeName,
);

const bootstrapField = computed(() => {
	const preSteps = activation.value.resolved.recipe.preSteps ?? [];
	const fieldStep = preSteps.find((step) => step.kind === 'field');
	return fieldStep !== undefined && fieldStep.kind === 'field' ? fieldStep.field : '';
});

const bootstrapFieldLabel = computed(() => {
	const preSteps = activation.value.resolved.recipe.preSteps ?? [];
	const fieldStep = preSteps.find((step) => step.kind === 'field');
	return fieldStep !== undefined && fieldStep.kind === 'field'
		? (fieldStep.label ?? fieldStep.field)
		: '';
});

onMounted(() => {
	recipeStore.trackRecipeEvent('credential_setup_recipe_rendered', props.credentialTypeName, {
		surface: 'modal',
	});

	if (setupMode.value !== 'managedOAuth' && setupMode.value !== 'tenantOAuth') {
		emit('manual-fallback', 'unsupported');
	}
});
</script>

<template>
	<div data-test-id="recipe-credential-setup">
		<ManagedOAuthSetup
			v-if="setupMode === 'managedOAuth'"
			:credential-type-name="credentialTypeName"
			:credential-display-name="credentialDisplayName"
			@success="emit('success', $event)"
			@failure="emit('failure')"
			@manual-fallback="emit('manual-fallback', $event)"
		/>
		<TenantOAuthSetup
			v-else-if="setupMode === 'tenantOAuth'"
			:credential-type-name="credentialTypeName"
			:credential-display-name="credentialDisplayName"
			:bootstrap-field="bootstrapField"
			:bootstrap-field-label="bootstrapFieldLabel"
			@success="emit('success', $event)"
			@failure="emit('failure')"
			@manual-fallback="emit('manual-fallback', $event)"
			@update:credential-data="emit('update:credential-data', $event)"
		/>
	</div>
</template>
