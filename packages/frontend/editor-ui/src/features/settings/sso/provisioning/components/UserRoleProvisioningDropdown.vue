<script lang="ts" setup>
import { computed } from 'vue';
import { N8nCallout, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type SupportedProtocolType } from '../../sso.store';
import { useRBACStore } from '@/app/stores/rbac.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export type RoleAssignmentSetting = 'manual' | 'instance' | 'instance_and_project';
export type RoleMappingMethodSetting = 'idp' | 'rules_in_n8n';

/**
 * Legacy type kept for backward compatibility with ConfirmProvisioningDialog.
 * Derived from the two new dropdown values.
 */
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

const { authProtocol } = defineProps<{
	authProtocol: SupportedProtocolType;
}>();

const i18n = useI18n();
const canManage = useRBACStore().hasScope('provisioning:manage');
const { check: isEnvFeatEnabled } = useEnvFeatureFlag();
const isRuleMappingEnabled = computed(() => isEnvFeatEnabled.value('ROLE_MAPPING_RULES'));
const showMappingMethod = computed(() => roleAssignment.value !== 'manual');
const showIdpInfoBox = computed(() => showMappingMethod.value && mappingMethod.value === 'idp');
const showRuleEditor = computed(
	() => showMappingMethod.value && mappingMethod.value === 'rules_in_n8n',
);

const idpInfoText = computed(() =>
	roleAssignment.value === 'instance_and_project'
		? i18n.baseText('settings.sso.settings.roleMappingMethod.idp.instanceAndProjectInfo')
		: i18n.baseText('settings.sso.settings.roleMappingMethod.idp.instanceInfo'),
);

const legacyValue = computed<UserRoleProvisioningSetting>(() => {
	if (roleAssignment.value === 'manual') return 'disabled';
	if (mappingMethod.value === 'rules_in_n8n') return 'expression_based';
	if (roleAssignment.value === 'instance_and_project') return 'instance_and_project_roles';
	return 'instance_role';
});

const roleAssignmentOptions = [
	{ value: 'manual', label: 'roleAssignment.manual', desc: 'roleAssignment.manual.description' },
	{ value: 'instance', label: 'roleAssignment.instanceRoles', desc: 'roleAssignment.instanceRoles.description' },
	{ value: 'instance_and_project', label: 'roleAssignment.instanceAndProjectRoles', desc: 'roleAssignment.instanceAndProjectRoles.description' },
];

const mappingMethodOptions = computed(() => {
	const opts = [
		{ value: 'idp', label: 'roleMappingMethod.idp', desc: 'roleMappingMethod.idp.description' },
	];
	if (isRuleMappingEnabled.value) {
		opts.push({ value: 'rules_in_n8n', label: 'roleMappingMethod.rulesInN8n', desc: 'roleMappingMethod.rulesInN8n.description' });
	}
	return opts;
});

const ssoKey = (key: string) => i18n.baseText(`settings.sso.settings.${key}`);

defineExpose({ legacyValue, showRuleEditor });
</script>
<template>
	<div>
		<!-- Dropdown 1: Role assignment -->
		<div :class="[$style.settingsItem, { [$style.noBorder]: !showMappingMethod }]">
			<div :class="$style.labelColumn">
				<label>{{ ssoKey('roleAssignment.label') }}</label>
				<small>{{ ssoKey('roleAssignment.description') }}</small>
			</div>
			<div :class="$style.controlColumn">
				<N8nSelect v-model="roleAssignment" size="medium" :disabled="!canManage" data-test-id="role-assignment-select">
					<N8nOption v-for="opt in roleAssignmentOptions" :key="opt.value" :label="ssoKey(opt.label)" :value="opt.value">
						<div :class="$style.optionContent">
							<span :class="$style.optionTitle">{{ ssoKey(opt.label) }}</span>
							<span :class="$style.optionDescription">{{ ssoKey(opt.desc) }}</span>
						</div>
					</N8nOption>
				</N8nSelect>
			</div>
		</div>

		<!-- Dropdown 2: Role mapping method (conditional) -->
		<div v-if="showMappingMethod" :class="$style.settingsItem">
			<div :class="$style.labelColumn">
				<label>{{ ssoKey('roleMappingMethod.label') }}</label>
				<small>{{ ssoKey('roleMappingMethod.description') }}</small>
			</div>
			<div :class="$style.controlColumn">
				<N8nSelect v-model="mappingMethod" size="medium" :disabled="!canManage" data-test-id="role-mapping-method-select">
					<N8nOption v-for="opt in mappingMethodOptions" :key="opt.value" :label="ssoKey(opt.label)" :value="opt.value">
						<div :class="$style.optionContent">
							<span :class="$style.optionTitle">{{ ssoKey(opt.label) }}</span>
							<span :class="$style.optionDescription">{{ ssoKey(opt.desc) }}</span>
						</div>
					</N8nOption>
				</N8nSelect>
			</div>
		</div>

		<!-- Info box for IdP-managed mode -->
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
	}
}

.controlColumn {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;

	> :deep(*) {
		width: 100%;
	}
}

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

.noBorder {
	border-bottom: none;
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
