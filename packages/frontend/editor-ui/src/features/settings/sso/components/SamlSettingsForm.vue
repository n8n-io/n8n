<script lang="ts" setup>
import type { SamlPreferences } from '@n8n/api-types';
import CopyInput from '@/app/components/CopyInput.vue';
import { SupportedProtocols, useSSOStore } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { captureMessage } from '@sentry/vue';

import { ElSwitch } from 'element-plus';
import { N8nActionBox, N8nButton, N8nInput, N8nRadioButtons, N8nTooltip } from '@n8n/design-system';
import { useToast } from '@/app/composables/useToast';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useMessage } from '@/app/composables/useMessage';
import { computed, onMounted, ref } from 'vue';
import UserRoleProvisioningDropdown, {
	type UserRoleProvisioningSetting,
} from '../provisioning/components/UserRoleProvisioningDropdown.vue';
import { useUserRoleProvisioningForm } from '../provisioning/composables/useUserRoleProvisioningForm';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import ConfirmProvisioningDialog from '../provisioning/components/ConfirmProvisioningDialog.vue';

const i18n = useI18n();
const ssoStore = useSSOStore();
const telemetry = useTelemetry();
const toast = useToast();
const message = useMessage();
const pageRedirectionHelper = usePageRedirectionHelper();

const redirectUrl = ref();

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

const ssoActivatedLabel = computed(() =>
	ssoStore.isSamlLoginEnabled
		? i18n.baseText('settings.sso.activated')
		: i18n.baseText('settings.sso.deactivated'),
);

const metadataUrl = ref();
const metadata = ref();

const ssoSettingsSaved = ref(false);

const entityId = ref();

const showUserRoleProvisioningDialog = ref(false);

const userRoleProvisioning = ref<UserRoleProvisioningSetting>('disabled');

const { isUserRoleProvisioningChanged, saveProvisioningConfig } =
	useUserRoleProvisioningForm(userRoleProvisioning);

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
	ssoSettingsSaved.value = !!config?.metadata;
};

const isSaveEnabled = computed(() => {
	if (isUserRoleProvisioningChanged()) {
		return true;
	} else if (ipsType.value === IdentityProviderSettingsType.URL) {
		return !!metadataUrl.value && metadataUrl.value !== ssoStore.samlConfig?.metadataUrl;
	} else if (ipsType.value === IdentityProviderSettingsType.XML) {
		return !!metadata.value && metadata.value !== ssoStore.samlConfig?.metadata;
	}
	return false;
});

