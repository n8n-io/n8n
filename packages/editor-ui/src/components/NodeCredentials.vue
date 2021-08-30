<template>
	<div v-if="credentialTypesNodeDescriptionDisplayed.length" class="node-credentials">
		<credentials-edit :dialogVisible="credentialNewDialogVisible" :editCredentials="editCredentials" :setCredentialType="addType" :nodesInit="nodesInit" :node="node" @closeDialog="closeCredentialNewDialog" @credentialsCreated="credentialsCreated" @credentialsUpdated="credentialsUpdated"></credentials-edit>

		<div class="headline">
			Credentials
		</div>

		<div v-for="credentialTypeDescription in credentialTypesNodeDescriptionDisplayed" :key="credentialTypeDescription.name" class="credential-data">
			<el-row v-if="displayCredentials(credentialTypeDescription)" class="credential-parameter-wrapper">

				<el-col :span="10" class="parameter-name">
					{{credentialTypeNames[credentialTypeDescription.name]}}:
				</el-col>
				<el-col :span="12" class="parameter-value" :class="getIssues(credentialTypeDescription.name).length?'has-issues':''">

					<div :style="credentialInputWrapperStyle(credentialTypeDescription.name)">
						<n8n-select v-model="credentials[credentialTypeDescription.name]" :disabled="isReadOnly" @change="credentialSelected(credentialTypeDescription.name)" placeholder="Select Credential" size="small">
							<n8n-option
								v-for="(item, index) in credentialOptions[credentialTypeDescription.name]"
								:key="item.name + '_' + index"
								:label="item.name"
								:value="item.name">
							</n8n-option>
						</n8n-select>
					</div>

					<div class="credential-issues">
						<n8n-tooltip placement="top" >
							<div slot="content" v-html="'Issues:<br />&nbsp;&nbsp;- ' + getIssues(credentialTypeDescription.name).join('<br />&nbsp;&nbsp;- ')"></div>
							<font-awesome-icon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>

				</el-col>
				<el-col :span="2" class="parameter-value credential-action">
					<font-awesome-icon v-if="credentials[credentialTypeDescription.name]" icon="pen" @click="updateCredentials(credentialTypeDescription.name)" class="update-credentials clickable" title="Update Credentials" />
				</el-col>

			</el-row>
		</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { restApi } from '@/components/mixins/restApi';
