<template>
	<div :class="$style.container">
		<banner
			v-show="showValidationWarning"
			theme="danger"
			:message="$locale.baseText('credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow')"
		/>

		<banner
			v-if="authError && !showValidationWarning"
			theme="danger"
			:message="$locale.baseText('credentialEdit.credentialConfig.couldntConnectWithTheseSettings')"
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

		<n8n-info-tip v-if="documentationUrl && credentialProperties.length">
			{{ $locale.baseText('credentialEdit.credentialConfig.needHelpFillingOutTheseFields') }}
			<n8n-link :to="documentationUrl" size="small" :bold="true" @click="onDocumentationUrlClick">
				{{ $locale.baseText('credentialEdit.credentialConfig.openDocs') }}
			</n8n-link>
		</n8n-info-tip>

		<CopyInput
			v-if="isOAuthType && credentialProperties.length"
			:label="$locale.baseText('credentialEdit.credentialConfig.oAuthRedirectUrl')"
			:copyContent="oAuthCallbackUrl"
			:copyButtonText="$locale.baseText('credentialEdit.credentialConfig.clickToCopy')"
			:subtitle="$locale.baseText('credentialEdit.credentialConfig.subtitle', { interpolate: { appName } })"
			:successMessage="$locale.baseText('credentialEdit.credentialConfig.redirectUrlCopiedToClipboard')"
		/>

		<CredentialInputs
			v-if="credentialType"
			:credentialData="credentialData"
			:credentialProperties="credentialProperties"
			:documentationUrl="documentationUrl"
			:showValidationWarnings="showValidationWarning"
			@change="onDataChange"
		/>

		<OauthButton
			v-if="isOAuthType && requiredPropertiesFilled && !isOAuthConnected"
			:isGoogleOAuthType="isGoogleOAuthType"
			@click="$emit('oauth')"
		/>
	</div>
</template>

<script lang="ts">
import { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { getAppNameFromCredType } from '../helpers';

import Vue from 'vue';
import Banner from '../Banner.vue';
import CopyInput from '../CopyInput.vue';
import CredentialInputs from './CredentialInputs.vue';
import OauthButton from './OauthButton.vue';
import { restApi } from '@/components/mixins/restApi';
import { addCredentialTranslation } from '@/plugins/i18n';
import mixins from 'vue-typed-mixins';

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
		credentialData: {
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
		requiredPropertiesFilled: {
			type: Boolean,
		},
	},
	async beforeMount() {
		if (this.$store.getters.defaultLocale === 'en') return;

		this.$store.commit('setActiveCredentialType', this.credentialType.name);

		const key = `n8n-nodes-base.credentials.${this.credentialType.name}`;

		if (this.$locale.exists(key)) return;

		const credTranslation = await this.restApi().getCredentialTranslation(this.credentialType.name);

		addCredentialTranslation(
			{ [this.credentialType.name]: credTranslation },
			this.$store.getters.defaultLocale,
		);
	},
	computed: {
		appName(): string {
			if (!this.credentialType) {
				return '';
			}



			const appName = getAppNameFromCredType(
				(this.credentialType as ICredentialType).displayName,
			);

			return appName || this.$locale.baseText('credentialEdit.credentialConfig.theServiceYouReConnectingTo');
		},
		credentialTypeName(): string {
			return (this.credentialType as ICredentialType).name;
		},
		documentationUrl(): string {
			const type = this.credentialType as ICredentialType;

			if (!type || !type.documentationUrl) {
				return '';
			}

			if (type.documentationUrl.startsWith('https://') || type.documentationUrl.startsWith('http://')) {
				return type.documentationUrl;
			}

			return `https://docs.n8n.io/credentials/${type.documentationUrl}/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal`;
		},
		isGoogleOAuthType(): boolean {
			return this.credentialTypeName === 'googleOAuth2Api' || this.parentTypes.includes('googleOAuth2Api');
		},
		oAuthCallbackUrl(): string {
			const oauthType =
				this.credentialTypeName === 'oAuth2Api' ||
				this.parentTypes.includes('oAuth2Api')
					? 'oauth2'
					: 'oauth1';
			return this.$store.getters.oauthCallbackUrls[oauthType];
		},
		showOAuthSuccessBanner(): boolean {
			return this.isOAuthType && this.requiredPropertiesFilled && this.isOAuthConnected && !this.authError;
		},
	},
	methods: {
		/**
		 * Get the current version for a node type.
		 */
		async getCurrentNodeVersion(targetNodeType: string) {
			const { allNodeTypes }: { allNodeTypes: INodeTypeDescription[] } = this.$store.getters;
			const found = allNodeTypes.find(nodeType => nodeType.name === targetNodeType);

			return found ? found.version : 1;
		},

		onDataChange (event: { name: string; value: string | number | boolean | Date | null }): void {
			this.$emit('change', event);
		},
		onDocumentationUrlClick (): void {
			this.$telemetry.track('User clicked credential modal docs link', {
				docs_link: this.documentationUrl,
				credential_type: this.credentialTypeName,
				source: 'modal',
				workflow_id: this.$store.getters.workflowId,
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
	> * {
		margin-bottom: var(--spacing-l);
	}
}

</style>
