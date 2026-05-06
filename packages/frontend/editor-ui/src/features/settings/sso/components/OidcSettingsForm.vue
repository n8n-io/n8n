<script lang="ts" setup>
import CopyInput from '@/app/components/CopyInput.vue';
import { MODAL_CONFIRM } from '@/app/constants';
import { SupportedProtocols, useSSOStore } from '../sso.store';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nInput, N8nOption, N8nSelect } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useUserRoleProvisioningForm } from '../provisioning/composables/useUserRoleProvisioningForm';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type OidcConfigDto } from '@n8n/api-types';
import ConfirmProvisioningDialog from '../provisioning/components/ConfirmProvisioningDialog.vue';
import RoleMappingRuleEditor from '../provisioning/components/RoleMappingRuleEditor.vue';
import UserRoleProvisioningDropdown from '../provisioning/components/UserRoleProvisioningDropdown.vue';

const i18n = useI18n();
const ssoStore = useSSOStore();
const telemetry = useTelemetry();
const toast = useToast();
const message = useMessage();

const savingForm = ref<boolean>(false);
const roleMappingRuleEditorRef = ref<InstanceType<typeof RoleMappingRuleEditor> | null>(null);
const isSsoManagedByEnv = computed(() => ssoStore.ssoManagedByEnv);

const discoveryEndpoint = ref('');
const clientId = ref('');
const clientSecret = ref('');

const showUserRoleProvisioningDialog = ref(false);

const {
	roleAssignment,
	mappingMethod,
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

const getOidcConfig = async () => {
	const config = await ssoStore.getOidcConfig();

	clientId.value = config.clientId;
	clientSecret.value = config.clientSecret;
	discoveryEndpoint.value = config.discoveryEndpoint;
	prompt.value = config.prompt ?? 'select_account';
	authenticationContextClassReference.value =
		config.authenticationContextClassReference?.join(',') || '';
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
		ssoStore.oidcConfig?.clientId === clientId.value &&
		ssoStore.oidcConfig?.clientSecret === clientSecret.value &&
		ssoStore.oidcConfig?.discoveryEndpoint === discoveryEndpoint.value &&
		ssoStore.oidcConfig?.loginEnabled === ssoStore.isOidcLoginEnabled &&
		ssoStore.oidcConfig?.prompt === prompt.value &&
		!isUserRoleProvisioningChanged.value &&
		!isRuleMappingDirty &&
		storedAcrString === authenticationContextClassReference.value &&
		currentAcrString === storedAcrString
	);
});

async function onOidcSettingsSave(provisioningChangesConfirmed: boolean = false): Promise<boolean> {
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
	const trackingMetadata = {
		instance_id: useRootStore().instanceId,
		authentication_method: SupportedProtocols.OIDC,
		discovery_endpoint: config.discoveryEndpoint,
		is_active: config.loginEnabled,
	};
	telemetry.track('User updated single sign on settings', trackingMetadata);
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
			window.open(url, '_blank');
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.test.error'));
	}
};

const hasUnsavedChanges = computed(
	() => !cannotSaveOidcSettings.value && !savingForm.value && !isSsoManagedByEnv.value,
);

defineExpose({ hasUnsavedChanges, onSave: onOidcSettingsSave });

onMounted(async () => {
	await loadOidcConfig();
});
</script>
<template>
	<div>
		<div :class="[$style.card, $style.firstCard]">
			<slot name="protocol-select" />
			<div :class="$style.group">
				<label>Redirect URL</label>
				<CopyInput
					:value="ssoStore.oidc.callbackUrl"
					:copy-button-text="i18n.baseText('generic.clickToCopy')"
					toast-title="Redirect URL copied to clipboard"
				/>
				<small>Copy the Redirect URL to configure your OIDC provider </small>
			</div>
			<div :class="$style.group">
				<label>Discovery Endpoint</label>
				<N8nInput
					:model-value="discoveryEndpoint"
					:disabled="isSsoManagedByEnv"
					type="text"
					data-test-id="oidc-discovery-endpoint"
					placeholder="https://accounts.google.com/.well-known/openid-configuration"
					@update:model-value="(v: string) => (discoveryEndpoint = v)"
				/>
				<small>Paste here your discovery endpoint</small>
			</div>
			<div :class="$style.group">
				<label>Client ID</label>
				<N8nInput
					:model-value="clientId"
					:disabled="isSsoManagedByEnv"
					type="text"
					data-test-id="oidc-client-id"
					@update:model-value="(v: string) => (clientId = v)"
				/>
				<small
					>The client ID you received when registering your application with your provider</small
				>
			</div>
			<div :class="$style.group">
				<label>Client Secret</label>
				<N8nInput
					:model-value="clientSecret"
					:disabled="isSsoManagedByEnv"
					type="password"
					data-test-id="oidc-client-secret"
					@update:model-value="(v: string) => (clientSecret = v)"
				/>
				<small
					>The client Secret you received when registering your application with your
					provider</small
				>
			</div>
			<div :class="$style.group">
				<label>Prompt</label>
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
				<small>The prompt parameter to use when authenticating with the OIDC provider</small>
			</div>
		</div>
		<div :class="$style.card">
			<UserRoleProvisioningDropdown
				v-model:role-assignment="roleAssignment"
				v-model:mapping-method="mappingMethod"
				auth-protocol="oidc"
				:disabled="isSsoManagedByEnv"
			/>
			<RoleMappingRuleEditor
				v-if="mappingMethod === 'rules_in_n8n'"
				ref="roleMappingRuleEditorRef"
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
				<label>Authentication Context Class Reference</label>
				<N8nInput
					:model-value="authenticationContextClassReference"
					type="textarea"
					:disabled="isSsoManagedByEnv"
					data-test-id="oidc-authentication-context-class-reference"
					placeholder="mfa, phrh, pwd"
					@update:model-value="(v: string) => (authenticationContextClassReference = v)"
				/>
				<small
					>ACR values to include in the authorization request (acr_values parameter), separated by
					commas in order of preference.</small
				>
			</div>
		</div>
		<div :class="$style.card">
			<div :class="[$style.settingsItem, $style.settingsItemNoBorder]">
				<div :class="$style.settingsItemLabel">
					<label>Single sign-on (SSO)</label>
					<small>Allow users to sign in through your identity provider</small>
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
						<N8nOption value="enabled" label="Enabled" />
						<N8nOption value="disabled" label="Disabled" />
					</N8nSelect>
				</div>
			</div>
		</div>

		<div :class="$style.buttons">
			<N8nButton
				v-if="!isSsoManagedByEnv"
				data-test-id="sso-oidc-save"
				size="large"
				:loading="savingForm"
				:disabled="savingForm || cannotSaveOidcSettings"
				@click="onOidcSettingsSave(false)"
			>
				{{ i18n.baseText('settings.sso.settings.save') }}
			</N8nButton>
			<N8nButton
				variant="subtle"
				:disabled="!isTestEnabled"
				size="large"
				data-test-id="sso-oidc-test"
				@click="onTest"
			>
				{{ i18n.baseText('settings.sso.settings.test') }}
			</N8nButton>
		</div>
	</div>
</template>
<style lang="scss" module src="../styles/sso-form.module.scss" />
