<template>
	<div :class="$style.container">
		<banner
			v-show="showValidationWarning"
			theme="danger"
			:message="
				$locale.baseText(
					`credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow${
						credentialPermissions.isOwner ? '' : '.sharee'
					}`,
					{ interpolate: { owner: credentialOwnerName } },
				)
			"
		/>

		<banner
			v-if="authError && !showValidationWarning"
			theme="danger"
			:message="
				$locale.baseText(
					`credentialEdit.credentialConfig.couldntConnectWithTheseSettings${
						credentialPermissions.isOwner ? '' : '.sharee'
					}`,
					{ interpolate: { owner: credentialOwnerName } },
				)
			"
			:details="authError"
			:buttonLabel="$locale.baseText('credentialEdit.credentialConfig.retry')"
			buttonLoadingLabel="Retrying"
			:buttonTitle="$locale.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<banner
			v-show="showOAuthSuccessBanner && !showValidationWarning"
			theme="success"
			:message="$locale.baseText('credentialEdit.credentialConfig.accountConnected')"
			:buttonLabel="$locale.baseText('credentialEdit.credentialConfig.reconnect')"
			:buttonTitle="$locale.baseText('credentialEdit.credentialConfig.reconnectOAuth2Credential')"
			@click="$emit('oauth')"
		/>

		<banner
			v-show="testedSuccessfully && !showValidationWarning"
			theme="success"
			:message="$locale.baseText('credentialEdit.credentialConfig.connectionTestedSuccessfully')"
			:buttonLabel="$locale.baseText('credentialEdit.credentialConfig.retry')"
			:buttonLoadingLabel="$locale.baseText('credentialEdit.credentialConfig.retrying')"
			:buttonTitle="$locale.baseText('credentialEdit.credentialConfig.retryCredentialTest')"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<template v-if="credentialPermissions.updateConnection">
			<n8n-notice v-if="documentationUrl && credentialProperties.length" theme="warning">
				{{ $locale.baseText('credentialEdit.credentialConfig.needHelpFillingOutTheseFields') }}
				<span class="ml-4xs">
					<n8n-link :to="documentationUrl" size="small" bold @click="onDocumentationUrlClick">
						{{ $locale.baseText('credentialEdit.credentialConfig.openDocs') }}
					</n8n-link>
				</span>
			</n8n-notice>

			<CopyInput
				v-if="isOAuthType && credentialProperties.length"
				:label="$locale.baseText('credentialEdit.credentialConfig.oAuthRedirectUrl')"
				:value="oAuthCallbackUrl"
				:copyButtonText="$locale.baseText('credentialEdit.credentialConfig.clickToCopy')"
				:hint="
					$locale.baseText('credentialEdit.credentialConfig.subtitle', { interpolate: { appName } })
				"
				:toastTitle="
					$locale.baseText('credentialEdit.credentialConfig.redirectUrlCopiedToClipboard')
				"
			/>
		</template>
		<enterprise-edition v-else :features="[EnterpriseEditionFeature.Sharing]">
			<div class="ph-no-capture">
				<n8n-info-tip :bold="false">
					{{
						$locale.baseText('credentialEdit.credentialEdit.info.sharee', {
							interpolate: { credentialOwnerName },
						})
					}}
				</n8n-info-tip>
			</div>
		</enterprise-edition>

		<CredentialInputs
			v-if="credentialType && credentialPermissions.updateConnection"
			:credentialData="credentialData"
			:credentialProperties="credentialProperties"
			:documentationUrl="documentationUrl"
			:showValidationWarnings="showValidationWarning"
			@change="onDataChange"
		/>

		<OauthButton
			v-if="
				isOAuthType &&
				requiredPropertiesFilled &&
				!isOAuthConnected &&
				credentialPermissions.isOwner
			"
			:isGoogleOAuthType="isGoogleOAuthType"
			@click="$emit('oauth')"
		/>

		<n8n-text v-if="!credentialType" color="text-base" size="medium">
			{{ $locale.baseText('credentialEdit.credentialConfig.missingCredentialType') }}
		</n8n-text>
	</div>
</template>

<script lang="ts">
import { ICredentialType } from 'n8n-workflow';
import { getAppNameFromCredType, isCommunityPackageName } from '@/utils';

import Banner from '../Banner.vue';
import CopyInput from '../CopyInput.vue';
import CredentialInputs from './CredentialInputs.vue';
import OauthButton from './OauthButton.vue';
import { restApi } from '@/mixins/restApi';
import { addCredentialTranslation } from '@/plugins/i18n';
import mixins from 'vue-typed-mixins';
import { BUILTIN_CREDENTIALS_DOCS_URL, DOCS_DOMAIN, EnterpriseEditionFeature } from '@/constants';
import { IPermissions } from '@/permissions';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNDVStore } from '@/stores/ndv';
import { useCredentialsStore } from '@/stores/credentials';

