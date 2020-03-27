<template>
	<div @keydown.stop class="credentials-input-wrapper">
		<el-row>
			<el-col :span="6" class="headline-regular">
				Credentials Name:
				<el-tooltip class="credentials-info" placement="top" effect="light">
					<div slot="content" v-html="helpTexts.credentialsName"></div>
					<font-awesome-icon icon="question-circle" />
				</el-tooltip>
			</el-col>
			<el-col :span="18">
				<el-input size="small" type="text" v-model="name"></el-input>
			</el-col>
		</el-row>

		<el-row v-if="isOAuthType" class="oauth-information">
			<el-col :span="6" class="headline">
				OAuth
			</el-col>
			<el-col :span="18">
				<span v-if="isOAuthConnected === true">
					<el-button title="Reconnect OAuth Credentials" @click.stop="oAuth2CredentialAuthorize()" circle>
						<font-awesome-icon icon="redo" />
					</el-button>
					Is connected
				</span>
				<span v-else>
					<el-button title="Connect OAuth Credentials" @click.stop="oAuth2CredentialAuthorize()" circle>
						<font-awesome-icon icon="sign-in-alt" />
					</el-button>
					Is NOT connected
				</span>
			</el-col>
		</el-row>

		<br />
		<div class="headline" v-if="credentialProperties.length">
			Credential Data:
			<el-tooltip class="credentials-info" placement="top" effect="light">
				<div slot="content" v-html="helpTexts.credentialsData"></div>
				<font-awesome-icon icon="question-circle" />
			</el-tooltip>
		</div>
		<div v-for="parameter in credentialProperties" :key="parameter.name">
			<el-row v-if="displayNodeParameter(parameter)" class="parameter-wrapper">
				<el-col :span="6" class="parameter-name">
					{{parameter.displayName}}:
					<el-tooltip placement="top" class="parameter-info" v-if="parameter.description" effect="light">
						<div slot="content" v-html="parameter.description"></div>
						<font-awesome-icon icon="question-circle"/>
					</el-tooltip>
				</el-col>
				<el-col :span="18">
					<parameter-input :parameter="parameter" :value="propertyValue[parameter.name]" :path="parameter.name" :isCredential="true" @valueChanged="valueChanged" />
				</el-col>
			</el-row>
		</div>


		<el-row class="nodes-access-wrapper">
			<el-col :span="6" class="headline">
				Nodes with access:
				<el-tooltip class="credentials-info" placement="top" effect="light">
					<div slot="content" v-html="helpTexts.nodesWithAccess"></div>
					<font-awesome-icon icon="question-circle" />
				</el-tooltip>
			</el-col>
			<el-col :span="18">
				<el-transfer
					:titles="['No Access', 'Access ']"
					v-model="nodesAccess"
					:data="allNodesRequestingAccess">
				</el-transfer>

				<div v-if="nodesAccess.length === 0" class="no-nodes-access">
					<strong>
						Important!
					</strong><br />
					Add at least one node which has access to the credentials!
				</div>
			</el-col>
		</el-row>

		<div class="action-buttons">
			<el-button type="success" @click="updateCredentials(true)" v-if="credentialDataDynamic">
				Save
			</el-button>
			<el-button type="success" @click="createCredentials(true)" v-else>
				Create
			</el-button>
		</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';

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
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import ParameterInput from '@/components/ParameterInput.vue';

import mixins from 'vue-typed-mixins';

