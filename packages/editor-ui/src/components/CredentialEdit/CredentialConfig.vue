<template>
	<div>
		<div :class="$style.config" data-test-id="node-credentials-config-container">
			<Banner
				v-show="showValidationWarning"
				theme="danger"
				:message="
					$locale.baseText(
						`credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow${
							credentialPermissions.update ? '' : '.sharee'
						}`,
						{ interpolate: { owner: credentialOwnerName } },
					)
				"
			/>

			<Banner
				v-if="authError && !showValidationWarning"
				theme="danger"
				:message="
					$locale.baseText(
						`credentialEdit.credentialConfig.couldntConnectWithTheseSettings${
							credentialPermissions.update ? '' : '.sharee'
						}`,
						{ interpolate: { owner: credentialOwnerName } },
					)
				"
				:details="authError"
				:button-label="$locale.baseText('credentialEdit.credentialConfig.retry')"
				button-loading-label="Retrying"
				:button-title="$locale.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
				:button-loading="isRetesting"
				@click="$emit('retest')"
			/>

			<Banner
				v-show="showOAuthSuccessBanner && !showValidationWarning"
				theme="success"
				:message="$locale.baseText('credentialEdit.credentialConfig.accountConnected')"
				:button-label="$locale.baseText('credentialEdit.credentialConfig.reconnect')"
				:button-title="
					$locale.baseText('credentialEdit.credentialConfig.reconnectOAuth2Credential')
				"
				data-test-id="oauth-connect-success-banner"
				@click="$emit('oauth')"
			>
				<template v-if="isGoogleOAuthType" #button>
					<p
						:class="$style.googleReconnectLabel"
						v-text="`${$locale.baseText('credentialEdit.credentialConfig.reconnect')}:`"
					/>
					<GoogleAuthButton @click="$emit('oauth')" />
				</template>
			</Banner>

			<Banner
				v-show="testedSuccessfully && !showValidationWarning"
				theme="success"
				:message="$locale.baseText('credentialEdit.credentialConfig.connectionTestedSuccessfully')"
				:button-label="$locale.baseText('credentialEdit.credentialConfig.retry')"
				:button-loading-label="$locale.baseText('credentialEdit.credentialConfig.retrying')"
				:button-title="$locale.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
				:button-loading="isRetesting"
				data-test-id="credentials-config-container-test-success"
				@click="$emit('retest')"
			/>

			<template v-if="credentialPermissions.update">
				<n8n-notice v-if="documentationUrl && credentialProperties.length && !docs" theme="warning">
					{{ $locale.baseText('credentialEdit.credentialConfig.needHelpFillingOutTheseFields') }}
					<span class="ml-4xs">
						<n8n-link :to="documentationUrl" size="small" bold @click="onDocumentationUrlClick">
							{{ $locale.baseText('credentialEdit.credentialConfig.openDocs') }}
						</n8n-link>
					</span>
				</n8n-notice>

				<AuthTypeSelector
					v-if="showAuthTypeSelector && isNewCredential"
					:credential-type="credentialType"
					@auth-type-changed="onAuthTypeChange"
				/>

				<CopyInput
					v-if="isOAuthType && !allOAuth2BasePropertiesOverridden"
					:label="$locale.baseText('credentialEdit.credentialConfig.oAuthRedirectUrl')"
					:value="oAuthCallbackUrl"
					:copy-button-text="$locale.baseText('credentialEdit.credentialConfig.clickToCopy')"
					:hint="
						$locale.baseText('credentialEdit.credentialConfig.subtitle', {
							interpolate: { appName },
						})
					"
					:toast-title="
						$locale.baseText('credentialEdit.credentialConfig.redirectUrlCopiedToClipboard')
					"
					:redact-value="true"
				/>
			</template>
			<EnterpriseEdition v-else :features="[EnterpriseEditionFeature.Sharing]">
				<div>
					<n8n-info-tip :bold="false">
						{{
							$locale.baseText('credentialEdit.credentialEdit.info.sharee', {
								interpolate: { credentialOwnerName },
							})
						}}
					</n8n-info-tip>
				</div>
			</EnterpriseEdition>

			<CredentialInputs
				v-if="credentialType && credentialPermissions.update"
				:credential-data="credentialData"
				:credential-properties="credentialProperties"
				:documentation-url="documentationUrl"
				:show-validation-warnings="showValidationWarning"
				@update="onDataChange"
			/>

			<OauthButton
				v-if="
					isOAuthType &&
					requiredPropertiesFilled &&
					!isOAuthConnected &&
					credentialPermissions.update
				"
				:is-google-o-auth-type="isGoogleOAuthType"
				data-test-id="oauth-connect-button"
				@click="$emit('oauth')"
			/>

			<n8n-text v-if="isMissingCredentials" color="text-base" size="medium">
				{{ $locale.baseText('credentialEdit.credentialConfig.missingCredentialType') }}
			</n8n-text>

			<EnterpriseEdition :features="[EnterpriseEditionFeature.ExternalSecrets]">
				<template #fallback>
					<n8n-info-tip class="mt-s">
						{{ $locale.baseText('credentialEdit.credentialConfig.externalSecrets') }}
						<n8n-link bold :to="$locale.baseText('settings.externalSecrets.docs')" size="small">
							{{ $locale.baseText('credentialEdit.credentialConfig.externalSecrets.moreInfo') }}
						</n8n-link>
					</n8n-info-tip>
				</template>
			</EnterpriseEdition>
		</div>
		<CredentialDocs
			v-if="docs"
			:credential-type="credentialType"
			:documentation-url="documentationUrl"
			:docs="docs"
			:class="$style.docs"
		>
		</CredentialDocs>
	</div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, watch } from 'vue';

