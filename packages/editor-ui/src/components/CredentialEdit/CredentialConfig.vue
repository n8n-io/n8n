<template>
	<div :class="$style.container">
		<banner
			v-show="showValidationWarning"
			theme="danger"
			message="Please check the errors below"
		/>

		<banner
			v-if="authError && !showValidationWarning"
			theme="danger"
			message="Couldn’t connect with these settings"
			:details="authError"
			buttonLabel="Retry"
			buttonLoadingLabel="Retrying"
			buttonTitle="Retry credentials test"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<banner
			v-show="showOAuthSuccessBanner && !showValidationWarning"
			theme="success"
			message="Account connected"
			buttonLabel="Reconnect"
			buttonTitle="Reconnect OAuth Credentials"
			@click="$emit('oauth')"
		/>

		<banner
			v-show="testedSuccessfully && !showValidationWarning"
			theme="success"
			message="Connection tested successfully"
			buttonLabel="Retry"
			buttonLoadingLabel="Retrying"
			buttonTitle="Retry credentials test"
			:buttonLoading="isRetesting"
			@click="$emit('retest')"
		/>

		<n8n-info-tip v-if="documentationUrl && credentialProperties.length">
			Need help filling out these fields?
			<a :href="documentationUrl" target="_blank">Open docs</a>
		</n8n-info-tip>

		<CopyInput
			v-if="isOAuthType && credentialProperties.length"
			label="OAuth Redirect URL"
			:copyContent="oAuthCallbackUrl"
			copyButtonText="Click to copy"
			:subtitle="`In ${appName}, use the URL above when prompted to enter an OAuth callback or redirect URL`"
			successMessage="Redirect URL copied to clipboard"
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

export default Vue.extend({
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
		onDataChange(event: { name: string; value: string | number | boolean | Date | null }): void {
			this.$emit('change', event);
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
