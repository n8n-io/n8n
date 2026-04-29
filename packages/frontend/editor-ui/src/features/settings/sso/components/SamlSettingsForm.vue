<script lang="ts" setup>
import type { SamlPreferences } from '@n8n/api-types';
import { SupportedProtocols, useSSOStore } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { captureMessage } from '@sentry/vue';

import { N8nButton, N8nInput, N8nOption, N8nRadioButtons, N8nSelect } from '@n8n/design-system';
import { useClipboard } from '@/app/composables/useClipboard';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { computed, onMounted, ref } from 'vue';
import UserRoleProvisioningDropdown from '../provisioning/components/UserRoleProvisioningDropdown.vue';
import { useUserRoleProvisioningForm } from '../provisioning/composables/useUserRoleProvisioningForm';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import ConfirmProvisioningDialog from '../provisioning/components/ConfirmProvisioningDialog.vue';
import RoleMappingRuleEditor from '../provisioning/components/RoleMappingRuleEditor.vue';
import { MODAL_CONFIRM } from '@/app/constants/modals';

const i18n = useI18n();
const ssoStore = useSSOStore();
const telemetry = useTelemetry();
const toast = useToast();
const message = useMessage();
const clipboard = useClipboard();
const redirectUrlCopied = ref(false);
const entityIdCopied = ref(false);

async function handleCopy(value: string, field: string) {
	await clipboard.copy(value);
	if (field === 'redirectUrl') {
		redirectUrlCopied.value = true;
		setTimeout(() => (redirectUrlCopied.value = false), 2000);
	} else if (field === 'entityId') {
		entityIdCopied.value = true;
		setTimeout(() => (entityIdCopied.value = false), 2000);
	}
}

const isSsoManagedByEnv = computed(() => ssoStore.ssoManagedByEnv);

const savingForm = ref<boolean>(false);
const roleMappingRuleEditorRef = ref<InstanceType<typeof RoleMappingRuleEditor> | null>(null);

const redirectUrl = ref();
const samlLoginEnabled = ref<boolean>(false);

const IdentityProviderSettingsType = {
	URL: 'url',
	XML: 'xml',
};

const ipsOptions = ref([
	{
		label: i18n.baseText('settings.sso.settings.ips.options.url'),
		value: IdentityProviderSettingsType.URL,
	},
	{
		label: i18n.baseText('settings.sso.settings.ips.options.xml'),
		value: IdentityProviderSettingsType.XML,
	},
]);
const ipsType = ref(IdentityProviderSettingsType.URL);

const metadataUrl = ref();
const metadata = ref();

const entityId = ref();

const showUserRoleProvisioningDialog = ref(false);

const {
	roleAssignment,
	mappingMethod,
	isUserRoleProvisioningChanged,
	saveProvisioningConfig,
	roleAssignmentTransition,
	storedHasProjectRoles,
	isDroppingProjectRules,
	revertRoleAssignment,
} = useUserRoleProvisioningForm(SupportedProtocols.SAML);

async function loadSamlConfig() {
	if (!ssoStore.isEnterpriseSamlEnabled) {
		return;
	}
	try {
		await getSamlConfig();
	} catch (error) {
		toast.showError(error, 'error');
	}
}

const getSamlConfig = async () => {
	const config = await ssoStore.getSamlConfig();

	entityId.value = config?.entityID;
	redirectUrl.value = config?.returnUrl;

	if (config?.metadataUrl) {
		ipsType.value = IdentityProviderSettingsType.URL;
	} else if (config?.metadata) {
		ipsType.value = IdentityProviderSettingsType.XML;
	}

	metadata.value = config?.metadata;
	metadataUrl.value = config?.metadataUrl;
	samlLoginEnabled.value = config.loginEnabled ?? false;
};

