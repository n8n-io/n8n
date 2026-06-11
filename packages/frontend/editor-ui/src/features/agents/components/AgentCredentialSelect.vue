<script setup lang="ts">
import { computed } from 'vue';
import type { PermissionsRecord } from '@n8n/permissions';
import CredentialsDropdown, {
	type CredentialOption as DropdownCredentialOption,
} from '@/features/credentials/components/CredentialPicker/CredentialsDropdown.vue';

export interface AgentCredentialOption {
	id: string;
	name: string;
	typeDisplayName?: string;
	homeProject?: DropdownCredentialOption['homeProject'];
}

const props = defineProps<{
	modelValue?: string;
	credentials: AgentCredentialOption[];
	placeholder: string;
	dataTestId: string;
	credentialPermissions: PermissionsRecord['credential'];
	loading?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [credentialId: string];
	create: [];
}>();

const credentialOptions = computed<DropdownCredentialOption[]>(() =>
	[...props.credentials]
		.sort((a, b) => {
			const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
			return byName === 0 ? a.id.localeCompare(b.id) : byName;
		})
		.map((credential) => ({
			id: credential.id,
			name: credential.name,
			typeDisplayName: credential.typeDisplayName,
			homeProject: credential.homeProject,
		})),
);

function onCredentialSelected(credentialId: string) {
	emit('update:modelValue', credentialId);
}
</script>

<template>
	<CredentialsDropdown
		:credential-options="credentialOptions"
		:selected-credential-id="modelValue ?? null"
		:permissions="credentialPermissions"
		:placeholder="placeholder"
		:loading="loading"
		:disabled="disabled"
		:data-test-id="dataTestId"
		@credential-selected="onCredentialSelected"
		@new-credential="emit('create')"
	/>
</template>
