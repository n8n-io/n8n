<script lang="ts" setup>
import CopyInput from '@/app/components/CopyInput.vue';
import { MODAL_CONFIRM } from '@/app/constants';
import { SupportedProtocols, useSSOStore } from '../sso.store';
import { useI18n } from '@n8n/i18n';

import { ElCheckbox } from 'element-plus';
import { N8nActionBox, N8nButton, N8nInput, N8nOption, N8nSelect } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useMessage } from '@/app/composables/useMessage';
import UserRoleProvisioningDropdown, {
	type UserRoleProvisioningSetting,
} from '../provisioning/components/UserRoleProvisioningDropdown.vue';
import { useUserRoleProvisioningForm } from '../provisioning/composables/useUserRoleProvisioningForm';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type OidcConfigDto } from '@n8n/api-types';
import ConfirmProvisioningDialog from '../provisioning/components/ConfirmProvisioningDialog.vue';

const i18n = useI18n();
const ssoStore = useSSOStore();
const telemetry = useTelemetry();
const toast = useToast();
const message = useMessage();
const pageRedirectionHelper = usePageRedirectionHelper();

const savingForm = ref<boolean>(false);

const discoveryEndpoint = ref('');
const clientId = ref('');
const clientSecret = ref('');

const showUserRoleProvisioningDialog = ref(false);
const userRoleProvisioning = ref<UserRoleProvisioningSetting>('disabled');

const { isUserRoleProvisioningChanged, saveProvisioningConfig } =
	useUserRoleProvisioningForm(userRoleProvisioning);

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
		toast.showError(error, 'error');
	}
};

const cannotSaveOidcSettings = computed(() => {
	const currentAcrString = authenticationContextClassReference.value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.join(',');

	const storedAcrString = ssoStore.oidcConfig?.authenticationContextClassReference?.join(',') || '';

	return (
		ssoStore.oidcConfig?.clientId === clientId.value &&
		ssoStore.oidcConfig?.clientSecret === clientSecret.value &&
		ssoStore.oidcConfig?.discoveryEndpoint === discoveryEndpoint.value &&
		ssoStore.oidcConfig?.loginEnabled === ssoStore.isOidcLoginEnabled &&
		ssoStore.oidcConfig?.prompt === prompt.value &&
		!isUserRoleProvisioningChanged() &&
		storedAcrString === authenticationContextClassReference.value &&
		currentAcrString === storedAcrString
	);
});

async function onOidcSettingsSave(provisioningChangesConfirmed: boolean = false) {
	if (ssoStore.oidcConfig?.loginEnabled && !ssoStore.isOidcLoginEnabled) {
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
		if (confirmAction !== MODAL_CONFIRM) return;
	}

	if (isUserRoleProvisioningChanged() && !provisioningChangesConfirmed) {
		showUserRoleProvisioningDialog.value = true;
		return;
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

		if (isUserRoleProvisioningChanged()) {
			await saveProvisioningConfig();
			showUserRoleProvisioningDialog.value = false;
		}

		// Update store with saved protocol selection
		ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;

		clientSecret.value = newConfig.clientSecret;

		sendTrackingEvent(newConfig);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error_oidc'));
		return;
	} finally {
		savingForm.value = false;
		await getOidcConfig();
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

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('sso', 'upgrade-sso');
};

onMounted(async () => {
	await loadOidcConfig();
});
</script>
<template>
	<div v-if="ssoStore.isEnterpriseOidcEnabled">
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
				type="text"
				data-test-id="oidc-client-id"
				@update:model-value="(v: string) => (clientId = v)"
			/>
			<small>The client ID you received when registering your application with your provider</small>
		</div>
		<div :class="$style.group">
			<label>Client Secret</label>
			<N8nInput
				:model-value="clientSecret"
				type="password"
				data-test-id="oidc-client-secret"
				@update:model-value="(v: string) => (clientSecret = v)"
			/>
			<small
				>The client Secret you received when registering your application with your provider</small
			>
		</div>
		<div :class="$style.group">
			<label>Prompt</label>
			<N8nSelect
				:model-value="prompt"
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
		<UserRoleProvisioningDropdown v-model="userRoleProvisioning" auth-protocol="oidc" />
		<ConfirmProvisioningDialog
			v-model="showUserRoleProvisioningDialog"
			:new-provisioning-setting="userRoleProvisioning"
			auth-protocol="oidc"
			@confirm-provisioning="onOidcSettingsSave(true)"
			@cancel="showUserRoleProvisioningDialog = false"
		/>
		<div :class="$style.group">
			<label>Authentication Context Class Reference</label>
			<N8nInput
				:model-value="authenticationContextClassReference"
				type="textarea"
				data-test-id="oidc-authentication-context-class-reference"
				placeholder="mfa, phrh, pwd"
				@update:model-value="(v: string) => (authenticationContextClassReference = v)"
			/>
			<small
				>ACR values to include in the authorization request (acr_values parameter), separated by
				commas in order of preference.</small
			>
		</div>
		<div :class="[$style.group, $style.checkboxGroup]">
			<ElCheckbox v-model="ssoStore.isOidcLoginEnabled" data-test-id="sso-oidc-toggle">{{
				i18n.baseText('settings.sso.activated')
			}}</ElCheckbox>
		</div>

		<div :class="$style.buttons">
			<N8nButton
				data-test-id="sso-oidc-save"
				size="large"
				:loading="savingForm"
				:disabled="savingForm || cannotSaveOidcSettings"
				@click="onOidcSettingsSave(false)"
			>
				{{ i18n.baseText('settings.sso.settings.save') }}
			</N8nButton>
		</div>
	</div>
	<N8nActionBox
		v-else
		data-test-id="sso-content-unlicensed"
		:class="$style.actionBox"
		:button-text="i18n.baseText('settings.sso.actionBox.buttonText')"
		@click:button="goToUpgrade"
	>
		<template #heading>
			<span>{{ i18n.baseText('settings.sso.actionBox.title') }}</span>
		</template>
	</N8nActionBox>
</template>
<style lang="scss" module src="../styles/sso-form.module.scss" />
