<template>
	<div v-if="credentialTypesNodeDescriptionDisplayed.length" class="node-credentials">
		<div class="headline">
			Credentials
		</div>

		<div v-for="credentialTypeDescription in credentialTypesNodeDescriptionDisplayed" :key="credentialTypeDescription.name" class="credential-data">
			<el-row class="credential-parameter-wrapper">
				<el-col :span="10" class="parameter-name">
					{{credentialTypeNames[credentialTypeDescription.name]}}:
				</el-col>
				<el-col :span="12" class="parameter-value" :class="getIssues(credentialTypeDescription.name).length?'has-issues':''">

					<div :style="credentialInputWrapperStyle(credentialTypeDescription.name)">
						<n8n-select :value="credentials[credentialTypeDescription.name]" :disabled="isReadOnly" @change="(value) => credentialSelected(credentialTypeDescription.name, value)" placeholder="Select Credential" size="small">
							<n8n-option
								v-for="(item) in credentialOptions[credentialTypeDescription.name]"
								:key="item.id"
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
					<font-awesome-icon v-if="credentials[credentialTypeDescription.name]" icon="pen" @click="editCredential" class="update-credentials clickable" title="Update Credentials" />
				</el-col>

			</el-row>
		</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { restApi } from '@/components/mixins/restApi';
import {
	// ICredentialsCreatedEvent,
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
} from '@/Interface';
import {
	ICredentialType,
	INodeCredentialDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

const NEW_CREDENTIALS_TEXT = '- Create New -';

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
				credentialType = this.$store.getters['credentials/getCredentialTypeByName'](credentialTypeName);
				returnData[credentialTypeName] = credentialType !== null ? credentialType.displayName : credentialTypeName;
			}
			return returnData;
		},
	},
	data () {
		return {
			addType: undefined as string | undefined,
			credentialOptions: {} as { [key: string]: ICredentialsResponse[]; },
			credentials: {} as {
				[key: string]: string | undefined
			},
		};
	},
	watch: {
		node () {
			this.init();
		},
	},
	methods: {
		// async credentialsCreated (eventData: ICredentialsCreatedEvent) {
		// 	await this.credentialsUpdated(eventData);
		// },
		// credentialsUpdated (eventData: ICredentialsCreatedEvent) {
		// 	if (!this.credentialTypesNode.includes(eventData.data.type)) {
		// 		return;
		// 	}

		// 	this.init();
		// 	Vue.set(this.credentials, eventData.data.type, eventData.data.name);

		// 	// Makes sure that it does also get set correctly on the node not just the UI
		// 	this.credentialSelected(eventData.data.type);
		// },
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
		credentialSelected (credentialType: string, credentialName: string) {
			if (credentialName=== NEW_CREDENTIALS_TEXT) {
				this.$store.dispatch('ui/openNewCredentialDetails', { type: credentialType });

				this.credentials[credentialType] = undefined;
			}
			else {
				this.credentials[credentialType] = credentialName;
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
		editCredential(): void {

		},
		// updateCredentials (credentialType: string): void {
		// 	const name = this.credentials[credentialType];
		// 	const credentialData = this.credentialOptions[credentialType].find((optionData: ICredentialsResponse) => optionData.name === name);
		// 	if (credentialData === undefined) {
		// 		this.$showMessage({
		// 			title: 'Credentials not found',
		// 			message: `The credentials named "${name}" of type "${credentialType}" could not be found!`,
		// 			type: 'error',
		// 		});
		// 		return;
		// 	}

		// 	this.addType = credentialType;
		// },

		init () {
			const node = this.node as INodeUi;

			const newOption = {
				name: NEW_CREDENTIALS_TEXT,
			};

			let options = [];

			// Get the available credentials for each type
			for (const credentialType of this.credentialTypesNode) {
				options = this.$store.getters['credentials/getCredentialsByType'](credentialType);
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
