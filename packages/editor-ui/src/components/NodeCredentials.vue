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

				<el-col v-if="!isReadOnly" :span="12" class="parameter-value" :class="getIssues(credentialTypeDescription.name).length?'has-issues':''">
					<div :style="credentialInputWrapperStyle(credentialTypeDescription.name)">
						<n8n-select :value="getSelectedId(credentialTypeDescription.name)" @change="(value) => onCredentialSelected(credentialTypeDescription.name, value)" placeholder="Select Credential" size="small">
							<n8n-option
								v-for="(item) in credentialOptions[credentialTypeDescription.name]"
								:key="item.id"
								:label="item.name"
								:value="item.id">
							</n8n-option>
							<n8n-option
								:key="NEW_CREDENTIALS_TEXT"
								:value="NEW_CREDENTIALS_TEXT"
								:label="NEW_CREDENTIALS_TEXT"
							>
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
				<el-col v-if="!isReadOnly" :span="2" class="parameter-value credential-action">
					<font-awesome-icon v-if="isCredentialExisting(credentialTypeDescription.name)" icon="pen" @click="editCredential(credentialTypeDescription.name)" class="update-credentials clickable" title="Update Credentials" />
				</el-col>

				<el-col v-if="isReadOnly" :span="14" class="readonly-container" >
					<n8n-input disabled :value="selected && selected[credentialTypeDescription.name] && selected[credentialTypeDescription.name].name" size="small" />
				</el-col>

			</el-row>
		</div>

	</div>
</template>

<script lang="ts">
import { restApi } from '@/components/mixins/restApi';
import {
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
} from '@/Interface';
import {
	ICredentialType,
	INodeCredentialDescription,
	INodeCredentialsDetails,
	INodeTypeDescription,
} from 'n8n-workflow';

import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import { mapGetters } from "vuex";

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
	data () {
		return {
			NEW_CREDENTIALS_TEXT,
			newCredentialUnsubscribe: null as null | (() => void),
		};
	},
	computed: {
		...mapGetters('credentials', {
			credentialOptions: 'allCredentialsByType',
		}),
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
		selected(): {[type: string]: INodeCredentialsDetails} {
			return this.node.credentials || {};
		},
	},
	methods: {
		getSelectedId(type: string) {
			if (this.isCredentialExisting(type)) {
				return this.selected[type].id;
			}
			return undefined;
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

		listenForNewCredentials(credentialType: string) {
			this.stopListeningForNewCredentials();

			this.newCredentialUnsubscribe = this.$store.subscribe((mutation, state) => {
				if (mutation.type === 'credentials/upsertCredential' || mutation.type === 'credentials/enableOAuthCredential'){
					this.onCredentialSelected(credentialType, mutation.payload.id);
				}
				if (mutation.type === 'credentials/deleteCredential') {
					this.clearSelectedCredential(credentialType);
					this.stopListeningForNewCredentials();
				}
			});
		},

		stopListeningForNewCredentials() {
			if (this.newCredentialUnsubscribe) {
				this.newCredentialUnsubscribe();
			}
		},

		clearSelectedCredential(credentialType: string) {
			const node: INodeUi = this.node;

			const credentials = {
				...(node.credentials || {}),
			};

			delete credentials[credentialType];

			const updateInformation: INodeUpdatePropertiesInformation = {
				name: this.node.name,
				properties: {
					credentials,
				},
			};

			this.$emit('credentialSelected', updateInformation);
		},

		onCredentialSelected (credentialType: string, credentialId: string | null | undefined) {
			if (credentialId === NEW_CREDENTIALS_TEXT) {
				this.listenForNewCredentials(credentialType);
				this.$store.dispatch('ui/openNewCredential', { type: credentialType });
				this.$telemetry.track('User opened Credential modal', { credential_type: credentialType, source: 'node', new_credential: true, workflow_id: this.$store.getters.workflowId });
				return;
			}

			this.$telemetry.track('User selected credential from node modal', { credential_type: credentialType, workflow_id: this.$store.getters.workflowId });

			const selectedCredentials = this.$store.getters['credentials/getCredentialById'](credentialId);
			const oldCredentials = this.node.credentials && this.node.credentials[credentialType] ? this.node.credentials[credentialType] : {};

			const selected = { id: selectedCredentials.id, name: selectedCredentials.name };

			// if credentials has been string or neither id matched nor name matched uniquely
			if (oldCredentials.id === null || (oldCredentials.id && !this.$store.getters['credentials/getCredentialByIdAndType'](oldCredentials.id, credentialType))) {
				// update all nodes in the workflow with the same old/invalid credentials
				this.$store.commit('replaceInvalidWorkflowCredentials', {
					credentials: selected,
					invalid: oldCredentials,
					type: credentialType,
				});
				this.updateNodesCredentialsIssues();
				this.$showMessage({
					title: 'Node credentials updated',
					message: `Nodes that used credentials "${oldCredentials.name}" have been updated to use "${selected.name}"`,
					type: 'success',
				});
			}

			const node: INodeUi = this.node;

			const credentials = {
				...(node.credentials || {}),
				[credentialType]: selected,
			};

			const updateInformation: INodeUpdatePropertiesInformation = {
				name: this.node.name,
				properties: {
					credentials,
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

		isCredentialExisting(credentialType: string): boolean {
			if (!this.node.credentials || !this.node.credentials[credentialType] || !this.node.credentials[credentialType].id) {
				return false;
			}
			const { id } = this.node.credentials[credentialType];
			const options = this.credentialOptions[credentialType];

			return !!options.find((option: ICredentialsResponse) => option.id === id);
		},

		editCredential(credentialType: string): void {
			const { id } = this.node.credentials[credentialType];
			this.$store.dispatch('ui/openExisitngCredential', { id });

			this.$telemetry.track('User opened Credential modal', { credential_type: credentialType, source: 'node', new_credential: false, workflow_id: this.$store.getters.workflowId });

			this.listenForNewCredentials(credentialType);
		},
	},
	beforeDestroy () {
		this.stopListeningForNewCredentials();
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
		color: var(--color-text-base);
	}

	.readonly-container {
		padding-right: 0.5em;
	}
}

</style>
