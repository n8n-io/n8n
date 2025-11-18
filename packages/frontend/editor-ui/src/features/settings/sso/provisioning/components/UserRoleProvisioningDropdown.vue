<script lang="ts" setup>
import { SSO_JUST_IN_TIME_PROVSIONING_EXPERIMENT } from '@/app/constants';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';

import { N8nOption, N8nSelect } from '@n8n/design-system';
import { onMounted } from 'vue';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUserRoleProvisioningStore } from '../composables/userRoleProvisioning.store';

export type UserRoleProvisioningSetting =
	| 'disabled'
	| 'instance_role'
	| 'instance_and_project_roles';

const value = defineModel<UserRoleProvisioningSetting>({ default: 'disabled' });

const posthogStore = usePostHog();
const userRoleProvisioningStore = useUserRoleProvisioningStore();

const isUserRoleProvisioningFeatureEnabled = posthogStore.isFeatureEnabled(
	SSO_JUST_IN_TIME_PROVSIONING_EXPERIMENT.name,
);

const handleUserRoleProvisioningChange = (newValue: UserRoleProvisioningSetting) => {
	value.value = newValue;
};

const getUserRoleProvisioningValueFromConfig = (
	config?: ProvisioningConfig,
): UserRoleProvisioningSetting => {
	if (!config) {
		return 'disabled';
	}
	if (config.scopesProvisionInstanceRole && config.scopesProvisionProjectRoles) {
		return 'instance_and_project_roles';
	} else if (config.scopesProvisionInstanceRole) {
		return 'instance_role';
	} else {
		return 'disabled';
	}
};

type UserRoleProvisioningDescription = {
	label: string;
	description: string;
	value: UserRoleProvisioningSetting;
};

// TODO: translate
const userRoleProvisioningDescriptions: UserRoleProvisioningDescription[] = [
	{
		label: 'Disabled',
		value: 'disabled',
		description: 'User and project roles are managed inside the n8n settings.',
	},
	{
		label: 'Instance role',
		value: 'instance_role',
		description:
			'The instance role of a user is configured in the "n8n_instance_role" attribute on your SSO provider. If none is set on the SSO provider, the member role is used as fallback.',
	},
	{
		label: 'Instance and project roles',
		value: 'instance_and_project_roles',
		description:
			'The list of projects a user has access to is configured on the "n8n_projects" string array attribute on your SSO provider. Project access cannot be granted from within n8n.',
	},
];

const loadUserRoleProvisioningConfig = async () => {
	const config = await userRoleProvisioningStore.getProvisioningConfig();
	value.value = getUserRoleProvisioningValueFromConfig(config);
};

onMounted(async () => {
	await loadUserRoleProvisioningConfig();
});
</script>
<template>
	<!-- TODO: also check for 'provisioning:manage' permission scope -->
	<div v-if="isUserRoleProvisioningFeatureEnabled" :class="$style.group">
		<label>User role provisioning</label>
		<N8nSelect
			:model-value="value"
			data-test-id="oidc-user-role-provisioning"
			:class="$style.userRoleProvisioningSelect"
			@update:model-value="handleUserRoleProvisioningChange"
		>
			<N8nOption
				v-for="option in userRoleProvisioningDescriptions"
				:key="option.value"
				:label="option.label"
				data-test-id="oidc-user-role-provisioning-option"
				:value="option.value"
			>
				<div class="list-option">
					<div class="option-headline">{{ option.label }}</div>
					<div class="option-description">{{ option.description }}</div>
				</div>
			</N8nOption>
		</N8nSelect>
	</div>
</template>
<style lang="scss" module>
.group {
	padding: var(--spacing--xl) 0 0;

	> label {
		display: inline-block;
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--medium);
		padding: 0 0 var(--spacing--2xs);
	}

	small {
		display: block;
		padding: var(--spacing--2xs) 0 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text);
	}
}

.userRoleProvisioningSelect {
	display: block;
	max-width: 400px;
}
</style>
