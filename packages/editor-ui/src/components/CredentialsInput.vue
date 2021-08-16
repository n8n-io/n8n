<template>
	<div @keydown.stop :class="$style.container">
		<div v-if="isOAuthType && credentialProperties.length">
			<n8n-input-label label="OAuth redirect url">
				<div :class="$style.copyText" @click="copyCallbackUrl">
					{{oAuthCallbackUrl}}
					<div :class="$style.copyButton">Click to copy</div>
				</div>
			</n8n-input-label>
		</div>

		<div v-for="parameter in credentialProperties" :key="parameter.name">
				<n8n-input-label :label="parameter.displayName" :tooltipText="parameter.description">
					<parameter-input
						:parameter="parameter"
						:value="credentialData[parameter.name]"
						:path="parameter.name"
						:isCredential="true"
						:displayOptions="true"
						@valueChanged="valueChanged"
						inputSize="medium"
					/>
				</n8n-input-label>
		</div>

		<div v-if="isOAuthType" class="oauth-information">
			<span v-if="requiredPropertiesFilled === false">
				<n8n-button title="Connect OAuth Credentials" label="Connect my account"  :disabled="true" size="large" />
			</span>
			<span v-else-if="isOAuthConnected === true">
				<n8n-icon-button title="Reconnect OAuth Credentials" @click.stop="oAuthCredentialAuthorize()" icon="redo" size="large" />
				Connected
			</span>
			<span v-else>
				<span v-if="isGoogleOAuthType">
					<img :src="basePath + 'google-signin.png'" :class="$style.googleIcon" alt="Sign in with Google" @click.stop="oAuthCredentialAuthorize()" />
				</span>
				<span v-else>
					<n8n-button title="Connect OAuth Credentials" label="Connect my account"  size="large" @click.stop="oAuthCredentialAuthorize()" />
				</span>
			</span>
		</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { copyPaste } from '@/components/mixins/copyPaste';
import { restApi } from '@/components/mixins/restApi';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import {
	IUpdateInformation,
} from '@/Interface';
import {
	INodeParameters,
	INodeProperties,
} from 'n8n-workflow';

import ParameterInput from '@/components/ParameterInput.vue';

import mixins from 'vue-typed-mixins';

export default mixins(
	copyPaste,
	nodeHelpers,
	restApi,
	showMessage,
).extend({
	name: 'CredentialsInput',
	props: [
		'credentialTypeData',	// ICredentialType
		'credentialData',		// ICredentialsDecryptedResponse
	],
	components: {
		ParameterInput,
	},
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
		credentialProperties (): INodeProperties[] {
			return this.credentialTypeData.properties.filter((propertyData: INodeProperties) => {
				if (!this.displayCredentialParameter(propertyData)) {
					return false;
				}
				return !this.credentialTypeData.__overwrittenProperties || !this.credentialTypeData.__overwrittenProperties.includes(propertyData.name);
			});
		},
		isGoogleOAuthType (): boolean {
			if (this.credentialTypeData.name === 'googleOAuth2Api') {
				return true;
			}
			const types = this.parentTypes(this.credentialTypeData.name);
			return types.includes('googleOAuth2Api');
		},
		isOAuthType (): boolean {
			if (['oAuth1Api', 'oAuth2Api'].includes(this.credentialTypeData.name)) {
				return true;
			}
			const types = this.parentTypes(this.credentialTypeData.name);
			return types.includes('oAuth1Api') || types.includes('oAuth2Api');
		},
		isOAuthConnected (): boolean {
			if (this.isOAuthType === false) {
				return false;
			}

			return this.credentialData.oauthTokenData;
		},
		oAuthCallbackUrl (): string {
			const types = this.parentTypes(this.credentialTypeData.name);
			const oauthType = (this.credentialTypeData.name === 'oAuth2Api' || types.includes('oAuth2Api')) ? 'oauth2' : 'oauth1';
			return this.$store.getters.oauthCallbackUrls[oauthType];
		},
		requiredPropertiesFilled (): boolean {
			for (const property of this.credentialProperties) {
				if (property.required !== true) {
					continue;
				}

				if (!this.credentialData[property.name]) {
					return false;
				}
			}
			return true;
		},
	},
	methods: {
		copyCallbackUrl (): void {
			this.copyToClipboard(this.oAuthCallbackUrl);

			this.$showMessage({
				title: 'Copied',
				message: `Callback URL was successfully copied!`,
				type: 'success',
			});
		},

		parentTypes (name: string): string[] {
			const credentialType = this.$store.getters['credentials/getCredentialTypeByName'](name);

			if (credentialType === undefined || credentialType.extends === undefined) {
				return [];
			}

			const types: string[] = [];
			for (const typeName of credentialType.extends) {
				types.push(typeName);
				types.push.apply(types, this.parentTypes(typeName));
			}

			return types;
		},

		valueChanged (parameterData: IUpdateInformation) {
			const name = parameterData.name.split('.').pop();

			this.$emit('change', {
				name,
				value: parameterData.value,
			});
		},

		oAuthCredentialAuthorize(): void {
			this.$emit('oauth');
		},

		displayCredentialParameter (parameter: INodeProperties): boolean {
			if (parameter.type === 'hidden') {
				return false;
			}

			if (parameter.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}

			return this.displayParameter(this.credentialData as INodeParameters, parameter, '');
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

.copyText {
	font-family: Monaco;
	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	cursor: pointer;
	display: inline-block;
	position: relative;

	&:hover {
		--display-copy-button: block;
		width: 100%;
	}
}

.copyButton {
	display: var(--display-copy-button, none);
	position: absolute;
	top: 0;
	right: 0;
	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
}

.googleIcon {
	width: 191px;
	cursor: pointer;
}
</style>