import {
	ICredentialsCreatedEvent,
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
} from '@/Interface';
import {
	ICredentialType,
	INodeCredentialDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import CredentialsEdit from '@/components/CredentialsEdit.vue';
import ParameterInput from '@/components/ParameterInput.vue';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	nodeHelpers,
	restApi,
	showMessage,
).extend({
	name: 'NodeCredentials',
	props: [
		'node', // INodeUi
	],
	components: {
		CredentialsEdit,
		ParameterInput,
	},
	computed: {
		credentialTypesNode (): string[] {
			return this.credentialTypesNodeDescription
				.map((credentialTypeDescription) => credentialTypeDescription.name);
		},
		credentialTypesNodeDescriptionDisplayed (): INodeCredentialDescription[] {
			return this.credentialTypesNodeDescription
				.filter((credentialTypeDescription) => {
					return this.displayCredentials(credentialTypeDescription);
				});
		},
		credentialTypesNodeDescription (): INodeCredentialDescription[] {
			const node = this.node as INodeUi;

			const activeNodeType = this.$store.getters.nodeType(node.type) as INodeTypeDescription;
			if (activeNodeType && activeNodeType.credentials) {
				return activeNodeType.credentials;
			}

			return [];
		},
		credentialTypeNames () {
			const returnData: {
				[key: string]: string;
			} = {};
			let credentialType: ICredentialType | null;
			for (const credentialTypeName of this.credentialTypesNode) {
				credentialType = this.$store.getters.credentialType(credentialTypeName);
				returnData[credentialTypeName] = credentialType !== null ? credentialType.displayName : credentialTypeName;
			}
			return returnData;
		},
	},
	data () {
		return {
			addType: undefined as string | undefined,
			credentialNewDialogVisible: false,
			credentialOptions: {} as { [key: string]: ICredentialsResponse[]; },
			credentials: {} as {
				[key: string]: string | undefined
			},
			editCredentials: null as object | null, // Credentials filter
			newCredentialText: '- Create New -',
			nodesInit: undefined as string[] | undefined,
		};
	},
	watch: {
		node () {
			this.init();
		},
	},
	methods: {
		closeCredentialNewDialog () {
			this.credentialNewDialogVisible = false;
		},
		async credentialsCreated (eventData: ICredentialsCreatedEvent) {
			await this.credentialsUpdated(eventData);
		},
		credentialsUpdated (eventData: ICredentialsCreatedEvent) {
			if (!this.credentialTypesNode.includes(eventData.data.type)) {
				return;
			}

			this.init();
			Vue.set(this.credentials, eventData.data.type, eventData.data.name);

			// Makes sure that it does also get set correctly on the node not just the UI
			this.credentialSelected(eventData.data.type);

			if (eventData.options.closeDialog === true) {
				this.closeCredentialNewDialog();
			}
		},
		credentialInputWrapperStyle (credentialType: string) {
			let deductWidth = 0;
			const styles = {
				width: '100%',
			};
			if (this.getIssues(credentialType).length) {
				deductWidth += 20;
			}

			if (deductWidth !== 0) {
				styles.width = `calc(100% - ${deductWidth}px)`;
			}

			return styles;
		},
		credentialSelected (credentialType: string) {
			const credential = this.credentials[credentialType];
			if (credential === this.newCredentialText) {
				// New credentials should be created
				this.addType = credentialType;
				this.editCredentials = null;
				this.nodesInit = [ (this.node as INodeUi).type ];
				this.credentialNewDialogVisible = true;

				this.credentials[credentialType] = undefined;
			}

			const node = this.node as INodeUi;

			const updateInformation: INodeUpdatePropertiesInformation = {
				name: node.name,
				properties: {
					credentials: JSON.parse(JSON.stringify(this.credentials)),
				},
			};

			this.$emit('credentialSelected', updateInformation);
		},
		displayCredentials (credentialTypeDescription: INodeCredentialDescription): boolean {
			if (credentialTypeDescription.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}
			return this.displayParameter(this.node.parameters, credentialTypeDescription, '');
		},
		getIssues (credentialTypeName: string): string[] {
			const node = this.node as INodeUi;

			if (node.issues === undefined || node.issues.credentials === undefined) {
				return [];
			}

			if (!node.issues.credentials.hasOwnProperty(credentialTypeName)) {
				return [];
			}

			return node.issues.credentials[credentialTypeName];
		},
		updateCredentials (credentialType: string): void {
			const name = this.credentials[credentialType];
			const credentialData = this.credentialOptions[credentialType].find((optionData: ICredentialsResponse) => optionData.name === name);
			if (credentialData === undefined) {
				this.$showMessage({
					title: 'Credentials not found',
					message: `The credentials named "${name}" of type "${credentialType}" could not be found!`,
					type: 'error',
				});
				return;
			}

			const editCredentials = {
				id: credentialData.id,
				name,
				type: credentialType,
			};

			this.editCredentials = editCredentials;
			this.addType = credentialType;
			this.credentialNewDialogVisible = true;
		},

		init () {
			const node = this.node as INodeUi;

			const newOption = {
				name: this.newCredentialText,
			};

			let options = [];

			// Get the available credentials for each type
			for (const credentialType of this.credentialTypesNode) {
				options = this.$store.getters.credentialsByType(credentialType);
				options.push(newOption as ICredentialsResponse);
				Vue.set(this.credentialOptions, credentialType, options);
			}

			// Set the current node credentials
			if (node.credentials) {
				Vue.set(this, 'credentials', JSON.parse(JSON.stringify(node.credentials)));
			} else {
				Vue.set(this, 'credentials', {});
			}
		},

	},
	mounted () {
		this.init();
	},
});
</script>

<style lang="scss">

.node-credentials {
	padding-bottom: 1em;
	margin: 0.5em;
	border-bottom: 1px solid #ccc;

	.credential-issues {
		display: none;
		width: 20px;
		text-align: right;
		float: right;
		color: #ff8080;
		font-size: 1.2em;
		margin-top: 3px;
	}

	.credential-data + .credential-data {
		margin-top: 1em;
	}

	.has-issues {
		.credential-issues {
			display: inline-block;
		}
	}

	.headline {
		font-weight: bold;
		margin-bottom: 0.7em;
	}

	.credential-parameter-wrapper {
		display: flex;
		align-items: center;
	}

	.parameter-name {
		font-weight: 400;
	}

	.parameter-value {
		display: flex;
		align-items: center;
	}

	.credential-action {
		display: flex;
		justify-content: center;
		align-items: center;
	}
}

</style>