import { getAppNameFromCredType, isCommunityPackageName } from '@/utils/nodeTypesUtils';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import type { IUpdateInformation } from '@/Interface';
import AuthTypeSelector from '@/components/CredentialEdit/AuthTypeSelector.vue';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { BUILTIN_CREDENTIALS_DOCS_URL, DOCS_DOMAIN, EnterpriseEditionFeature } from '@/constants';
import type { PermissionsMap } from '@/permissions';
import { addCredentialTranslation } from '@/plugins/i18n';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useRootStore } from '@/stores/root.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { CredentialScope } from '@n8n/permissions';
import Banner from '../Banner.vue';
import CopyInput from '../CopyInput.vue';
import CredentialInputs from './CredentialInputs.vue';
import GoogleAuthButton from './GoogleAuthButton.vue';
import OauthButton from './OauthButton.vue';
import CredentialDocs from './CredentialDocs.vue';
import { CREDENTIAL_MARKDOWN_DOCS } from './docs';

type Props = {
	mode: string;
	credentialType: ICredentialType;
	credentialProperties: INodeProperties[];
	credentialData: ICredentialDataDecryptedObject;
	credentialId?: string;
	credentialPermissions?: PermissionsMap<CredentialScope>;
	parentTypes?: string[];
	showValidationWarning?: boolean;
	authError?: string;
	testedSuccessfully?: boolean;
	isOAuthType?: boolean;
	allOAuth2BasePropertiesOverridden?: boolean;
	isOAuthConnected?: boolean;
	isRetesting?: boolean;
	requiredPropertiesFilled?: boolean;
	showAuthTypeSelector?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	parentTypes: () => [],
	credentialId: '',
	authError: '',
	showValidationWarning: false,
	credentialPermissions: () => ({}) as PermissionsMap<CredentialScope>,
});
const emit = defineEmits<{
	update: [value: IUpdateInformation];
	authTypeChanged: [value: string];
	scrollToTop: [];
	retest: [];
	oauth: [];
}>();

const credentialsStore = useCredentialsStore();
const ndvStore = useNDVStore();
const rootStore = useRootStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const i18n = useI18n();
const telemetry = useTelemetry();