const isSaveEnabled = computed(() => {
	if (savingForm.value) {
		return false;
	}
	const isIdentityProviderChanged = () => {
		if (ipsType.value === IdentityProviderSettingsType.URL) {
			return !!metadataUrl.value && metadataUrl.value !== ssoStore.samlConfig?.metadataUrl;
		} else if (ipsType.value === IdentityProviderSettingsType.XML) {
			return !!metadata.value && metadata.value !== ssoStore.samlConfig?.metadata;
		}
		return false;
	};
	const isSamlLoginEnabledChanged = ssoStore.isSamlLoginEnabled !== samlLoginEnabled.value;
	const isRuleMappingDirty = roleMappingRuleEditorRef.value?.isDirty ?? false;
	return (
		isUserRoleProvisioningChanged.value ||
		isIdentityProviderChanged() ||
		isSamlLoginEnabledChanged ||
		isRuleMappingDirty
	);
});

const isTestEnabled = computed(() => {
	if (ipsType.value === IdentityProviderSettingsType.URL) {
		return !!metadataUrl.value;
	} else if (ipsType.value === IdentityProviderSettingsType.XML) {
		return !!metadata.value;
	}
	return false;
});

const sendTrackingEvent = (config?: SamlPreferences) => {
	if (!config) {
		captureMessage('Single Sign-On SAML: telemtetry data undefined on submit', { level: 'error' });
		return;
	}
	const trackingMetadata = {
		instance_id: useRootStore().instanceId,
		authentication_method: SupportedProtocols.SAML,
		identity_provider: config.metadataUrl ? 'metadata' : 'xml',
		is_active: config.loginEnabled ?? false,
	};
	telemetry.track('User updated single sign on settings', trackingMetadata);
};