const isTestEnabled = computed(() => {
	if (ipsType.value === IdentityProviderSettingsType.URL) {
		return !!metadataUrl.value && ssoSettingsSaved.value;
	} else if (ipsType.value === IdentityProviderSettingsType.XML) {
		return !!metadata.value && ssoSettingsSaved.value;
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

const onSave = async (provisioningChangesConfirmed: boolean = false) => {
	try {
		validateSamlInput();

		if (isUserRoleProvisioningChanged() && !provisioningChangesConfirmed) {
			showUserRoleProvisioningDialog.value = true;
			return;
		}

		const config: Partial<SamlPreferences> =
			ipsType.value === IdentityProviderSettingsType.URL
				? { metadataUrl: metadataUrl.value }
				: { metadata: metadata.value };
		const configResponse = await ssoStore.saveSamlConfig(config);

		if (isUserRoleProvisioningChanged()) {
			await saveProvisioningConfig();
			showUserRoleProvisioningDialog.value = false;
		}

		// Update store with saved protocol selection
		ssoStore.selectedAuthProtocol = SupportedProtocols.SAML;
		// Update store with saved metadata config
		ssoStore.samlConfig!.metadata = config.metadata;
		ssoStore.samlConfig!.metadataUrl = config.metadataUrl;

		if (!ssoStore.isSamlLoginEnabled) {
			const answer = await message.confirm(
				i18n.baseText('settings.sso.settings.save.activate.message'),
				i18n.baseText('settings.sso.settings.save.activate.title'),
				{
					confirmButtonText: i18n.baseText('settings.sso.settings.save.activate.test'),
					cancelButtonText: i18n.baseText('settings.sso.settings.save.activate.cancel'),
				},
			);

			if (answer === 'confirm') {
				await onTest();
			}
		}

		await getSamlConfig();
		sendTrackingEvent(configResponse);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error'));
		return;
	}
};

const onTest = async () => {
	try {
		const url = await ssoStore.testSamlConfig();

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

const isToggleSsoDisabled = computed(() => {
	/** Allow users to disable SSO even if config request fails */
	if (ssoStore.isSamlLoginEnabled) {
		return false;
	}

	return !ssoSettingsSaved.value;
});

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('sso', 'upgrade-sso');
};

onMounted(async () => {
	await loadSamlConfig();
});
</script>
<template>
	<div v-if="ssoStore.isEnterpriseSamlEnabled" data-test-id="sso-content-licensed">
		<div :class="$style.group">
			<label>{{ i18n.baseText('settings.sso.settings.redirectUrl.label') }}</label>
			<CopyInput
				:value="redirectUrl"
				:copy-button-text="i18n.baseText('generic.clickToCopy')"
				:toast-title="i18n.baseText('settings.sso.settings.redirectUrl.copied')"
			/>
			<small>{{ i18n.baseText('settings.sso.settings.redirectUrl.help') }}</small>
		</div>
		<div :class="$style.group">
			<label>{{ i18n.baseText('settings.sso.settings.entityId.label') }}</label>
			<CopyInput
				:value="entityId"
				:copy-button-text="i18n.baseText('generic.clickToCopy')"
				:toast-title="i18n.baseText('settings.sso.settings.entityId.copied')"
			/>
			<small>{{ i18n.baseText('settings.sso.settings.entityId.help') }}</small>
		</div>
		<div :class="$style.group">
			<label>{{ i18n.baseText('settings.sso.settings.ips.label') }}</label>
			<div class="mt-2xs mb-s">
				<N8nRadioButtons v-model="ipsType" :options="ipsOptions" />
			</div>
			<div v-if="ipsType === IdentityProviderSettingsType.URL">
				<N8nInput
					v-model="metadataUrl"
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
					type="textarea"
					name="metadata"
					:rows="4"
					data-test-id="sso-provider-xml"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.ips.xml.help') }}</small>
			</div>
			<UserRoleProvisioningDropdown v-model="userRoleProvisioning" auth-protocol="saml" />
			<ConfirmProvisioningDialog
				v-model="showUserRoleProvisioningDialog"
				:new-provisioning-setting="userRoleProvisioning"
				auth-protocol="saml"
				@confirm-provisioning="onSave(true)"
			/>
			<div :class="$style.group">
				<N8nTooltip
					v-if="ssoStore.isEnterpriseSamlEnabled"
					:disabled="ssoStore.isSamlLoginEnabled || ssoSettingsSaved"
				>
					<template #content>
						<span>
							{{ i18n.baseText('settings.sso.activation.tooltip') }}
						</span>
					</template>
					<ElSwitch
						v-model="ssoStore.isSamlLoginEnabled"
						data-test-id="sso-toggle"
						:disabled="isToggleSsoDisabled"
						:class="$style.switch"
						:inactive-text="ssoActivatedLabel"
					/>
				</N8nTooltip>
			</div>
		</div>
		<div :class="$style.buttons">
			<N8nButton
				:disabled="!isSaveEnabled"
				size="large"
				data-test-id="sso-save"
				@click="onSave(false)"
			>
				{{ i18n.baseText('settings.sso.settings.save') }}
			</N8nButton>
			<N8nButton
				:disabled="!isTestEnabled"
				size="large"
				type="tertiary"
				data-test-id="sso-test"
				@click="onTest"
			>
				{{ i18n.baseText('settings.sso.settings.test') }}
			</N8nButton>
		</div>

		<footer :class="$style.footer">
			{{ i18n.baseText('settings.sso.settings.footer.hint') }}
		</footer>
	</div>
	<N8nActionBox
		v-else
		data-test-id="sso-content-unlicensed"
		:class="$style.actionBox"
		:description="i18n.baseText('settings.sso.actionBox.description')"
		:button-text="i18n.baseText('settings.sso.actionBox.buttonText')"
		@click:button="goToUpgrade"
	>
		<template #heading>
			<span>{{ i18n.baseText('settings.sso.actionBox.title') }}</span>
		</template>
	</N8nActionBox>
</template>

<style lang="scss" module src="../styles/sso-form.module.scss" />