export default mixins(
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
			helpTexts: {
				credentialsData: 'The credentials to set.',
				credentialsName: 'The name the credentials should be saved as. Use a name<br />which makes it clear to what exactly they give access to.<br />For credentials of an Email account that could be the Email address itself.',
				nodesWithAccess: 'The nodes which allowed to use this credentials.',
			},
			credentialDataTemp: null as ICredentialsDecryptedResponse | null,
			nodesAccess: [] as string[],
			name: '',
			propertyValue: {} as ICredentialDataDecryptedObject,
		};
	},
	computed: {
		allNodesRequestingAccess (): Array<{key: string, label: string}> {
			const returnNodeTypes: string[] = [];

			const nodeTypes: INodeTypeDescription[] = this.$store.getters.allNodeTypes;

			let nodeType: INodeTypeDescription;
			let credentialTypeDescription: INodeCredentialDescription;

			// Find the node types which need the credentials
			for (nodeType of nodeTypes) {
				if (!nodeType.credentials) {
					continue;
				}

				for (credentialTypeDescription of nodeType.credentials) {
					if (credentialTypeDescription.name === (this.credentialTypeData as ICredentialType).name && !returnNodeTypes.includes(credentialTypeDescription.name)) {
						returnNodeTypes.push(nodeType.name);
						break;
					}
				}
			}

			// Return the data in the correct format el-transfer expects
			return returnNodeTypes.map((nodeTypeName: string) => {
				return {
					key: nodeTypeName,
					label: this.$store.getters.nodeType(nodeTypeName).displayName as string,
				};
			});
		},
		credentialProperties (): INodeProperties[] {
			return this.credentialTypeData.properties.filter((propertyData: INodeProperties) => {
				return !this.credentialTypeData.__overwrittenProperties || !this.credentialTypeData.__overwrittenProperties.includes(propertyData.name);
			});
		},
		credentialDataDynamic (): ICredentialsDecryptedResponse | null {
			if (this.credentialData) {
				return this.credentialData;
			}

			return this.credentialDataTemp;
		},
		isOAuthType (): boolean {
			if (this.credentialTypeData.name === 'oAuth2Api') {
				return true;
			}
			const types = this.parentTypes(this.credentialTypeData.name);
			return types.includes('oAuth2Api');
		},
		isOAuthConnected (): boolean {
			if (this.isOAuthType === false) {
				return false;
			}

			return this.credentialDataDynamic !== null && !!this.credentialDataDynamic.data!.oauthTokenData;
		},
	},
	methods: {
		parentTypes (name: string): string[] {
			const credentialType = this.$store.getters.credentialType(name);

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
		async createCredentials (closeDialog: boolean): Promise<ICredentialsResponse | null> {
			const nodesAccess = this.nodesAccess.map((nodeType) => {
				return {
					nodeType,
				};
			});

			const newCredentials = {
				name: this.name,
				type: (this.credentialTypeData as ICredentialType).name,
				nodesAccess,
				data: this.propertyValue,
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

			return result;
		},
		displayNodeParameter (parameter: INodeProperties): boolean {
			if (parameter.type === 'hidden') {
				return false;
			}

			return true;
		},
		async oAuth2CredentialAuthorize () {
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
			} else {
				// Exists already but got maybe changed. So save first
				credentialData = await this.updateCredentials(false) as ICredentialsDecryptedResponse;
				if (credentialData === null) {
					return;
				}
			}

			try {
				url = await this.restApi().oAuth2CredentialAuthorize(credentialData as ICredentialsResponse) as string;
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
						message: 'Got connected!',
						type: 'success',
					});
				}

				// Make sure that the event gets removed again
				window.removeEventListener('message', receiveMessage, false);
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
				name: this.name,
				type: (this.credentialTypeData as ICredentialType).name,
				nodesAccess,
				data: this.propertyValue,
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
				this.name = (this.credentialData as ICredentialsDecryptedResponse).name;
				this.propertyValue = (this.credentialData as ICredentialsDecryptedResponse).data as ICredentialDataDecryptedObject;
				const nodesAccess = (this.credentialData as ICredentialsDecryptedResponse).nodesAccess.map((nodeAccess) => {
					return nodeAccess.nodeType;
				});

				Vue.set(this, 'nodesAccess', nodesAccess);
			} else {
				// No data supplied so init empty
				this.name = '';
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

<style lang="scss">

.credentials-input-wrapper {
	.action-buttons {
		margin-top: 2em;
		text-align: right;
	}

	.headline {
		font-weight: 600;
		color: $--color-primary;
		margin-bottom: 1em;
	}

	.nodes-access-wrapper {
		margin-top: 1em;
	}

	.no-nodes-access {
		margin: 1em 0;
		color: $--color-primary;
		line-height: 1.75em;
	}

	.oauth-information {
		line-height: 2.5em;
		margin-top: 2em;
	}

	.parameter-wrapper {
		line-height: 3em;

		.parameter-name {
			position: relative;

			&:hover {
				.parameter-info {
					display: inline;
				}
			}

			.parameter-info {
				display: none;
			}
		}
	}

	.credentials-info {
		display: none;
	}

	.headline:hover,
	.headline-regular:hover {
		.credentials-info {
			display: inline;
		}
	}

}

</style>
