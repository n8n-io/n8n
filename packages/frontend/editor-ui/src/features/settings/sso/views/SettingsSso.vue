<script lang="ts" setup>
import CopyInput from '@/components/CopyInput.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useMessage } from '@/composables/useMessage';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { MODAL_CONFIRM } from '@/constants';
import { useSSOStore, SupportedProtocols, type SupportedProtocolType } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import { ElSwitch } from 'element-plus';
import {
	N8nActionBox,
	N8nButton,
	N8nHeading,
	N8nInfoTip,
	N8nInput,
	N8nOption,
	N8nRadioButtons,
	N8nSelect,
	N8nTooltip,
} from '@n8n/design-system';
const IdentityProviderSettingsType = {
	URL: 'url',
	XML: 'xml',
};

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const ssoStore = useSSOStore();
const message = useMessage();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const ssoActivatedLabel = computed(() =>
	ssoStore.isSamlLoginEnabled
		? i18n.baseText('settings.sso.activated')
		: i18n.baseText('settings.sso.deactivated'),
);

const oidcActivatedLabel = computed(() =>
	ssoStore.isOidcLoginEnabled
		? i18n.baseText('settings.sso.activated')
		: i18n.baseText('settings.sso.deactivated'),
);

const options = computed(() => {
	return [
		{
			label: SupportedProtocols.SAML.toUpperCase(),
			value: SupportedProtocols.SAML,
		},
		{
			label: ssoStore.isEnterpriseOidcEnabled
				? SupportedProtocols.OIDC.toUpperCase()
				: `${SupportedProtocols.OIDC.toUpperCase()} (${i18n.baseText('generic.upgradeToEnterprise')})`,
			value: SupportedProtocols.OIDC,
		},
	];
});

const ssoSettingsSaved = ref(false);

const entityId = ref();

const clientId = ref('');
const clientSecret = ref('');

const discoveryEndpoint = ref('');

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

const authProtocol = ref<SupportedProtocolType>(SupportedProtocols.SAML);

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

const redirectUrl = ref();