const promptConfirmDisablingSamlLogin = async () => {
	const confirmAction = await message.confirm(
		i18n.baseText('settings.sso.confirmMessage.beforeSaveForm.message', {
			interpolate: { protocol: 'SAML' },
		}),
		i18n.baseText('settings.sso.confirmMessage.beforeSaveForm.headline', {
			interpolate: { protocol: 'SAML' },
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
	return confirmAction;
};

const prompTestSamlConnectionBeforeActivating = async () => {
	const promptOpeningTestConnectionPage = await message.confirm(
		i18n.baseText('settings.sso.settings.save.testConnection.message'),
		i18n.baseText('settings.sso.settings.save.testConnection.title'),
		{
			confirmButtonText: i18n.baseText('settings.sso.settings.save.testConnection.test'),
			cancelButtonText: i18n.baseText('settings.sso.settings.save.activate.cancel'),
		},
	);

	if (promptOpeningTestConnectionPage === MODAL_CONFIRM) {
		await onTest();

		const promptConfirmingSuccessfulTest = await message.confirm(
			i18n.baseText('settings.sso.settings.save.confirmTestConnection.message'),
			i18n.baseText('settings.sso.settings.save.confirmTestConnection.title'),
			{
				confirmButtonText: i18n.baseText(
					'settings.sso.settings.save.confirmTestConnection.confirm',
				),
				cancelButtonText: i18n.baseText('settings.sso.settings.save.activate.cancel'),
			},
		);
		return promptConfirmingSuccessfulTest;
	}
	return promptOpeningTestConnectionPage;
};

const onSave = async (provisioningChangesConfirmed: boolean = false): Promise<boolean> => {
	try {
		savingForm.value = true;
		validateSamlInput();

		const loginEnabledChanged = samlLoginEnabled.value !== ssoStore.isSamlLoginEnabled;
		const isDisablingSamlLogin = loginEnabledChanged && ssoStore.isSamlLoginEnabled === true;

		if (isDisablingSamlLogin) {
			const confirmDisablingSaml = await promptConfirmDisablingSamlLogin();
			if (confirmDisablingSaml !== MODAL_CONFIRM) {
				return false;
			}
		}

		if (!provisioningChangesConfirmed && roleAssignmentTransition.value !== 'none') {
			showUserRoleProvisioningDialog.value = true;
			return false;
		}
		showUserRoleProvisioningDialog.value = false;

		const metaDataConfig: Partial<SamlPreferences> =
			ipsType.value === IdentityProviderSettingsType.URL
				? { metadataUrl: metadataUrl.value }
				: { metadata: metadata.value };

		const isActivatingSamlLogin = !ssoStore.isSamlLoginEnabled && samlLoginEnabled.value;

		if (isActivatingSamlLogin) {
			// metadata settings need to be saved for test to work
			await ssoStore.saveSamlConfig(metaDataConfig);

			const confirmTest = await prompTestSamlConnectionBeforeActivating();
			if (confirmTest !== MODAL_CONFIRM) {
				return false;
			}
		}

		const configResponse = await ssoStore.saveSamlConfig({
			...metaDataConfig,
			loginEnabled: samlLoginEnabled.value,
		});

		await saveProvisioningConfig(isDisablingSamlLogin);

		// If the user's effective role assignment doesn't include project roles,
		// discard any project-rule state in the editor (both locally-added and
		// server-backed entries) so editor.save() doesn't try to POST/PATCH rules
		// that shouldn't exist. Checking the current dropdown at save-time is
		// robust against storedHasProjectRules drift.
		const effectiveRoleAssignment = isDisablingSamlLogin ? 'manual' : roleAssignment.value;
		if (effectiveRoleAssignment !== 'instance_and_project') {
			roleMappingRuleEditorRef.value?.discardProjectRules();
		}

		if (mappingMethod.value === 'rules_in_n8n') {
			await roleMappingRuleEditorRef.value?.save();
		}

		// Update store with saved protocol selection
		ssoStore.selectedAuthProtocol = SupportedProtocols.SAML;

		await getSamlConfig();
		sendTrackingEvent(configResponse);
		toast.showMessage({
			title: i18n.baseText('settings.sso.settings.save.success'),
			type: 'success',
		});
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error'));
		return false;
	} finally {
		savingForm.value = false;
	}
};

const onTest = async () => {
	try {
		const metaDataConfig: Partial<SamlPreferences> =
			ipsType.value === IdentityProviderSettingsType.URL
				? { metadataUrl: metadataUrl.value }
				: { metadata: metadata.value };
		const url = await ssoStore.testSamlConfig(metaDataConfig);

		if (typeof window !== 'undefined') {
			window.open(url, '_blank');
		}
	} catch (error) {
		toast.showError(error, 'error');
	}
};

const validateSamlInput = () => {
	if (ipsType.value === IdentityProviderSettingsType.URL) {
		// In case the user wants to set the metadata url we want to be sure that
		// the provided url is at least a valid http, https url.
		try {
			const parsedUrl = new URL(metadataUrl.value);
			// We allow http and https URLs for now, because we want to avoid a theoretical breaking
			// change, this should be restricted to only allow https when switching to V2.
			if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
				// The content of this error is never seen by the user, because the catch clause
				// below catches it and translates it to a more general error message.
				throw new Error('The provided protocol is not supported');
			}
		} catch (error) {
			throw new Error(i18n.baseText('settings.sso.settings.ips.url.invalid'));
		}
	}
};

const hasUnsavedChanges = computed(() => isSaveEnabled.value && !isSsoManagedByEnv.value);

defineExpose({ hasUnsavedChanges, onSave });

onMounted(async () => {
	await loadSamlConfig();
});
</script>
<template>
	<div>
		<div :class="[$style.card, $style.firstCard]">
			<slot name="protocol-select" />
			<div :class="$style.settingsItem">
				<div :class="$style.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.redirectUrl.label') }}</label>
					<small>{{ i18n.baseText('settings.sso.settings.redirectUrl.help') }}</small>
				</div>
				<div :class="$style.settingsItemControl">
					<div :class="$style.copyInputGroup" data-test-id="copy-input">
						<div :class="$style.copyInputField">
							<N8nInput :model-value="redirectUrl" type="text" :readonly="true" />
						</div>
						<div :class="$style.copyButtonWrapper">
							<N8nButton
								variant="subtle"
								icon-only
								:icon="redirectUrlCopied ? 'check' : 'copy'"
								@click="handleCopy(redirectUrl, 'redirectUrl')"
							/>
						</div>
					</div>
				</div>
			</div>
			<div :class="$style.settingsItem">
				<div :class="$style.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.entityId.label') }}</label>
					<small>{{ i18n.baseText('settings.sso.settings.entityId.help') }}</small>
				</div>
				<div :class="$style.settingsItemControl">
					<div :class="$style.copyInputGroup" data-test-id="copy-input">
						<div :class="$style.copyInputField">
							<N8nInput :model-value="entityId" type="text" :readonly="true" />
						</div>
						<div :class="$style.copyButtonWrapper">
							<N8nButton
								variant="subtle"
								icon-only
								:icon="entityIdCopied ? 'check' : 'copy'"
								@click="handleCopy(entityId, 'entityId')"
							/>
						</div>
					</div>
				</div>
			</div>
			<div :class="$style.ipsBlock">
				<div :class="[$style.settingsItem, $style.settingsItemNoBorder]">
					<div :class="$style.settingsItemLabel">
						<label>{{ i18n.baseText('settings.sso.settings.ips.label') }}</label>
					</div>
					<div :class="$style.settingsItemControl">
						<N8nRadioButtons
							v-model="ipsType"
							:disabled="isSsoManagedByEnv"
							:options="ipsOptions"
						/>
					</div>
				</div>
				<div v-if="ipsType === IdentityProviderSettingsType.URL">
					<N8nInput
						v-model="metadataUrl"
						:disabled="isSsoManagedByEnv"
						type="text"
						name="metadataUrl"
						size="large"
						:placeholder="i18n.baseText('settings.sso.settings.ips.url.placeholder')"
						data-test-id="sso-provider-url"
					/>
					<small>{{ i18n.baseText('settings.sso.settings.ips.url.help') }}</small>
				</div>
				<div v-if="ipsType === IdentityProviderSettingsType.XML">
					<N8nInput
						v-model="metadata"
						:disabled="isSsoManagedByEnv"
						type="textarea"
						name="metadata"
						:rows="4"
						data-test-id="sso-provider-xml"
					/>
					<small>{{ i18n.baseText('settings.sso.settings.ips.xml.help') }}</small>
				</div>
			</div>
		</div>

		<div :class="$style.card">
			<UserRoleProvisioningDropdown
				v-model:role-assignment="roleAssignment"
				v-model:mapping-method="mappingMethod"
				:disabled="isSsoManagedByEnv"
				auth-protocol="saml"
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
				auth-protocol="saml"
				@confirm-provisioning="onSave(true)"
				@cancel="
					revertRoleAssignment();
					showUserRoleProvisioningDialog = false;
				"
			/>
		</div>

		<div :class="$style.card">
			<div :class="[$style.settingsItem, $style.settingsItemNoBorder]">
				<div :class="$style.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.settings.ssoToggle.label') }}</label>
					<small>{{ i18n.baseText('settings.sso.settings.ssoToggle.description') }}</small>
				</div>
				<div :class="$style.settingsItemControl">
					<N8nSelect
						:model-value="samlLoginEnabled ? 'enabled' : 'disabled'"
						size="medium"
						:disabled="isSsoManagedByEnv"
						data-test-id="sso-toggle"
						@update:model-value="samlLoginEnabled = $event === 'enabled'"
					>
						<template #prefix>
							<span v-if="samlLoginEnabled" :class="$style.greenDot" />
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

		<div :class="$style.buttons">
			<N8nButton
				v-if="!isSsoManagedByEnv"
				:disabled="!isSaveEnabled"
				:loading="savingForm"
				size="large"
				data-test-id="sso-save"
				@click="onSave(false)"
			>
				{{ i18n.baseText('settings.sso.settings.save') }}
			</N8nButton>
			<N8nButton
				variant="subtle"
				:disabled="!isTestEnabled"
				size="large"
				data-test-id="sso-test"
				@click="onTest"
			>
				{{ i18n.baseText('settings.sso.settings.test') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module src="../styles/sso-form.module.scss" />