export default mixins(restApi).extend({
	name: 'CredentialConfig',
	components: {
		Banner,
		CopyInput,
		CredentialInputs,
		OauthButton,
	},
	props: {
		credentialType: {
			type: Object,
		},
		credentialProperties: {
			type: Array,
		},
		parentTypes: {
			type: Array,
		},
		credentialData: {},
		credentialId: {
			type: String,
			default: '',
		},
		showValidationWarning: {
			type: Boolean,
			default: false,
		},
		authError: {
			type: String,
		},
		testedSuccessfully: {
			type: Boolean,
		},
		isOAuthType: {
			type: Boolean,
		},
		isOAuthConnected: {
			type: Boolean,
		},
		isRetesting: {
			type: Boolean,
		},
		credentialPermissions: {
			type: Object,
			default: (): IPermissions => ({}),
		},
		requiredPropertiesFilled: {
			type: Boolean,
		},
	},
	data() {
		return {
			EnterpriseEditionFeature,
		};
	},
	async beforeMount() {
		if (this.rootStore.defaultLocale === 'en') return;

		this.uiStore.activeCredentialType = this.credentialType.name;

		const key = `n8n-nodes-base.credentials.${this.credentialType.name}`;

		if (this.$locale.exists(key)) return;

		const credTranslation = await this.restApi().getCredentialTranslation(this.credentialType.name);

		addCredentialTranslation(
			{ [this.credentialType.name]: credTranslation },
			this.rootStore.defaultLocale,
		);
	},
	computed: {
		...mapStores(useCredentialsStore, useNDVStore, useRootStore, useUIStore, useWorkflowsStore),
		appName(): string {
			if (!this.credentialType) {
				return '';
			}

			const appName = getAppNameFromCredType((this.credentialType as ICredentialType).displayName);

			return (
				appName ||
				this.$locale.baseText('credentialEdit.credentialConfig.theServiceYouReConnectingTo')
			);
		},
		credentialTypeName(): string {
			return (this.credentialType as ICredentialType).name;
		},
		credentialOwnerName(): string {
			return this.credentialsStore.getCredentialOwnerName(`${this.credentialId}`);
		},
		documentationUrl(): string {
			const type = this.credentialType as ICredentialType;
			const activeNode = this.ndvStore.activeNode;
			const isCommunityNode = activeNode ? isCommunityPackageName(activeNode.type) : false;

			const documentationUrl = type && type.documentationUrl;

			if (!documentationUrl) {
				return '';
			}

			let url: URL;
			if (documentationUrl.startsWith('https://') || documentationUrl.startsWith('http://')) {
				url = new URL(documentationUrl);
				if (url.hostname !== DOCS_DOMAIN) return documentationUrl;
			} else {
				// Don't show documentation link for community nodes if the URL is not an absolute path
				if (isCommunityNode) return '';
				else url = new URL(`${BUILTIN_CREDENTIALS_DOCS_URL}${documentationUrl}/`);
			}

			if (url.hostname === DOCS_DOMAIN) {
				url.searchParams.set('utm_source', 'n8n_app');
				url.searchParams.set('utm_medium', 'left_nav_menu');
				url.searchParams.set('utm_campaign', 'create_new_credentials_modal');
			}

			return url.href;
		},
		isGoogleOAuthType(): boolean {
			return (
				this.credentialTypeName === 'googleOAuth2Api' ||
				this.parentTypes.includes('googleOAuth2Api')
			);
		},
		oAuthCallbackUrl(): string {
			const oauthType =
				this.credentialTypeName === 'oAuth2Api' || this.parentTypes.includes('oAuth2Api')
					? 'oauth2'
					: 'oauth1';
			return this.rootStore.oauthCallbackUrls[oauthType as keyof {}];
		},
		showOAuthSuccessBanner(): boolean {
			return (
				this.isOAuthType &&
				this.requiredPropertiesFilled &&
				this.isOAuthConnected &&
				!this.authError
			);
		},
	},
	methods: {
		onDataChange(event: { name: string; value: string | number | boolean | Date | null }): void {
			this.$emit('change', event);
		},
		onDocumentationUrlClick(): void {
			this.$telemetry.track('User clicked credential modal docs link', {
				docs_link: this.documentationUrl,
				credential_type: this.credentialTypeName,
				source: 'modal',
				workflow_id: this.workflowsStore.workflowId,
			});
		},
	},
	watch: {
		showOAuthSuccessBanner(newValue, oldValue) {
			if (newValue && !oldValue) {
				this.$emit('scrollToTop');
			}
		},
	},
});
</script>

<style lang="scss" module>
.container {
	--notice-margin: 0;
	> * {
		margin-bottom: var(--spacing-l);
	}
}
</style>
