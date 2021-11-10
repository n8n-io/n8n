<template>
	<div :class="$style.container">
		<banner
			v-show="showValidationWarning"
			theme="danger"
			:message="$baseText('credentialEdit.credentialConfig.pleaseCheckTheErrorsBelow')"
		/>

		<banner
			v-if="authError && !showValidationWarning"
			theme="danger"
			:message="$baseText('credentialEdit.credentialConfig.couldntConnectWithTheseSettings')"
			:details="authError"
			:buttonLabel="$baseText('credentialEdit.credentialConfig.retry')"
			buttonLoadingLabel="Retrying"
			:buttonTitle="$baseText('credentialEdit.credentialConfig.retryCredentialTest')"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<banner
			v-show="showOAuthSuccessBanner && !showValidationWarning"
			theme="success"
			:message="$baseText('credentialEdit.credentialConfig.accountConnected')"
			:buttonLabel="$baseText('credentialEdit.credentialConfig.reconnect')"
			:buttonTitle="$baseText('credentialEdit.credentialConfig.reconnectOAuth2Credential')"
			@click="$emit('oauth')"
		/>

		<banner
			v-show="testedSuccessfully && !showValidationWarning"
			theme="success"
			:message="$baseText('credentialEdit.credentialConfig.connectionTestedSuccessfully')"
			:buttonLabel="$baseText('credentialEdit.credentialConfig.retry')"
			:buttonLoadingLabel="$baseText('credentialEdit.credentialConfig.retrying')"
			:buttonTitle="$baseText('credentialEdit.credentialConfig.retryCredentialTest')"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<n8n-info-tip v-if="documentationUrl && credentialProperties.length">
			{{ $baseText('credentialEdit.credentialConfig.needHelpFillingOutTheseFields') }}
			<a :href="documentationUrl" target="_blank" @click="onDocumentationUrlClick">
				{{ $baseText('credentialEdit.credentialConfig.openDocs') }}
			</a>
		</n8n-info-tip>

		<CopyInput
			v-if="isOAuthType && credentialProperties.length"
			:label="$baseText('credentialEdit.credentialConfig.oAuthRedirectUrl')"
			:copyContent="oAuthCallbackUrl"
			:copyButtonText="$baseText('credentialEdit.credentialConfig.clickToCopy')"
			:subtitle="$baseText('credentialEdit.credentialConfig.subtitle', { interpolate: { appName } })"
			:successMessage="$baseText('credentialEdit.credentialConfig.redirectUrlCopiedToClipboard')"
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
import { ICredentialType } from 'n8n-workflow';
import { getAppNameFromCredType } from '../helpers';

import Vue from 'vue';
import Banner from '../Banner.vue';
import CopyInput from '../CopyInput.vue';
import CredentialInputs from './CredentialInputs.vue';
import OauthButton from './OauthButton.vue';
import { renderText } from '../mixins/renderText';

import mixins from 'vue-typed-mixins';

export default mixins(renderText).extend({
	name: 'CredentialConfig',
	components: {
		Banner,
		CopyInput,
		CredentialInputs,
		OauthButton,
	},
	props: {
		credentialType: {
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
	computed: {
		appName(): string {
			if (!this.credentialType) {
				return '';
			}

			const appName = getAppNameFromCredType(
				(this.credentialType as ICredentialType).displayName,
			);

			return appName || "the service you're connecting to";
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
