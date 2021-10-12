<template>
	<div v-if="credentialTypesNodeDescriptionDisplayed.length" :class="$style.container">
		<div>
			<n8n-text size="small" :bold="true">
				Credentials
			</n8n-text>
		</div>

		<div v-for="credentialTypeDescription in credentialTypesNodeDescriptionDisplayed" :key="credentialTypeDescription.name">
			<n8n-input-label
				:label="credentialTypeNames[credentialTypeDescription.name]"
				:bold="false"
				size="small"
			>
				<div :class="$style.input">
					<n8n-select :value="selected[credentialTypeDescription.name]" :disabled="isReadOnly" @change="(value) => credentialSelected(credentialTypeDescription.name, value)" placeholder="Select Credential" size="small">
						<n8n-option
							v-for="(item) in credentialOptions[credentialTypeDescription.name]"
							:key="item.id"
							:label="item.name"
							:value="item.name">
						</n8n-option>
						<n8n-option
							:key="NEW_CREDENTIALS_TEXT"
							:value="NEW_CREDENTIALS_TEXT"
							:label="NEW_CREDENTIALS_TEXT"
						>
						</n8n-option>
					</n8n-select>

					<div :class="$style.warning" v-if="getIssues(credentialTypeDescription.name).length">
						<n8n-tooltip placement="top" >
							<div slot="content" v-html="'Issues:<br />&nbsp;&nbsp;- ' + getIssues(credentialTypeDescription.name).join('<br />&nbsp;&nbsp;- ')"></div>
							<font-awesome-icon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>

					<div :class="$style.edit" v-if="selected[credentialTypeDescription.name] && isCredentialValid(credentialTypeDescription.name)">
						<font-awesome-icon icon="pen" @click="editCredential(credentialTypeDescription.name)" class="update-credentials clickable" title="Update Credentials" />
					</div>
				</div>
			</n8n-input-label>
		</div>

	</div>
</template>

<script lang="ts">
import { restApi } from '@/components/mixins/restApi';
import {
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
		selected(): {[type: string]: string} {
			return this.node.credentials || {};
		},
	},
	methods: {
		listenForNewCredentials(credentialType: string) {
			this.stopListeningForNewCredentials();

			this.newCredentialUnsubscribe = this.$store.subscribe((mutation, state) => {
				if (mutation.type === 'credentials/upsertCredential' || mutation.type === 'credentials/enableOAuthCredential'){
					this.credentialSelected(credentialType, mutation.payload.name);
				}
				if (mutation.type === 'credentials/deleteCredential') {
					this.credentialSelected(credentialType, mutation.payload.name);
					this.stopListeningForNewCredentials();
				}
			});
		},

		stopListeningForNewCredentials() {
			if (this.newCredentialUnsubscribe) {
				this.newCredentialUnsubscribe();
			}
		},

		credentialSelected (credentialType: string, credentialName: string) {
			let selected = undefined;
			if (credentialName === NEW_CREDENTIALS_TEXT) {
				this.listenForNewCredentials(credentialType);
				this.$store.dispatch('ui/openNewCredential', { type: credentialType });
				this.$telemetry.track('User opened Credential modal', { credential_type: credentialType, source: 'node', new_credential: true, workflow_id: this.$store.getters.workflowId });
			}
			else {
				selected = credentialName;
				this.$telemetry.track('User selected credential from node modal', { credential_type: credentialType, workflow_id: this.$store.getters.workflowId });
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

		isCredentialValid(credentialType: string): boolean {
			const name = this.node.credentials[credentialType];
			const options = this.credentialOptions[credentialType];

			return options.find((option: ICredentialType) => option.name === name);
		},

		editCredential(credentialType: string): void {
			const name = this.node.credentials[credentialType];
			const options = this.credentialOptions[credentialType];
			const selected = options.find((option: ICredentialType) => option.name === name);
			this.$store.dispatch('ui/openExisitngCredential', { id: selected.id });
			this.$telemetry.track('User opened Credential modal', { credential_type: credentialType, source: 'node', new_credential: false, workflow_id: this.$store.getters.workflowId });

			this.listenForNewCredentials(credentialType);
		},
	},
	beforeDestroy () {
		this.stopListeningForNewCredentials();
	},
});
</script>

<style lang="scss" module>
.container {
	border-bottom: var(--border-base);
	margin: var(--spacing-xs) 0;

	> * {
		margin-bottom: var(--spacing-xs);
	}
}

.warning {
	min-width: 20px;
	margin-left: 5px;
	color: #ff8080;
	font-size: var(--font-size-s);
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color-text-base);
	min-width: 20px;
	margin-left: 5px;
	font-size: var(--font-size-s);
}

.input {
	display: flex;
	align-items: center;
}
</style>
