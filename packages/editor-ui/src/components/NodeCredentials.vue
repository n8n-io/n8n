<template>
	<div v-if="credentialTypesNodeDescriptionDisplayed.length" :class="['node-credentials', $style.container]">
		<div v-for="credentialTypeDescription in credentialTypesNodeDescriptionDisplayed" :key="credentialTypeDescription.name">
			<n8n-input-label
				:label="$locale.baseText(
					'nodeCredentials.credentialFor',
					{
						interpolate: {
							credentialType: credentialTypeNames[credentialTypeDescription.name]
						}
					}
				)"
				:bold="false"
				:set="issues = getIssues(credentialTypeDescription.name)"
				size="small"
				color="text-dark"
			>
				<div v-if="readonly || isReadOnly">
					<n8n-input
						:value="getSelectedName(credentialTypeDescription.name)"
						disabled
						size="small"
					/>
				</div>
				<div
					v-else
					:class="issues.length ? $style.hasIssues : $style.input"
				>
					<n8n-select
						:value="getSelectedId(credentialTypeDescription.name)"
						@change="(value) => onCredentialSelected(credentialTypeDescription.name, value)"
						:placeholder="getSelectPlaceholder(credentialTypeDescription.name, issues)"
						size="small"
					>
						<n8n-option
							v-for="(item) in getCredentialOptions(credentialTypeDescription.name)"
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

					<div :class="$style.warning" v-if="issues.length">
						<n8n-tooltip placement="top" >
							<template #content>
								<titled-list :title="`${$locale.baseText('nodeCredentials.issues')}:`" :items="issues" />
							</template>
							<font-awesome-icon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>

					<div :class="$style.edit" v-if="selected[credentialTypeDescription.name] && isCredentialExisting(credentialTypeDescription.name)">
						<font-awesome-icon icon="pen" @click="editCredential(credentialTypeDescription.name)" class="clickable" :title="$locale.baseText('nodeCredentials.updateCredential')" />
					</div>
				</div>
			</n8n-input-label>
		</div>
	</div>
</template>

<script lang="ts">
import { restApi } from '@/mixins/restApi';
import {
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUser,
} from '@/Interface';
import {
	ICredentialType,
	INodeCredentialDescription,
	INodeCredentialsDetails,
} from 'n8n-workflow';

import { genericHelpers } from '@/mixins/genericHelpers';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { showMessage } from '@/mixins/showMessage';

import TitledList from '@/components/TitledList.vue';

import mixins from 'vue-typed-mixins';
import {getCredentialPermissions} from "@/permissions";
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useCredentialsStore } from '@/stores/credentials';

