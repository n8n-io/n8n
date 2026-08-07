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

type AgentCredentialSelectSize = 'xlarge' | 'large' | 'medium' | 'small' | 'mini';

const props = withDefaults(
	defineProps<{
		modelValue?: string;
		credentials: AgentCredentialOption[];
		placeholder: string;
		dataTestId: string;
		credentialPermissions: PermissionsRecord['credential'];
		loading?: boolean;
		disabled?: boolean;
		size?: AgentCredentialSelectSize;
	}>(),
	{
		size: 'small',
	},
);

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
		:class="$style[props.size]"
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

<style lang="scss" module>
.xlarge {
	--agent-credential-select-height: var(--height--xl);
	--agent-credential-select-font-size: var(--font-size--md);
}

.large {
	--agent-credential-select-height: var(--height--lg);
	--agent-credential-select-font-size: var(--font-size--sm);
}

.medium {
	--agent-credential-select-height: var(--height--md);
	--agent-credential-select-font-size: var(--font-size--sm);
}

.small {
	--agent-credential-select-height: var(--height--sm);
	--agent-credential-select-font-size: var(--font-size--xs);
}

.mini {
	--agent-credential-select-height: var(--height--xs);
	--agent-credential-select-font-size: var(--font-size--2xs);
}

.xlarge,
.large,
.medium,
.small,
.mini {
	:global(.el-input__inner) {
		height: var(--agent-credential-select-height);
		min-height: var(--agent-credential-select-height);
		line-height: var(--agent-credential-select-height);
		font-size: var(--agent-credential-select-font-size);
	}
}
</style>