const isSaveEnabled = computed(() => {
	if (ipsType.value === IdentityProviderSettingsType.URL) {
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

const trackUpdateSettings = () => {
	const trackingMetadata: {
		instance_id: string;
		authentication_method: SupportedProtocolType;
		is_active?: boolean;
		discovery_endpoint?: string;
		identity_provider?: 'metadata' | 'xml';
	} = {
		instance_id: rootStore.instanceId,
		authentication_method: authProtocol.value,
	};

	if (authProtocol.value === SupportedProtocols.SAML) {
		trackingMetadata.identity_provider = ipsType.value === 'url' ? 'metadata' : 'xml';
		trackingMetadata.is_active = ssoStore.isSamlLoginEnabled;
	} else if (authProtocol.value === SupportedProtocols.OIDC) {
		trackingMetadata.discovery_endpoint = discoveryEndpoint.value;
		trackingMetadata.is_active = ssoStore.isOidcLoginEnabled;
	}
	telemetry.track('User updated single sign on settings', trackingMetadata);
};

const onSave = async () => {
	try {
		validateInput();
		const config =
			ipsType.value === IdentityProviderSettingsType.URL
				? { metadataUrl: metadataUrl.value }
				: { metadata: metadata.value };
		await ssoStore.saveSamlConfig(config);

		// Update store with saved protocol selection
		ssoStore.selectedAuthProtocol = authProtocol.value;

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

		trackUpdateSettings();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error'));
		return;
	} finally {
		await getSamlConfig();
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

const validateInput = () => {
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

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('sso', 'upgrade-sso');
};

const isToggleSsoDisabled = computed(() => {
	/** Allow users to disable SSO even if config request fails */
	if (ssoStore.isSamlLoginEnabled) {
		return false;
	}

	return !ssoSettingsSaved.value;
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.sso.title'));
	await Promise.all([loadSamlConfig(), loadOidcConfig()]);
	ssoStore.initializeSelectedProtocol();
	authProtocol.value = ssoStore.selectedAuthProtocol || SupportedProtocols.SAML;
});

const getOidcConfig = async () => {
	const config = await ssoStore.getOidcConfig();

	clientId.value = config.clientId;
	clientSecret.value = config.clientSecret;
	discoveryEndpoint.value = config.discoveryEndpoint;
	prompt.value = config.prompt ?? 'select_account';
};

async function loadOidcConfig() {
	if (!ssoStore.isEnterpriseOidcEnabled) {
		return;
	}
	try {
		await getOidcConfig();
	} catch (error) {
		toast.showError(error, 'error');
	}
}

function onAuthProtocolUpdated(value: SupportedProtocolType) {
	authProtocol.value = value;
}

const cannotSaveOidcSettings = computed(() => {
	return (
		ssoStore.oidcConfig?.clientId === clientId.value &&
		ssoStore.oidcConfig?.clientSecret === clientSecret.value &&
		ssoStore.oidcConfig?.discoveryEndpoint === discoveryEndpoint.value &&
		ssoStore.oidcConfig?.loginEnabled === ssoStore.isOidcLoginEnabled &&
		ssoStore.oidcConfig?.prompt === prompt.value
	);
});

async function onOidcSettingsSave() {
	if (ssoStore.oidcConfig?.loginEnabled && !ssoStore.isOidcLoginEnabled) {
		const confirmAction = await message.confirm(
			i18n.baseText('settings.oidc.confirmMessage.beforeSaveForm.message'),
			i18n.baseText('settings.oidc.confirmMessage.beforeSaveForm.headline'),
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

	try {
		const newConfig = await ssoStore.saveOidcConfig({
			clientId: clientId.value,
			clientSecret: clientSecret.value,
			discoveryEndpoint: discoveryEndpoint.value,
			prompt: prompt.value,
			loginEnabled: ssoStore.isOidcLoginEnabled,
		});

		// Update store with saved protocol selection
		ssoStore.selectedAuthProtocol = authProtocol.value;

		clientSecret.value = newConfig.clientSecret;
		trackUpdateSettings();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error_oidc'));
		return;
	} finally {
		await getOidcConfig();
	}
}
</script>

<template>
	<div class="pb-2xl">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.sso.title') }}</N8nHeading>
		</div>
		<N8nInfoTip>
			{{ i18n.baseText('settings.sso.info') }}
			<a href="https://docs.n8n.io/user-management/saml/" target="_blank">
				{{ i18n.baseText('settings.sso.info.link') }}
			</a>
		</N8nInfoTip>
		<div
			v-if="ssoStore.isEnterpriseSamlEnabled || ssoStore.isEnterpriseOidcEnabled"
			data-test-id="sso-auth-protocol-select"
			:class="$style.group"
		>
			<label>Select Authentication Protocol</label>
			<div>
				<N8nSelect
					filterable
					:model-value="authProtocol"
					:placeholder="i18n.baseText('parameterInput.select')"
					@update:model-value="onAuthProtocolUpdated"
					@keydown.stop
				>
					<N8nOption
						v-for="{ label, value } in options"
						:key="value"
						:value="value"
						:label="label"
						data-test-id="credential-select-option"
					>
					</N8nOption>
				</N8nSelect>
			</div>
		</div>
		<div v-if="authProtocol === SupportedProtocols.SAML">
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
						@click="onSave"
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
		</div>
		<div v-if="authProtocol === SupportedProtocols.OIDC">
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
					<small
						>The client ID you received when registering your application with your provider</small
					>
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
						>The client Secret you received when registering your application with your
						provider</small
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
				<div :class="$style.group">
					<ElSwitch
						v-model="ssoStore.isOidcLoginEnabled"
						data-test-id="sso-oidc-toggle"
						:class="$style.switch"
						:inactive-text="oidcActivatedLabel"
					/>
				</div>

				<div :class="$style.buttons">
					<N8nButton
						data-test-id="sso-oidc-save"
						size="large"
						:disabled="cannotSaveOidcSettings"
						@click="onOidcSettingsSave"
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
		</div>
	</div>
</template>

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--sm);
}

.switch {
	span {
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
	}
}

.buttons {
	display: flex;
	justify-content: flex-start;
	padding: var(--spacing--2xl) 0 var(--spacing--2xs);

	button {
		margin: 0 var(--spacing--sm) 0 0;
	}
}

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

.actionBox {
	margin: var(--spacing--2xl) 0 0;
}

.footer {
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}
</style>