export default mixins(
	genericHelpers,
	nodeHelpers,
	restApi,
	showMessage,
).extend({
	name: 'NodeCredentials',
	props: [
		'readonly',
		'node', // INodeUi
		'overrideCredType', // cred type
	],
	components: {
		TitledList,
	},
	data () {
		return {
			NEW_CREDENTIALS_TEXT: `- ${this.$locale.baseText('nodeCredentials.createNew')} -`,
			subscribedToCredentialType: '',
		};
	},
	mounted() {
		this.listenForNewCredentials();
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNodeTypesStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
		),
		allCredentialsByType(): {[type: string]: ICredentialsResponse[]} {
			return this.credentialsStore.allCredentialsByType;
		},
		currentUser (): IUser {
			return this.usersStore.currentUser || {} as IUser;
		},
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

			const credType = this.credentialsStore.getCredentialTypeByName(this.overrideCredType);

			if (credType) return [credType];

			const activeNodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
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
				credentialType = this.credentialsStore.getCredentialTypeByName(credentialTypeName);
				returnData[credentialTypeName] = credentialType !== null ? credentialType.displayName : credentialTypeName;
			}
			return returnData;
		},
		selected(): {[type: string]: INodeCredentialsDetails} {
			return this.node.credentials || {};
		},
	},

	methods: {
		getCredentialOptions(type: string): ICredentialsResponse[] {
			return (this.allCredentialsByType as Record<string, ICredentialsResponse[]>)[type].filter((credential) => {
				const permissions = getCredentialPermissions(this.currentUser, credential);

				return permissions.use;
			});
		},
		getSelectedId(type: string) {
			if (this.isCredentialExisting(type)) {
				return this.selected[type].id;
			}
			return undefined;
		},
		getSelectedName(type: string) {
			return this.selected?.[type]?.name;
		},
		getSelectPlaceholder(type: string, issues: string[]) {
			return issues.length && this.getSelectedName(type)
				? this.$locale.baseText('nodeCredentials.selectedCredentialUnavailable', { interpolate: { name: this.getSelectedName(type) } })
				: this.$locale.baseText('nodeCredentials.selectCredential');
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
		// TODO: Investigate if this can be solved using only the store data (storing selected flag in credentials objects, ...)
		listenForNewCredentials() {
			// Listen for credentials store changes so credential selection can be updated if creds are changed from the modal
			this.credentialsStore.$subscribe((mutation, state) => {
				// This data pro stores credential type that the component is currently interested in
				const credentialType = this.subscribedToCredentialType;
				let credentialsOfType = this.credentialsStore.allCredentialsByType[credentialType];

				if (credentialsOfType) {
					credentialsOfType = credentialsOfType.sort((a, b) => (a.id < b.id ? -1 : 1));
					if (credentialsOfType.length > 0) {
						// If nothing has been selected previously, select the first one (newly added)
						if (!this.selected[credentialType]) {
							this.onCredentialSelected(credentialType, credentialsOfType[0].id);
						} else {
							// Else, check id currently selected cred has been updated
							const newSelected = credentialsOfType.find(cred => cred.id === this.selected[credentialType].id);
							// If it has changed, select it
							if (newSelected && newSelected.name !== this.selected[credentialType].name) {
								this.onCredentialSelected(credentialType, newSelected.id);
							} else { // Else select the last cred with that type since selected has been deleted or a new one has been added
								this.onCredentialSelected(credentialType, credentialsOfType[credentialsOfType.length - 1].id);
							}
						}
					}
				}
				this.subscribedToCredentialType = '';
			});
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
			if (credentialId === this.NEW_CREDENTIALS_TEXT) {
				// this.listenForNewCredentials(credentialType);
				this.subscribedToCredentialType = credentialType;
			}
			if (!credentialId || credentialId === this.NEW_CREDENTIALS_TEXT) {
				this.uiStore.openNewCredential(credentialType);
				this.$telemetry.track('User opened Credential modal', { credential_type: credentialType, source: 'node', new_credential: true, workflow_id: this.workflowsStore.workflowId });
				return;
			}

			this.$telemetry.track(
				'User selected credential from node modal',
				{
					credential_type: credentialType,
					node_type: this.node.type,
					...(this.hasProxyAuth(this.node) ? { is_service_specific: true } : {}),
					workflow_id: this.workflowsStore.workflowId,
					credential_id: credentialId,
				},
			);

			const selectedCredentials = this.credentialsStore.getCredentialById(credentialId);
			const oldCredentials = this.node.credentials && this.node.credentials[credentialType] ? this.node.credentials[credentialType] : {};

			const selected = { id: selectedCredentials.id, name: selectedCredentials.name };

			// if credentials has been string or neither id matched nor name matched uniquely
			if (oldCredentials.id === null || (oldCredentials.id && !this.credentialsStore.getCredentialByIdAndType(oldCredentials.id, credentialType))) {
				// update all nodes in the workflow with the same old/invalid credentials
				this.workflowsStore.replaceInvalidWorkflowCredentials({
					credentials: selected,
					invalid: oldCredentials,
					type: credentialType,
				});
				this.updateNodesCredentialsIssues();
				this.$showMessage({
					title: this.$locale.baseText('nodeCredentials.showMessage.title'),
					message: this.$locale.baseText(
						'nodeCredentials.showMessage.message',
						{
							interpolate: {
								oldCredentialName: oldCredentials.name,
								newCredentialName: selected.name,
							},
						},
					),
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
			return this.displayParameter(this.node.parameters, credentialTypeDescription, '', this.node);
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
			const options = this.getCredentialOptions(credentialType);

			return !!options.find((option: ICredentialsResponse) => option.id === id);
		},

		editCredential(credentialType: string): void {
			const { id } = this.node.credentials[credentialType];
			this.uiStore.openExistingCredential(id);

			this.$telemetry.track('User opened Credential modal', { credential_type: credentialType, source: 'node', new_credential: false, workflow_id: this.workflowsStore.workflowId });
			this.subscribedToCredentialType = credentialType;
		},
	},
});
</script>

<style lang="scss" module>
.container {
	margin-top: var(--spacing-xs);

	& > div:not(:first-child) {
		margin-top: var(--spacing-xs);
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

.hasIssues {
	composes: input;
	--input-border-color: var(--color-danger);
}
</style>
