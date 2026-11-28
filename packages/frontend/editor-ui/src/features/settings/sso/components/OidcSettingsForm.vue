<script lang="ts" setup>
import CopyInput from '@/app/components/CopyInput.vue';
import { MODAL_CONFIRM } from '@/app/constants';
import { SupportedProtocols, useSSOStore } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';

import { N8nInput, N8nOption, N8nSelect } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@n8n/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useUserRoleProvisioningForm } from '../provisioning/composables/useUserRoleProvisioningForm';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type OidcConfigDto } from '@n8n/api-types';
import ConfirmProvisioningDialog from '../provisioning/components/ConfirmProvisioningDialog.vue';
import RoleMappingRuleEditor from '../provisioning/components/RoleMappingRuleEditor.vue';
import UserRoleProvisioningDropdown from '../provisioning/components/UserRoleProvisioningDropdown.vue';
import { openSafeUrl } from '@/app/utils/htmlUtils';

const i18n = useI18n();
const ssoStore = useSSOStore();
const telemetry = useTelemetry();
const toast = useToast();
const message = useMessage();

const savingForm = ref<boolean>(false);
const roleMappingRuleEditorRef = ref<InstanceType<typeof RoleMappingRuleEditor> | null>(null);
const isSsoManagedByEnv = computed(() => ssoStore.ssoManagedByEnv);
const isRulesMappingInN8n = computed(() => mappingMethod.value === 'rules_in_n8n');

const discoveryEndpoint = ref('');
const clientId = ref('');
const clientSecret = ref('');

const showUserRoleProvisioningDialog = ref(false);

const {
	roleAssignment,
	mappingMethod,
	defaultInstanceRole,
	isUserRoleProvisioningChanged,
	saveProvisioningConfig,
	trackProvisioningChange,
	roleAssignmentTransition,
	storedHasProjectRoles,
	isDroppingProjectRules,
	revertRoleAssignment,
} = useUserRoleProvisioningForm(SupportedProtocols.OIDC);

type PromptType = 'login' | 'none' | 'consent' | 'select_account' | 'create';

const prompt = ref<PromptType>('select_account');

const handlePromptChange = (value: PromptType) => {
	prompt.value = value;
};

type PromptDescription = {
	label: string;
	value: PromptType;
};

const promptDescriptions: PromptDescription[] = [
	{ label: i18n.baseText('settings.sso.settings.oidc.prompt.login'), value: 'login' },
	{ label: i18n.baseText('settings.sso.settings.oidc.prompt.none'), value: 'none' },
	{ label: i18n.baseText('settings.sso.settings.oidc.prompt.consent'), value: 'consent' },
	{
		label: i18n.baseText('settings.sso.settings.oidc.prompt.select_account'),
		value: 'select_account',
	},
	{ label: i18n.baseText('settings.sso.settings.oidc.prompt.create'), value: 'create' },
];

const authenticationContextClassReference = ref('');
const additionalScopes = ref('');
const rpInitiatedLogoutEnabled = ref(false);
const isAdditionalScopesInvalid = computed(() =>
	[',', ';'].some((c) => additionalScopes.value.includes(c)),
);

const getOidcConfig = async () => {
	const config = await ssoStore.getOidcConfig();

	clientId.value = config.clientId;
	clientSecret.value = config.clientSecret;
	discoveryEndpoint.value = config.discoveryEndpoint;
	prompt.value = config.prompt ?? 'select_account';
	authenticationContextClassReference.value =
		config.authenticationContextClassReference?.join(',') || '';
	additionalScopes.value = config.additionalScopes ?? '';
	rpInitiatedLogoutEnabled.value = config.rpInitiatedLogoutEnabled ?? false;
};

const loadOidcConfig = async () => {
	if (!ssoStore.isEnterpriseOidcEnabled) {
		return;
	}
	try {
		await getOidcConfig();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error_oidc'));
	}
};

