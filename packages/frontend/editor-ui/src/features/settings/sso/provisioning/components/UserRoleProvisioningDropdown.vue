<script lang="ts" setup>
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type SupportedProtocolType } from '../../sso.store';
import { useRBACStore } from '@/app/stores/rbac.store';

export type UserRoleProvisioningSetting =
	| 'disabled'
	| 'instance_role'
	| 'instance_and_project_roles';

const value = defineModel<UserRoleProvisioningSetting>({ default: 'disabled' });

const { authProtocol } = defineProps<{
	authProtocol: SupportedProtocolType;
}>();

const i18n = useI18n();
const canManageUserProvisioning = useRBACStore().hasScope('provisioning:manage');

const handleUserRoleProvisioningChange = (newValue: UserRoleProvisioningSetting) => {
	value.value = newValue;
};

type UserRoleProvisioningDescription = {
	label: string;
	value: UserRoleProvisioningSetting;
};

const userRoleProvisioningDescriptions: UserRoleProvisioningDescription[] = [
	{
		label: i18n.baseText('settings.sso.settings.userRoleProvisioning.option.disabled.label'),
		value: 'disabled',
	},
	{
		label: i18n.baseText('settings.sso.settings.userRoleProvisioning.option.instanceRole.label'),
		value: 'instance_role',
	},
	{
		label: i18n.baseText(
			'settings.sso.settings.userRoleProvisioning.option.instanceAndProjectRoles.label',
		),
		value: 'instance_and_project_roles',
	},
];
</script>
<template>
	<div :class="$style.group">
		<label>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.label') }}</label>
		<N8nSelect
			:model-value="value"
			:disabled="!canManageUserProvisioning"
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
			/>
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
