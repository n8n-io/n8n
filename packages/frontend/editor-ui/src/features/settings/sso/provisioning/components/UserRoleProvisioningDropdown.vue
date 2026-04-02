<script lang="ts" setup>
import { computed } from 'vue';
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type SupportedProtocolType } from '../../sso.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export type UserRoleProvisioningSetting =
	| 'disabled'
	| 'instance_role'
	| 'instance_and_project_roles'
	| 'expression_based';

const value = defineModel<UserRoleProvisioningSetting>({ default: 'disabled' });

const { authProtocol } = defineProps<{
	authProtocol: SupportedProtocolType;
}>();

const i18n = useI18n();
const canManageUserProvisioning = useRBACStore().hasScope('provisioning:manage');
const { check: isEnvFeatEnabled } = useEnvFeatureFlag();

const handleUserRoleProvisioningChange = (newValue: UserRoleProvisioningSetting) => {
	value.value = newValue;
};

type UserRoleProvisioningDescription = {
	label: string;
	value: UserRoleProvisioningSetting;
};

const baseOptions: UserRoleProvisioningDescription[] = [
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

const userRoleProvisioningDescriptions = computed<UserRoleProvisioningDescription[]>(() => {
	if (isEnvFeatEnabled.value('ROLE_MAPPING_RULES')) {
		return [
			...baseOptions,
			{
				label: i18n.baseText(
					'settings.sso.settings.userRoleProvisioning.option.expressionBased.label',
				),
				value: 'expression_based',
			},
		];
	}
	return baseOptions;
});
</script>
<template>
	<div :class="[$style.settingsItem, { [$style.noBorder]: value !== 'expression_based' }]">
		<div :class="$style.labelColumn">
			<label>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.label') }}</label>
			<small
				>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.help') }}
				<a :href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`" target="_blank">{{
					i18n.baseText('settings.sso.settings.userRoleProvisioning.help.linkText')
				}}</a>
			</small>
		</div>
		<div :class="$style.controlColumn">
			<N8nSelect
				:model-value="value"
				:disabled="!canManageUserProvisioning"
				data-test-id="oidc-user-role-provisioning"
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
		</div>
	</div>
</template>
<style lang="scss" module>
.settingsItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 64px;
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
}

.labelColumn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	width: 320px;

	label {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--shade-1);
	}

	small {
		font-size: var(--font-size--2xs);
		color: var(--color--text--tint-1);

		a {
			color: var(--color--primary);
		}
	}
}

.controlColumn {
	width: 250px;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;

	> :deep(*) {
		width: 100%;
	}
}

.noBorder {
	border-bottom: none;
}
</style>