const cannotSaveOidcSettings = computed(() => {
	const currentAcrString = authenticationContextClassReference.value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.join(',');

	const storedAcrString = ssoStore.oidcConfig?.authenticationContextClassReference?.join(',') || '';

	const isRuleMappingDirty = roleMappingRuleEditorRef.value?.isDirty ?? false;

	return (
		isAdditionalScopesInvalid.value ||
		(ssoStore.oidcConfig?.clientId === clientId.value &&
			ssoStore.oidcConfig?.clientSecret === clientSecret.value &&
			ssoStore.oidcConfig?.discoveryEndpoint === discoveryEndpoint.value &&
			ssoStore.oidcConfig?.loginEnabled === ssoStore.isOidcLoginEnabled &&
			ssoStore.oidcConfig?.prompt === prompt.value &&
			ssoStore.oidcConfig?.additionalScopes === additionalScopes.value &&
			ssoStore.oidcConfig?.rpInitiatedLogoutEnabled === rpInitiatedLogoutEnabled.value &&
			!isUserRoleProvisioningChanged.value &&
			!isRuleMappingDirty &&
			storedAcrString === authenticationContextClassReference.value &&
			currentAcrString === storedAcrString)
	);
});

async function onOidcSettingsSave(provisioningChangesConfirmed: boolean = false): Promise<boolean> {
	if (isSsoManagedByEnv.value) {
		try {
			savingForm.value = true;
			const ruleSaveResult = await roleMappingRuleEditorRef.value?.save();
			trackProvisioningChange({ configChanged: false }, ruleSaveResult);
			toast.showMessage({
				title: i18n.baseText('settings.sso.settings.save.success'),
				type: 'success',
			});
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.sso.settings.save.error_oidc'));
			return false;
		} finally {
			savingForm.value = false;
		}
	}

	if (!provisioningChangesConfirmed && roleAssignmentTransition.value !== 'none') {
		showUserRoleProvisioningDialog.value = true;
		return false;
	}

	const isLoginEnabledChanged = ssoStore.oidcConfig?.loginEnabled !== ssoStore.isOidcLoginEnabled;
	const isDisablingOidcLogin = isLoginEnabledChanged && ssoStore.oidcConfig?.loginEnabled === true;
	if (isDisablingOidcLogin) {
		const confirmAction = await message.confirm(
			i18n.baseText('settings.sso.confirmMessage.beforeSaveForm.message', {
				interpolate: { protocol: 'OIDC' },
			}),
			i18n.baseText('settings.sso.confirmMessage.beforeSaveForm.headline', {
				interpolate: { protocol: 'OIDC' },
			}),
			{
				cancelButtonText: i18n.baseText(
					'settings.ldap.confirmMessage.beforeSaveForm.cancelButtonText',
				),
				confirmButtonText: i18n.baseText(
					'settings.ldap.confirmMessage.beforeSaveForm.confirmButtonText',
				),
			},
		);
		if (confirmAction !== MODAL_CONFIRM) return false;
	}

	const acrArray = authenticationContextClassReference.value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	try {
		savingForm.value = true;
		const newConfig = await ssoStore.saveOidcConfig({
			clientId: clientId.value,
			clientSecret: clientSecret.value,
			discoveryEndpoint: discoveryEndpoint.value,
			prompt: prompt.value,
			loginEnabled: ssoStore.isOidcLoginEnabled,
			authenticationContextClassReference: acrArray,
			additionalScopes: additionalScopes.value,
			rpInitiatedLogoutEnabled: rpInitiatedLogoutEnabled.value,
		});
		const provisioningResult = await saveProvisioningConfig(isDisablingOidcLogin);

		// If the user's effective role assignment doesn't include project roles,
		// discard any project-rule state in the editor (both locally-added and
		// server-backed entries) so editor.save() doesn't try to POST/PATCH rules
		// that shouldn't exist. Checking the current dropdown at save-time is
		// robust against storedHasProjectRules drift.
		const effectiveRoleAssignment = isDisablingOidcLogin ? 'manual' : roleAssignment.value;
		if (effectiveRoleAssignment !== 'instance_and_project') {
			roleMappingRuleEditorRef.value?.discardProjectRules();
		}

		const ruleSaveResult =
			mappingMethod.value === 'rules_in_n8n'
				? await roleMappingRuleEditorRef.value?.save()
				: undefined;

		trackProvisioningChange(provisioningResult, ruleSaveResult);

		showUserRoleProvisioningDialog.value = false;

		// Update store with saved protocol selection
		ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;

		clientSecret.value = newConfig.clientSecret;

		sendTrackingEvent(newConfig);
		toast.showMessage({
			title: i18n.baseText('settings.sso.settings.save.success'),
			type: 'success',
		});
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error_oidc'));
		return false;
	} finally {
		await getOidcConfig();
		savingForm.value = false;
	}
}