onBeforeMount(async () => {
	if (rootStore.defaultLocale === 'en') return;

	uiStore.activeCredentialType = props.credentialType.name;

	const key = `n8n-nodes-base.credentials.${props.credentialType.name}`;

	if (i18n.exists(key)) return;

	const credTranslation = await credentialsStore.getCredentialTranslation(
		props.credentialType.name,
	);

	addCredentialTranslation(
		{ [props.credentialType.name]: credTranslation },
		rootStore.defaultLocale,
	);
});

const appName = computed(() => {
	if (!props.credentialType) {
		return '';
	}

	return (
		getAppNameFromCredType(props.credentialType.displayName) ||
		i18n.baseText('credentialEdit.credentialConfig.theServiceYouReConnectingTo')
	);
});
const credentialTypeName = computed(() => props.credentialType?.name);
const credentialOwnerName = computed(() =>
	credentialsStore.getCredentialOwnerNameById(`${props.credentialId}`),
);
const documentationUrl = computed(() => {
	const type = props.credentialType;
	const activeNode = ndvStore.activeNode;
	const isCommunityNode = activeNode ? isCommunityPackageName(activeNode.type) : false;

	const docUrl = type?.documentationUrl;

	if (!docUrl) {
		return '';
	}

	let url: URL;
	if (docUrl.startsWith('https://') || docUrl.startsWith('http://')) {
		url = new URL(docUrl);
		if (url.hostname !== DOCS_DOMAIN) return docUrl;
	} else {
		// Don't show documentation link for community nodes if the URL is not an absolute path
		if (isCommunityNode) return '';
		else url = new URL(`${BUILTIN_CREDENTIALS_DOCS_URL}${docUrl}/`);
	}

	if (url.hostname === DOCS_DOMAIN) {
		url.searchParams.set('utm_source', 'n8n_app');
		url.searchParams.set('utm_medium', 'credential_settings');
		url.searchParams.set('utm_campaign', 'create_new_credentials_modal');
	}

	return url.href;
});

const isGoogleOAuthType = computed(
	() =>
		credentialTypeName.value === 'googleOAuth2Api' || props.parentTypes.includes('googleOAuth2Api'),
);

const oAuthCallbackUrl = computed(() => {
	const oauthType =
		credentialTypeName.value === 'oAuth2Api' || props.parentTypes.includes('oAuth2Api')
			? 'oauth2'
			: 'oauth1';
	return rootStore.OAuthCallbackUrls[oauthType as keyof {}];
});

const showOAuthSuccessBanner = computed(() => {
	return (
		props.isOAuthType &&
		props.requiredPropertiesFilled &&
		props.isOAuthConnected &&
		!props.authError
	);
});

const isMissingCredentials = computed(() => props.credentialType === null);

const isNewCredential = computed(() => props.mode === 'new' && !props.credentialId);

const docs = computed(() => CREDENTIAL_MARKDOWN_DOCS[props.credentialType.name]);

function onDataChange(event: IUpdateInformation): void {
	emit('update', event);
}

function onDocumentationUrlClick(): void {
	telemetry.track('User clicked credential modal docs link', {
		docs_link: documentationUrl.value,
		credential_type: credentialTypeName.value,
		source: 'modal',
		workflow_id: workflowsStore.workflowId,
	});
}

function onAuthTypeChange(newType: string): void {
	emit('authTypeChanged', newType);
}

watch(showOAuthSuccessBanner, (newValue, oldValue) => {
	if (newValue && !oldValue) {
		emit('scrollToTop');
	}
});
</script>

<style lang="scss" module>
.config {
	--notice-margin: 0;
	flex-grow: 1;

	> * {
		margin-bottom: var(--spacing-l);
	}

	&:has(+ .docs) {
		padding-right: 320px;
	}
}

.docs {
	position: absolute;
	right: 0;
	bottom: 0;
	top: 0;
	max-width: 320px;
}

.googleReconnectLabel {
	margin-right: var(--spacing-3xs);
}
</style>
