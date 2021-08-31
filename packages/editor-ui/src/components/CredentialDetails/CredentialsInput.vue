<template>
	<div @keydown.stop :class="$style.container">
		<div :class="$style.infotip">
			<n8n-icon icon="info-circle" /> Need help filling out these fields?
			<a :href="documentationUrl" target="_blank">Open docs</a>
		</div>

		<div v-if="isOAuthType && credentialProperties.length">
			<n8n-input-label label="OAuth redirect url">
				<div :class="$style.copyText" @click="copyCallbackUrl">
					<span>{{ oAuthCallbackUrl }}</span>
					<div :class="$style.copyButton">Click to copy</div>
				</div>
			</n8n-input-label>
			<div :class="$style.oauthInfo">In {{ appName }}, use the URL above when prompted to enter an OAuth callback or redirect URL</div>
		</div>

		<div v-for="parameter in credentialProperties" :key="parameter.name">
			<n8n-input-label
				:label="parameter.displayName"
				:tooltipText="parameter.description"
				:required="parameter.required"
			>
				<parameter-input
					:parameter="parameter"
					:value="credentialData[parameter.name]"
					:path="parameter.name"
					:isCredential="true"
					:displayOptions="true"
					@valueChanged="valueChanged"
					inputSize="large"
				/>
			</n8n-input-label>
		</div>

		<div v-if="isOAuthType">
			<span v-if="requiredPropertiesFilled === false">
				<n8n-button
					title="Connect OAuth Credentials"
					label="Connect my account"
					:disabled="true"
					size="large"
				/>
			</span>
			<span v-else-if="isOAuthConnected">
				<el-tag type="success"
					><font-awesome-icon
						icon="check-circle"
						:class="$style.successIcon"
					/><span>Account connected</span></el-tag
				>
				<n8n-button
					title="Reconnect OAuth Credentials"
					@click.stop="oAuthCredentialAuthorize()"
					size="large"
					label="Reconnect"
					type="text"
				/>
			</span>
			<span v-else>
				<span v-if="isGoogleOAuthType">
					<img
						:src="basePath + 'google-signin.png'"
						:class="$style.googleIcon"
						alt="Sign in with Google"
						@click.stop="oAuthCredentialAuthorize()"
					/>
				</span>
				<span v-else>
					<n8n-button
						title="Connect OAuth Credentials"
						label="Connect my account"
						size="large"
						@click.stop="oAuthCredentialAuthorize()"
					/>
				</span>
			</span>
		</div>
	</div>
</template>

<script lang="ts">
import { IUpdateInformation } from '../../Interface';

import { INodeParameters, INodeProperties } from 'n8n-workflow';

import ParameterInput from '../ParameterInput.vue';

import mixins from 'vue-typed-mixins';

import { copyPaste } from '../mixins/copyPaste';
import { restApi } from '../mixins/restApi';
import { nodeHelpers } from '../mixins/nodeHelpers';
import { showMessage } from '../mixins/showMessage';

import { getAppNameFromCredType } from '../helpers';

export default mixins(copyPaste, nodeHelpers, restApi, showMessage).extend({
	name: 'CredentialsInput',
	props: [
		'credentialTypeData', // ICredentialType
		'credentialData', // ICredentialsDecryptedResponse
		'parentTypes',
	],
	components: {
		ParameterInput,
	},
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
		appName(): string {
			const appName = getAppNameFromCredType(
				this.credentialTypeData.displayName,
			);

			return appName || 'app';
		},
		credentialProperties(): INodeProperties[] {
			return this.credentialTypeData.properties.filter(
				(propertyData: INodeProperties) => {
					if (!this.displayCredentialParameter(propertyData)) {
						return false;
					}
					return (
						!this.credentialTypeData.__overwrittenProperties ||
						!this.credentialTypeData.__overwrittenProperties.includes(
							propertyData.name,
						)
					);
				},
			);
		},
		isGoogleOAuthType(): boolean {
			if (this.credentialTypeData.name === 'googleOAuth2Api') {
				return true;
			}
			return this.parentTypes.includes('googleOAuth2Api');
		},
		isOAuthType(): boolean {
			if (['oAuth1Api', 'oAuth2Api'].includes(this.credentialTypeData.name)) {
				return true;
			}
			return (
				this.parentTypes.includes('oAuth1Api') ||
				this.parentTypes.includes('oAuth2Api')
			);
		},
		isOAuthConnected(): boolean {
			if (this.isOAuthType === false) {
				return false;
			}

			return !!this.credentialData.oauthTokenData;
		},
		oAuthCallbackUrl(): string {
			const oauthType =
				this.credentialTypeData.name === 'oAuth2Api' ||
				this.parentTypes.includes('oAuth2Api')
					? 'oauth2'
					: 'oauth1';
			return this.$store.getters.oauthCallbackUrls[oauthType];
		},
		requiredPropertiesFilled(): boolean {
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
		documentationUrl(): string {
			const type = this.credentialTypeData;

			if (!type) {
				return '';
			}

			if (type.documentationUrl && type.documentationUrl.startsWith('http')) {
				return type.documentationUrl;
			}

			if (type.documentationUrl) {
				return `https://docs.n8n.io/credentials/${type.documentationUrl}/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal`;
			}

			return '';
		},
	},
	methods: {
		copyCallbackUrl(): void {
			this.copyToClipboard(this.oAuthCallbackUrl);

			this.$showMessage({
				title: 'Copied',
				message: `Callback URL was successfully copied!`,
				type: 'success',
			});
		},

		valueChanged(parameterData: IUpdateInformation) {
			const name = parameterData.name.split('.').pop();

			this.$emit('change', {
				name,
				value: parameterData.value,
			});
		},

		oAuthCredentialAuthorize(): void {
			this.$emit('oauth');
		},

		displayCredentialParameter(parameter: INodeProperties): boolean {
			if (parameter.type === 'hidden') {
				return false;
			}

			if (parameter.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}

			return this.displayParameter(
				this.credentialData as INodeParameters,
				parameter,
				'',
			);
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
	span {
		font-family: Monaco;
		line-height: 1.5;
	}

	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	cursor: pointer;
	position: relative;
	font-weight: var(--font-weight-regular);

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

.successIcon {
	margin-right: var(--spacing-xs);
}

.googleIcon {
	width: 191px;
	cursor: pointer;
}

.oauthInfo {
	margin-top: var(--spacing-2xs);
	line-height: var(--font-line-height-regular);
	font-weight: var(--font-weight-regular);
}


.infotip {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
}
</style>