function sendTrackingEvent(config: OidcConfigDto) {
	telemetry.track(TELEMETRY_EVENT.SSO.USER_UPDATED_SSO_SETTINGS, {
		instance_id: useRootStore().instanceId,
		authentication_method: SupportedProtocols.OIDC,
		discovery_endpoint: config.discoveryEndpoint,
		is_active: config.loginEnabled,
	});
}

const isTestEnabled = computed(
	() =>
		!!ssoStore.oidcConfig?.discoveryEndpoint &&
		ssoStore.oidcConfig.discoveryEndpoint !== '' &&
		!!ssoStore.oidcConfig?.clientId &&
		!!ssoStore.oidcConfig?.clientSecret,
);

const onTest = async () => {
	try {
		const { url } = await ssoStore.testOidcConfig();
		if (typeof window !== 'undefined') {
			openSafeUrl(url);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.test.error'));
	}
};

const hasUnsavedChanges = computed(
	() =>
		!cannotSaveOidcSettings.value &&
		!savingForm.value &&
		(!isSsoManagedByEnv.value || isRulesMappingInN8n.value),
);

// The SSO page saves through its save bar, so it needs these.
// The SSO page shows the test button below the SCIM section, so it needs these.
defineExpose({
	hasUnsavedChanges,
	onSave: onOidcSettingsSave,
	saving: savingForm,
	isTestEnabled,
	onTest,
});

onMounted(async () => {
	await loadOidcConfig();
});
</script>
<template>
	<div>
		<div :class="[$style.card, $style.firstCard]">
			<slot name="protocol-select" />
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.redirectUrl.label') }}</label>
				<CopyInput
					:value="ssoStore.oidc.callbackUrl"
					:copy-button-text="i18n.baseText('generic.clickToCopy')"
					:toast-title="i18n.baseText('settings.sso.settings.redirectUrl.copied')"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.oidc.redirectUrl.help') }}</small>
			</div>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.oidc.discoveryEndpoint.label') }}</label>
				<N8nInput
					:model-value="discoveryEndpoint"
					:disabled="isSsoManagedByEnv"
					type="text"
					data-test-id="oidc-discovery-endpoint"
					placeholder="https://accounts.google.com/.well-known/openid-configuration"
					@update:model-value="(v: string) => (discoveryEndpoint = v)"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.oidc.discoveryEndpoint.help') }}</small>
			</div>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.oidc.clientId.label') }}</label>
				<N8nInput
					:model-value="clientId"
					:disabled="isSsoManagedByEnv"
					type="text"
					data-test-id="oidc-client-id"
					@update:model-value="(v: string) => (clientId = v)"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.oidc.clientId.help') }}</small>
			</div>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.oidc.clientSecret.label') }}</label>
				<N8nInput
					:model-value="clientSecret"
					:disabled="isSsoManagedByEnv"
					type="password"
					data-test-id="oidc-client-secret"
					@update:model-value="(v: string) => (clientSecret = v)"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.oidc.clientSecret.help') }}</small>
			</div>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.oidc.prompt.label') }}</label>
				<N8nSelect
					:model-value="prompt"
					:disabled="isSsoManagedByEnv"
					data-test-id="oidc-prompt"
					@update:model-value="handlePromptChange"
				>
					<N8nOption
						v-for="option in promptDescriptions"
						:key="option.value"
						:label="option.label"
						data-test-id="oidc-prompt-filter-option"
						:value="option.value"
					/>
				</N8nSelect>
				<small>{{ i18n.baseText('settings.sso.settings.oidc.prompt.help') }}</small>
			</div>
		</div>
		<div :class="$style.card">
			<UserRoleProvisioningDropdown
				v-model:role-assignment="roleAssignment"
				v-model:mapping-method="mappingMethod"
				v-model:default-instance-role="defaultInstanceRole"
				auth-protocol="oidc"
				:disabled="isSsoManagedByEnv"
			/>
			<RoleMappingRuleEditor
				v-if="mappingMethod === 'rules_in_n8n'"
				ref="roleMappingRuleEditorRef"
				v-model:default-instance-role="defaultInstanceRole"
				:show-project-rules="roleAssignment === 'instance_and_project'"
			/>
			<ConfirmProvisioningDialog
				v-model="showUserRoleProvisioningDialog"
				:transition-type="roleAssignmentTransition"
				:show-project-roles-csv="storedHasProjectRoles || roleAssignment === 'instance_and_project'"
				:will-delete-project-rules="isDroppingProjectRules"
				auth-protocol="oidc"
				@confirm-provisioning="onOidcSettingsSave(true)"
				@cancel="
					revertRoleAssignment();
					showUserRoleProvisioningDialog = false;
				"
			/>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.oidc.acr.label') }}</label>
				<N8nInput
					:model-value="authenticationContextClassReference"
					type="textarea"
					:disabled="isSsoManagedByEnv"
					data-test-id="oidc-authentication-context-class-reference"
					placeholder="mfa, phrh, pwd"
					@update:model-value="(v: string) => (authenticationContextClassReference = v)"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.oidc.acr.help') }}</small>
			</div>
			<div :class="$style.group">
				<label
					>{{ i18n.baseText('settings.sso.settings.oidc.additionalScopes.label') }}
					<span :class="$style.optional">{{
						i18n.baseText('settings.sso.settings.oidc.additionalScopes.optional')
					}}</span>
				</label>
				<N8nInput
					:model-value="additionalScopes"
					:disabled="isSsoManagedByEnv"
					type="text"
					data-test-id="oidc-additional-scopes"
					:placeholder="i18n.baseText('settings.sso.settings.oidc.additionalScopes.placeholder')"
					@update:model-value="(v: string) => (additionalScopes = v)"
				/>
				<small v-if="isAdditionalScopesInvalid" :class="$style.fieldError">{{
					i18n.baseText('settings.sso.settings.oidc.additionalScopes.invalid')
				}}</small>
				<small v-else>
					<I18nT
						keypath="settings.sso.settings.oidc.additionalScopes.help"
						tag="span"
						scope="global"
					>
						<template #openid><code>openid</code></template>
						<template #profile><code>profile</code></template>
						<template #email><code>email</code></template>
					</I18nT>
				</small>
			</div>
		</div>
		<div :class="$style.card">
			<div :class="$style.settingsItem">
				<div :class="$style.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.ssoToggle.label') }}</label>
					<small>{{ i18n.baseText('settings.sso.settings.ssoToggle.description') }}</small>
				</div>
				<div :class="$style.settingsItemControl">
					<N8nSelect
						:model-value="ssoStore.isOidcLoginEnabled ? 'enabled' : 'disabled'"
						size="medium"
						data-test-id="sso-oidc-toggle"
						:disabled="isSsoManagedByEnv"
						@update:model-value="ssoStore.isOidcLoginEnabled = $event === 'enabled'"
					>
						<template #prefix>
							<span v-if="ssoStore.isOidcLoginEnabled" :class="$style.greenDot" />
						</template>
						<N8nOption
							value="enabled"
							:label="i18n.baseText('settings.sso.settings.ssoToggle.enabled')"
							data-test-id="sso-oidc-toggle-option"
						/>
						<N8nOption
							value="disabled"
							:label="i18n.baseText('settings.sso.settings.ssoToggle.disabled')"
							data-test-id="sso-oidc-toggle-option"
						/>
					</N8nSelect>
				</div>
			</div>
			<div :class="$style.settingsItem">
				<div :class="$style.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.oidc.logoutToggle.label') }}</label>
					<small>{{ i18n.baseText('settings.sso.settings.oidc.logoutToggle.description') }}</small>
				</div>
				<div :class="$style.settingsItemControl">
					<N8nSelect
						:model-value="rpInitiatedLogoutEnabled ? 'enabled' : 'disabled'"
						size="medium"
						data-test-id="sso-oidc-logout-toggle"
						:disabled="isSsoManagedByEnv"
						@update:model-value="rpInitiatedLogoutEnabled = $event === 'enabled'"
					>
						<template #prefix>
							<span v-if="rpInitiatedLogoutEnabled" :class="$style.greenDot" />
						</template>
						<N8nOption
							value="enabled"
							:label="i18n.baseText('settings.sso.settings.ssoToggle.enabled')"
						/>
						<N8nOption
							value="disabled"
							:label="i18n.baseText('settings.sso.settings.ssoToggle.disabled')"
						/>
					</N8nSelect>
				</div>
			</div>
		</div>
	</div>
</template>
<style lang="scss" module src="../styles/sso-form.module.scss" />
