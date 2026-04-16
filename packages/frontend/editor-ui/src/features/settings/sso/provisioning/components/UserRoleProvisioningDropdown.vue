<script lang="ts" setup>
import { computed } from 'vue';
import { N8nCallout, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { type SupportedProtocolType } from '../../sso.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export type RoleAssignmentSetting = 'manual' | 'instance' | 'instance_and_project';
export type RoleMappingMethodSetting = 'idp' | 'rules_in_n8n';

export type UserRoleProvisioningSetting =
	| 'disabled'
	| 'instance_role'
	| 'instance_and_project_roles'
	| 'expression_based';

const roleAssignment = defineModel<RoleAssignmentSetting>('roleAssignment', {
	default: 'manual',
});
const mappingMethod = defineModel<RoleMappingMethodSetting>('mappingMethod', {
	default: 'idp',
});

const legacyValue = defineModel<UserRoleProvisioningSetting>('legacyValue', {
	default: 'disabled',
});

const { authProtocol, disabled = false } = defineProps<{
	authProtocol: SupportedProtocolType;
	disabled?: boolean;
}>();

const i18n = useI18n();
const canManage = useRBACStore().hasScope('provisioning:manage');
const { check: isEnvFeatEnabled } = useEnvFeatureFlag();
const isRuleMappingEnabled = computed(() => isEnvFeatEnabled.value('ROLE_MAPPING_RULES'));
const showMappingMethod = computed(() => roleAssignment.value !== 'manual');
const showIdpInfoBox = computed(() => showMappingMethod.value && mappingMethod.value === 'idp');
const idpInfoText = computed(() =>
	roleAssignment.value === 'instance_and_project'
		? i18n.baseText('settings.sso.settings.roleMappingMethod.idp.instanceAndProjectInfo')
		: i18n.baseText('settings.sso.settings.roleMappingMethod.idp.instanceInfo'),
);

const roleAssignmentOptions = [
	{ value: 'manual', label: 'roleAssignment.manual', desc: 'roleAssignment.manual.description' },
	{
		value: 'instance',
		label: 'roleAssignment.instanceRoles',
		desc: 'roleAssignment.instanceRoles.description',
	},
	{
		value: 'instance_and_project',
		label: 'roleAssignment.instanceAndProjectRoles',
		desc: 'roleAssignment.instanceAndProjectRoles.description',
	},
];

const mappingMethodOptions = computed(() => {
	const opts = [
		{ value: 'idp', label: 'roleMappingMethod.idp', desc: 'roleMappingMethod.idp.description' },
	];
	if (isRuleMappingEnabled.value) {
		opts.push({
			value: 'rules_in_n8n',
			label: 'roleMappingMethod.rulesInN8n',
			desc: 'roleMappingMethod.rulesInN8n.description',
		});
	}
	return opts;
});

const ssoKey = (key: string) => i18n.baseText(`settings.sso.settings.${key}` as BaseTextKey);

const legacyOptions: Array<{ label: string; value: UserRoleProvisioningSetting }> = [
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
	<div>
		<template v-if="!isRuleMappingEnabled">
			<div :class="[shared.settingsItem, shared.settingsItemNoBorder]">
				<div :class="shared.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.label') }}</label>
					<small
						>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.help') }}
						<a
							:href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`"
							target="_blank"
							>{{ i18n.baseText('settings.sso.settings.userRoleProvisioning.help.linkText') }}</a
						>
					</small>
				</div>
				<div :class="shared.settingsItemControl">
					<N8nSelect
						:model-value="legacyValue"
						:disabled="disabled || !canManage"
						data-test-id="oidc-user-role-provisioning"
						@update:model-value="legacyValue = $event as UserRoleProvisioningSetting"
					>
						<N8nOption
							v-for="option in legacyOptions"
							:key="option.value"
							:label="option.label"
							data-test-id="oidc-user-role-provisioning-option"
							:value="option.value"
						/>
					</N8nSelect>
				</div>
			</div>
		</template>

		<template v-else>
			<div :class="[shared.settingsItem, { [shared.settingsItemNoBorder]: !showMappingMethod }]">
				<div :class="shared.settingsItemLabel">
					<label>{{ ssoKey('roleAssignment.label') }}</label>
					<small>{{ ssoKey('roleAssignment.description') }}</small>
				</div>
				<div :class="shared.settingsItemControl">
					<N8nSelect
						v-model="roleAssignment"
						size="medium"
						:disabled="disabled || !canManage"
						data-test-id="role-assignment-select"
					>
						<N8nOption
							v-for="opt in roleAssignmentOptions"
							:key="opt.value"
							:label="ssoKey(opt.label)"
							:value="opt.value"
						>
							<div :class="$style.optionContent">
								<span :class="$style.optionTitle">{{ ssoKey(opt.label) }}</span>
								<span :class="$style.optionDescription">{{ ssoKey(opt.desc) }}</span>
							</div>
						</N8nOption>
					</N8nSelect>
				</div>
			</div>

			<div v-if="showMappingMethod" :class="shared.settingsItem">
				<div :class="shared.settingsItemLabel">
					<label>{{ ssoKey('roleMappingMethod.label') }}</label>
					<small>{{ ssoKey('roleMappingMethod.description') }}</small>
				</div>
				<div :class="shared.settingsItemControl">
					<N8nSelect
						v-model="mappingMethod"
						size="medium"
						:disabled="disabled || !canManage"
						data-test-id="role-mapping-method-select"
					>
						<N8nOption
							v-for="opt in mappingMethodOptions"
							:key="opt.value"
							:label="ssoKey(opt.label)"
							:value="opt.value"
						>
							<div :class="$style.optionContent">
								<span :class="$style.optionTitle">{{ ssoKey(opt.label) }}</span>
								<span :class="$style.optionDescription">{{ ssoKey(opt.desc) }}</span>
							</div>
						</N8nOption>
					</N8nSelect>
				</div>
			</div>

			<div v-if="showIdpInfoBox" :class="$style.infoBox">
				<N8nCallout theme="custom" icon="info" :class="$style.callout">
					<div>
						{{ idpInfoText }}
					</div>
					<a
						:href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`"
						target="_blank"
						:class="$style.learnMoreLink"
						>{{ i18n.baseText('settings.sso.settings.roleMappingMethod.idp.learnMore') }}</a
					>
				</N8nCallout>
			</div>
		</template>
	</div>
</template>
<style lang="scss" module="shared" src="../../styles/sso-form.module.scss" />
<style lang="scss" module>
.optionContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs) 0;
	white-space: normal;
	line-height: var(--line-height--md);
}

.optionTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.optionDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.callout {
	background-color: var(--color--background);
	border-color: var(--color--foreground);

	:global(.n8n-callout-icon svg) {
		color: var(--color--text--shade-1);
	}
}

.infoBox {
	padding: var(--spacing--xs) 0;
}

.learnMoreLink {
	display: block;
	margin-top: var(--spacing--4xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	text-decoration: underline;

	&:hover {
		color: var(--color--primary);
	}
}
</style>
