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
					<parameter-input :parameter="parameter" :value="propertyValue[parameter.name]" :path="parameter.name" :isCredential="true" :displayOptions="true" @valueChanged="valueChanged" inputSize="medium" />
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
import { externalHooks } from '@/components/mixins/externalHooks';
import { restApi } from '@/components/mixins/restApi';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import {
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	IUpdateInformation,
} from '@/Interface';
import {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialType,
	ICredentialNodeAccess,
	INodeCredentialDescription,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodeHelpers,
} from 'n8n-workflow';

import ParameterInput from '@/components/ParameterInput.vue';

import mixins from 'vue-typed-mixins';

export default mixins(
	copyPaste,
	externalHooks,
	nodeHelpers,
	restApi,
	showMessage,
).extend({
	name: 'CredentialsInput',
	props: [
		'credentialTypeData',	// ICredentialType
		'credentialData',		// ICredentialsDecryptedResponse
		'nodesInit',			// {
		//						 	type: Array,
		//						 	default: () => { [] },
		//						 }
	],
	components: {
		ParameterInput,
	},
	data () {
		return {
			basePath: this.$store.getters.getBaseUrl,
			credentialDataTemp: null as ICredentialsDecryptedResponse | null,
			nodesAccess: [] as string[],
			propertyValue: {} as ICredentialDataDecryptedObject,
		};
	},
	computed: {
		credentialProperties (): INodeProperties[] {
			return this.credentialTypeData.properties.filter((propertyData: INodeProperties) => {
				if (!this.displayCredentialParameter(propertyData)) {
					return false;
				}
				return !this.credentialTypeData.__overwrittenProperties || !this.credentialTypeData.__overwrittenProperties.includes(propertyData.name);
			});
		},
		credentialDataDynamic (): ICredentialsDecryptedResponse | null {
			if (this.credentialData) {
				return this.credentialData;
			}

			return this.credentialDataTemp;
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

			return this.credentialDataDynamic !== null && !!this.credentialDataDynamic.data!.oauthTokenData;
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

				if (!this.propertyValue[property.name]) {
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
			const name = parameterData.name.split('.').pop() as string;
			// For a currently for me unknown reason can In not simply just
			// set the value and it has to be this way.
			const tempValue = JSON.parse(JSON.stringify(this.propertyValue));
			tempValue[name] = parameterData.value;
			Vue.set(this, 'propertyValue', tempValue);
		},
		displayCredentialParameter (parameter: INodeProperties): boolean {
			if (parameter.type === 'hidden') {
				return false;
			}

			if (parameter.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}

			return this.displayParameter(this.propertyValue as INodeParameters, parameter, '');
		},
		async createCredentials (closeDialog: boolean): Promise<ICredentialsResponse | null> {
			const nodesAccess = this.nodesAccess.map((nodeType) => {
				return {
					nodeType,
				};
			});

			const newCredentials = {
				type: (this.credentialTypeData as ICredentialType).name,
				nodesAccess,
				// Save only the none default data
				data: NodeHelpers.getNodeParameters(this.credentialTypeData.properties as INodeProperties[], this.propertyValue as INodeParameters, false, false),
			} as ICredentialsDecrypted;

			let result;
			try {
				result = await this.restApi().createNewCredentials(newCredentials);
			} catch (error) {
				this.$showError(error, 'Problem Creating Credentials', 'There was a problem creating the credentials:');
				return null;
			}

			// Add also to local store
			this.$store.commit('addCredentials', result);

			this.$emit('credentialsCreated', {data: result, options: { closeDialog }});

			this.$externalHooks().run('credentials.create', { credentialTypeData: this.credentialTypeData });

			return result;
		},
		async oAuthCredentialAuthorize () {
			let url;

			let credentialData = this.credentialDataDynamic;
			let newCredentials = false;
			if (!credentialData) {
				// Credentials did not get created yet. So create first before
				// doing oauth authorize
				credentialData = await this.createCredentials(false) as ICredentialsDecryptedResponse;
				newCredentials = true;
				if (credentialData === null) {
					return;
				}

				// Set the internal data directly so that even if it fails it displays a "Save" instead
				// of the "Create" button. If that would not be done, people could not retry after a
				// connect issue as it woult try to create credentials again which would fail as they
				// exist already.
				Vue.set(this, 'credentialDataTemp', credentialData);
			} else {
				// Exists already but got maybe changed. So save first
				credentialData = await this.updateCredentials(false) as ICredentialsDecryptedResponse;
				if (credentialData === null) {
					return;
				}
			}

			const types = this.parentTypes(this.credentialTypeData.name);

			try {
				if (this.credentialTypeData.name === 'oAuth2Api' || types.includes('oAuth2Api')) {
					url = await this.restApi().oAuth2CredentialAuthorize(credentialData as ICredentialsResponse) as string;
				} else if (this.credentialTypeData.name === 'oAuth1Api' || types.includes('oAuth1Api')) {
					url = await this.restApi().oAuth1CredentialAuthorize(credentialData as ICredentialsResponse) as string;
				}
			} catch (error) {
				this.$showError(error, 'OAuth Authorization Error', 'Error generating authorization URL:');
				return;
			}

			const params = `scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700`;
			const oauthPopup = window.open(url, 'OAuth2 Authorization', params);

			const receiveMessage = (event: MessageEvent) => {
				// // TODO: Add check that it came from n8n
				// if (event.origin !== 'http://example.org:8080') {
				// 	return;
				// }

				if (event.data === 'success') {

					// Set some kind of data that status changes.
					// As data does not get displayed directly it does not matter what data.
					if (this.credentialData === null) {
						// Are new credentials so did not get send via "credentialData"
						Vue.set(this, 'credentialDataTemp', credentialData);
						Vue.set(this.credentialDataTemp!.data!, 'oauthTokenData', {});
					} else {
						// Credentials did already exist so can be set directly
						Vue.set(this.credentialData.data, 'oauthTokenData', {});
					}

					// Save that OAuth got authorized locally
					this.$store.commit('updateCredentials', this.credentialDataDynamic);

					// Close the window
					if (oauthPopup) {
						oauthPopup.close();
					}

					if (newCredentials === true) {
						this.$emit('credentialsCreated', {data: credentialData, options: { closeDialog: false }});
					}

					this.$showMessage({
						title: 'Connected',
						message: 'Connected successfully!',
						type: 'success',
					});

					// Make sure that the event gets removed again
					window.removeEventListener('message', receiveMessage, false);
				}

			};

			window.addEventListener('message', receiveMessage, false);
		},
		async updateCredentials (closeDialog: boolean): Promise<ICredentialsResponse | null> {
			const nodesAccess: ICredentialNodeAccess[] = [];
			const addedNodeTypes: string[] = [];

			// Add Node-type which already had access to keep the original added date
			let nodeAccessData: ICredentialNodeAccess;
			for (nodeAccessData of (this.credentialDataDynamic as ICredentialsDecryptedResponse).nodesAccess) {
				if (this.nodesAccess.includes((nodeAccessData.nodeType))) {
					nodesAccess.push(nodeAccessData);
					addedNodeTypes.push(nodeAccessData.nodeType);
				}
			}

			// Add Node-type which did not have access before
			for (const nodeType of this.nodesAccess) {
				if (!addedNodeTypes.includes(nodeType)) {
					nodesAccess.push({
						nodeType,
					});
				}
			}

			const newCredentials = {
				type: (this.credentialTypeData as ICredentialType).name,
				nodesAccess,
				// Save only the none default data
				data: NodeHelpers.getNodeParameters(this.credentialTypeData.properties as INodeProperties[], this.propertyValue as INodeParameters, false, false),
			} as ICredentialsDecrypted;

			let result;
			try {
				result = await this.restApi().updateCredentials((this.credentialDataDynamic as ICredentialsDecryptedResponse).id as string, newCredentials);
			} catch (error) {
				this.$showError(error, 'Problem Updating Credentials', 'There was a problem updating the credentials:');
				return null;
			}

			// Update also in local store
			this.$store.commit('updateCredentials', result);

			// Now that the credentials changed check if any nodes use credentials
			// which have now a different name
			this.updateNodesCredentialsIssues();

			this.$emit('credentialsUpdated', {data: result, options: { closeDialog }});

			return result;
		},
		init () {
			if (this.credentialData) {
				// Initialize with the given data
				this.propertyValue = (this.credentialData as ICredentialsDecryptedResponse).data as ICredentialDataDecryptedObject;
				const nodesAccess = (this.credentialData as ICredentialsDecryptedResponse).nodesAccess.map((nodeAccess) => {
					return nodeAccess.nodeType;
				});

				Vue.set(this, 'nodesAccess', nodesAccess);
			} else {
				// No data supplied so init empty
				this.propertyValue = {} as ICredentialDataDecryptedObject;
				const nodesAccess = [] as string[];
				nodesAccess.push.apply(nodesAccess, this.nodesInit);

				Vue.set(this, 'nodesAccess', nodesAccess);
			}

			// Set default values
			for (const property of (this.credentialTypeData as ICredentialType).properties) {
				if (!this.propertyValue.hasOwnProperty(property.name)) {
					this.propertyValue[property.name] = property.default as CredentialInformation;
				}
			}
		},
	},
	watch: {
		credentialData () {
			this.init();
		},
		credentialTypeData () {
			this.init();
		},
	},
	mounted () {
		this.init();
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
