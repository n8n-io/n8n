<script lang="ts" setup>
import { computed } from 'vue';
import { N8nCallout, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type SupportedProtocolType } from '../../sso.store';
import { useRBACStore } from '@/app/stores/rbac.store';

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

/**
 * Derives the legacy single-value setting from the two dropdowns.
 * Used by ConfirmProvisioningDialog and the save flow.
 */
const legacyValue = computed<UserRoleProvisioningSetting>(() => {
	if (roleAssignment.value === 'manual') return 'disabled';
	if (mappingMethod.value === 'rules_in_n8n') return 'expression_based';
	if (roleAssignment.value === 'instance_and_project') return 'instance_and_project_roles';
	return 'instance_role';
});

defineExpose({ legacyValue, showRuleEditor });
</script>
<template>
	<div>
		<!-- Dropdown 1: Role assignment -->
		<div :class="$style.settingsItem">
			<div :class="$style.labelColumn">
				<label>{{ i18n.baseText('settings.sso.settings.roleAssignment.label') }}</label>
				<small>{{ i18n.baseText('settings.sso.settings.roleAssignment.description') }} </small>
			</div>
			<div :class="$style.controlColumn">
				<N8nSelect
					v-model="roleAssignment"
					:disabled="!canManage"
					data-test-id="role-assignment-select"
				>
					<N8nOption
						:label="i18n.baseText('settings.sso.settings.roleAssignment.manual')"
						value="manual"
					/>
					<N8nOption
						:label="i18n.baseText('settings.sso.settings.roleAssignment.instanceRoles')"
						value="instance"
					/>
					<N8nOption
						:label="i18n.baseText('settings.sso.settings.roleAssignment.instanceAndProjectRoles')"
						value="instance_and_project"
					/>
				</N8nSelect>
			</div>
		</div>

		<!-- Dropdown 2: Role mapping method (conditional) -->
		<div v-if="showMappingMethod" :class="$style.settingsItem">
			<div :class="$style.labelColumn">
				<label>{{ i18n.baseText('settings.sso.settings.roleMappingMethod.label') }}</label>
				<small>{{ i18n.baseText('settings.sso.settings.roleMappingMethod.description') }}</small>
			</div>
			<div :class="$style.controlColumn">
				<N8nSelect
					v-model="mappingMethod"
					:disabled="!canManage"
					data-test-id="role-mapping-method-select"
				>
					<N8nOption
						:label="i18n.baseText('settings.sso.settings.roleMappingMethod.idp')"
						value="idp"
					/>
					<N8nOption
						:label="i18n.baseText('settings.sso.settings.roleMappingMethod.rulesInN8n')"
						value="rules_in_n8n"
					/>
				</N8nSelect>
			</div>
		</div>

		<!-- Info box for IdP-managed mode -->
		<div v-if="showIdpInfoBox" :class="$style.infoBox">
			<N8nCallout theme="secondary">
				{{ idpInfoText }}
				<a :href="`https://docs.n8n.io/user-management/${authProtocol}/setup/`" target="_blank">{{
					i18n.baseText('settings.sso.settings.roleMappingMethod.idp.learnMore')
				}}</a>
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
	width: 250px;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;

	> :deep(*) {
		width: 100%;
	}
}

.infoBox {
	padding: var(--spacing--xs) 0;

	a {
		color: var(--color--primary);
	}
}
</style>
