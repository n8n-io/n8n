<script lang="ts" setup>
import { SSO_JUST_IN_TIME_PROVSIONING_EXPERIMENT } from '@/app/constants';
import type { ProvisioningConfig } from '@n8n/rest-api-client/api/provisioning';

import { N8nOption, N8nSelect } from '@n8n/design-system';
import { onMounted } from 'vue';
import { usePostHog } from '@/app/stores/posthog.store';
import { useUserRoleProvisioningStore } from '../composables/userRoleProvisioning.store';
import { useI18n } from '@n8n/i18n';
import { type SupportedProtocolType } from '../../sso.store';

export type UserRoleProvisioningSetting =
	| 'disabled'
	| 'instance_role'
	| 'instance_and_project_roles';

const value = defineModel<UserRoleProvisioningSetting>({ default: 'disabled' });

const { authProtocol } = defineProps<{
	authProtocol: SupportedProtocolType;
}>();

const i18n = useI18n();
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

const userRoleProvisioningDescriptions: UserRoleProvisioningDescription[] = [
	{
		label: i18n.baseText('settings.sso.settings.userRoleProvisioning.option.disabled.label'),
		value: 'disabled',
		description: i18n.baseText(
			'settings.sso.settings.userRoleProvisioning.option.disabled.description',
		),
	},
	{
		label: i18n.baseText('settings.sso.settings.userRoleProvisioning.option.instanceRole.label'),
		value: 'instance_role',
		description: i18n.baseText(
			'settings.sso.settings.userRoleProvisioning.option.instanceRole.description',
		),
	},
	{
		label: i18n.baseText(
			'settings.sso.settings.userRoleProvisioning.option.instanceAndProjectRoles.label',
		),
		value: 'instance_and_project_roles',
		description: i18n.baseText(
			'settings.sso.settings.userRoleProvisioning.option.instanceAndProjectRoles.description',
		),
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
		<label>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.label') }}</label>
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
		<small
			>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.help') }}
			<a :href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`" target="_blank">{{
				i18n.baseText('settings.sso.settings.userRoleProvisioning.help.linkText')
			}}</a></small
		>
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
