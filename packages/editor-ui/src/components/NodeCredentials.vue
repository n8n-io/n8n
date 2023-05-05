<template>
	<div
		v-if="credentialTypesNodeDescriptionDisplayed.length"
		:class="['node-credentials', $style.container]"
	>
		<div
			v-for="credentialTypeDescription in credentialTypesNodeDescriptionDisplayed"
			:key="credentialTypeDescription.name"
		>
			<n8n-input-label
				:label="getCredentialsFieldLabel(credentialTypeDescription)"
				:bold="false"
				:set="(issues = getIssues(credentialTypeDescription.name))"
				size="small"
				color="text-dark"
				data-test-id="credentials-label"
			>
				<div v-if="readonly || isReadOnly">
					<n8n-input
						:value="getSelectedName(credentialTypeDescription.name)"
						disabled
						size="small"
						data-test-id="node-credentials-select"
					/>
				</div>
				<div
					v-else
					:class="issues.length && !hideIssues ? $style.hasIssues : $style.input"
					data-test-id="node-credentials-select"
				>
					<n8n-select
						:value="getSelectedId(credentialTypeDescription.name)"
						@change="
							(value) =>
								onCredentialSelected(
									credentialTypeDescription.name,
									value,
									showMixedCredentials(credentialTypeDescription),
								)
						"
						@blur="$emit('blur', 'credentials')"
						:placeholder="getSelectPlaceholder(credentialTypeDescription.name, issues)"
						size="small"
					>
						<n8n-option
							v-for="item in getCredentialOptions(
								getAllRelatedCredentialTypes(credentialTypeDescription),
							)"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						>
							<div :class="[$style.credentialOption, 'mt-2xs', 'mb-2xs']">
								<n8n-text bold>{{ item.name }}</n8n-text>
								<n8n-text size="small">{{ item.typeDisplayName }}</n8n-text>
							</div>
						</n8n-option>
						<n8n-option
							:key="NEW_CREDENTIALS_TEXT"
							:value="NEW_CREDENTIALS_TEXT"
							:label="NEW_CREDENTIALS_TEXT"
						>
						</n8n-option>
					</n8n-select>

					<div :class="$style.warning" v-if="issues.length && !hideIssues">
						<n8n-tooltip placement="top">
							<template #content>
								<titled-list
									:title="`${$locale.baseText('nodeCredentials.issues')}:`"
									:items="issues"
								/>
							</template>
							<font-awesome-icon icon="exclamation-triangle" />
						</n8n-tooltip>
					</div>

					<div
						:class="$style.edit"
						v-if="
							selected[credentialTypeDescription.name] &&
							isCredentialExisting(credentialTypeDescription.name)
						"
						data-test-id="credential-edit-button"
					>
						<font-awesome-icon
							icon="pen"
							@click="editCredential(credentialTypeDescription.name)"
							class="clickable"
							:title="$locale.baseText('nodeCredentials.updateCredential')"
						/>
					</div>
				</div>
			</n8n-input-label>
		</div>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import type {
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUser,
} from '@/Interface';
import type {
	ICredentialType,
	INodeCredentialDescription,
	INodeCredentialsDetails,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import { genericHelpers } from '@/mixins/genericHelpers';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { showMessage } from '@/mixins/showMessage';

import TitledList from '@/components/TitledList.vue';

import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useCredentialsStore } from '@/stores/credentials';
import { useNDVStore } from '@/stores/ndv';
import { KEEP_AUTH_IN_NDV_FOR_NODES } from '@/constants';
import {
	getAuthTypeForNodeCredential,
	getMainAuthField,
	getNodeCredentialForSelectedAuthType,
	getAllNodeCredentialForAuthType,
	updateNodeAuthType,
	isRequiredCredential,
} from '@/utils';

interface CredentialDropdownOption extends ICredentialsResponse {
	typeDisplayName: string;
}

export default mixins(genericHelpers, nodeHelpers, showMessage).extend({
	name: 'NodeCredentials',
	props: {
		readonly: {
			type: Boolean,
			default: false,
		},
		node: {
			type: Object as PropType<INodeUi>,
			required: true,
		},
		overrideCredType: {
			type: String,
		},
		showAll: {
			type: Boolean,
			default: false,
		},
		hideIssues: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		TitledList,
	},
	data() {
		return {
			NEW_CREDENTIALS_TEXT: `- ${this.$locale.baseText('nodeCredentials.createNew')} -`,
			subscribedToCredentialType: '',
			listeningForAuthChange: false,
		};
	},
	mounted() {
		// Listen for credentials store changes so credential selection can be updated if creds are changed from the modal
		this.credentialsStore.$onAction(({ name, after, store, args }) => {
			const listeningForActions = ['createNewCredential', 'updateCredential', 'deleteCredential'];
			const credentialType = this.subscribedToCredentialType;
			if (!credentialType) {
				return;
			}

			after(async (result) => {
				if (!listeningForActions.includes(name)) {
					return;
				}
				const current = this.selected[credentialType];
				let credentialsOfType: ICredentialsResponse[] = [];
				if (this.showAll) {
					if (this.node) {
						credentialsOfType = [
							...(this.credentialsStore.allUsableCredentialsForNode(this.node) || []),
						];
					}
				} else {
					credentialsOfType = [
						...(this.credentialsStore.allUsableCredentialsByType[credentialType] || []),
					];
				}
				switch (name) {
					// new credential was added
					case 'createNewCredential':
						if (result) {
							this.onCredentialSelected(credentialType, (result as ICredentialsResponse).id);
						}
						break;
					case 'updateCredential':
						const updatedCredential = result as ICredentialsResponse;
						// credential name was changed, update it
						if (updatedCredential.name !== current.name) {
							this.onCredentialSelected(credentialType, current.id);
						}
						break;
					case 'deleteCredential':
						// all credentials were deleted
						if (credentialsOfType.length === 0) {
							this.clearSelectedCredential(credentialType);
						} else {
							const id = args[0].id;
							// credential was deleted, select last one added to replace with
							if (current.id === id) {
								this.onCredentialSelected(
									credentialType,
									credentialsOfType[credentialsOfType.length - 1].id,
								);
							}
						}
						break;
				}
			});
		});
	},
	watch: {
		'node.parameters': {
			immediate: true,
			deep: true,
			handler(newValue: INodeParameters, oldValue: INodeParameters) {
				// When active node parameters change, check if authentication type has been changed
				// and set `subscribedToCredentialType` to corresponding credential type
				const isActive = this.node.name === this.ndvStore.activeNode?.name;
				const nodeType = this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
				// Only do this for active node and if it's listening for auth change
				if (isActive && nodeType && this.listeningForAuthChange) {
					if (this.mainNodeAuthField && oldValue && newValue) {
						const newAuth = newValue[this.mainNodeAuthField.name];

						if (newAuth) {
							const credentialType = getNodeCredentialForSelectedAuthType(
								nodeType,
								newAuth.toString(),
							);
							if (credentialType) {
								this.subscribedToCredentialType = credentialType.name;
							}
						}
					}
				}
			},
		},
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNodeTypesStore,
			useNDVStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
		),
		currentUser(): IUser {
			return this.usersStore.currentUser || ({} as IUser);
		},
		credentialTypesNode(): string[] {
			return this.credentialTypesNodeDescription.map(
				(credentialTypeDescription) => credentialTypeDescription.name,
			);
		},
		credentialTypesNodeDescriptionDisplayed(): INodeCredentialDescription[] {
			return this.credentialTypesNodeDescription.filter((credentialTypeDescription) => {
				return this.displayCredentials(credentialTypeDescription);
			});
		},
		credentialTypesNodeDescription(): INodeCredentialDescription[] {
			const node = this.node as INodeUi;

			const credType = this.credentialsStore.getCredentialTypeByName(this.overrideCredType);

			if (credType) return [credType];

			const activeNodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (activeNodeType && activeNodeType.credentials) {
				return activeNodeType.credentials;
			}

			return [];
		},
		credentialTypeNames() {
			const returnData: {
				[key: string]: string;
			} = {};
			let credentialType: ICredentialType | null;
			for (const credentialTypeName of this.credentialTypesNode) {
				credentialType = this.credentialsStore.getCredentialTypeByName(credentialTypeName);
				returnData[credentialTypeName] =
					credentialType !== null ? credentialType.displayName : credentialTypeName;
			}
			return returnData;
		},
		selected(): { [type: string]: INodeCredentialsDetails } {
			return this.node.credentials || {};
		},
		nodeType(): INodeTypeDescription | null {
			return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
		},
		mainNodeAuthField(): INodeProperties | null {
			return getMainAuthField(this.nodeType);
		},
	},

	methods: {
		getAllRelatedCredentialTypes(credentialType: INodeCredentialDescription): string[] {
			const isRequiredCredential = this.showMixedCredentials(credentialType);
			if (isRequiredCredential) {
				if (this.mainNodeAuthField) {
					const credentials = getAllNodeCredentialForAuthType(
						this.nodeType,
						this.mainNodeAuthField.name,
					);
					return credentials.map((cred) => cred.name);
				}
			}
			return [credentialType.name];
		},
		getCredentialOptions(types: string[]): CredentialDropdownOption[] {
			let options: CredentialDropdownOption[] = [];
			types.forEach((type) => {
				options = options.concat(
					this.credentialsStore.allUsableCredentialsByType[type].map((option: any) => ({
						...option,
						typeDisplayName: this.credentialsStore.getCredentialTypeByName(type).displayName,
					})),
				);
			});
			return options;
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
				? this.$locale.baseText('nodeCredentials.selectedCredentialUnavailable', {
						interpolate: { name: this.getSelectedName(type) },
				  })
				: this.$locale.baseText('nodeCredentials.selectCredential');
		},
		credentialInputWrapperStyle(credentialType: string) {
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

		onCredentialSelected(
			credentialType: string,
			credentialId: string | null | undefined,
			requiredCredentials = false,
		) {
			if (credentialId === this.NEW_CREDENTIALS_TEXT) {
				// If new credential dialog is open, start listening for auth type change which should happen in the modal
				// this will be handled in this component's watcher which will set subscribed credential accordingly
				this.listeningForAuthChange = true;
				this.subscribedToCredentialType = credentialType;
			}
			if (!credentialId || credentialId === this.NEW_CREDENTIALS_TEXT) {
				this.uiStore.openNewCredential(credentialType, requiredCredentials);
				this.$telemetry.track('User opened Credential modal', {
					credential_type: credentialType,
					source: 'node',
					new_credential: true,
					workflow_id: this.workflowsStore.workflowId,
				});
				return;
			}

			this.$telemetry.track('User selected credential from node modal', {
				credential_type: credentialType,
				node_type: this.node.type,
				...(this.hasProxyAuth(this.node) ? { is_service_specific: true } : {}),
				workflow_id: this.workflowsStore.workflowId,
				credential_id: credentialId,
			});

			const selectedCredentials = this.credentialsStore.getCredentialById(credentialId);
			const selectedCredentialsType = this.showAll ? selectedCredentials.type : credentialType;
			const oldCredentials =
				this.node.credentials && this.node.credentials[selectedCredentialsType]
					? this.node.credentials[selectedCredentialsType]
					: {};

			const selected = { id: selectedCredentials.id, name: selectedCredentials.name };

			// if credentials has been string or neither id matched nor name matched uniquely
			if (
				oldCredentials.id === null ||
				(oldCredentials.id &&
					!this.credentialsStore.getCredentialByIdAndType(
						oldCredentials.id,
						selectedCredentialsType,
					))
			) {
				// update all nodes in the workflow with the same old/invalid credentials
				this.workflowsStore.replaceInvalidWorkflowCredentials({
					credentials: selected,
					invalid: oldCredentials,
					type: selectedCredentialsType,
				});
				this.updateNodesCredentialsIssues();
				this.$showMessage({
					title: this.$locale.baseText('nodeCredentials.showMessage.title'),
					message: this.$locale.baseText('nodeCredentials.showMessage.message', {
						interpolate: {
							oldCredentialName: oldCredentials.name,
							newCredentialName: selected.name,
						},
					}),
					type: 'success',
				});
			}

			// If credential is selected from mixed credential dropdown, update node's auth filed based on selected credential
			if (this.showAll && this.mainNodeAuthField) {
				const nodeCredentialDescription = this.nodeType?.credentials?.find(
					(cred) => cred.name === selectedCredentialsType,
				);
				const authOption = getAuthTypeForNodeCredential(this.nodeType, nodeCredentialDescription);
				if (authOption) {
					updateNodeAuthType(this.node, authOption.value);
					const parameterData = {
						name: `parameters.${this.mainNodeAuthField.name}`,
						value: authOption.value,
					};
					this.$emit('valueChanged', parameterData);
				}
			}

			const node: INodeUi = this.node;

			const credentials = {
				...(node.credentials || {}),
				[selectedCredentialsType]: selected,
			};

			const updateInformation: INodeUpdatePropertiesInformation = {
				name: this.node.name,
				properties: {
					credentials,
				},
			};

			this.$emit('credentialSelected', updateInformation);
		},

		displayCredentials(credentialTypeDescription: INodeCredentialDescription): boolean {
			if (credentialTypeDescription.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}
			return this.displayParameter(this.node.parameters, credentialTypeDescription, '', this.node);
		},

		getIssues(credentialTypeName: string): string[] {
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
			if (
				!this.node.credentials ||
				!this.node.credentials[credentialType] ||
				!this.node.credentials[credentialType].id
			) {
				return false;
			}
			const { id } = this.node.credentials[credentialType];
			const options = this.getCredentialOptions([credentialType]);

			return !!options.find((option: ICredentialsResponse) => option.id === id);
		},

		editCredential(credentialType: string): void {
			const { id } = this.node.credentials[credentialType];
			this.uiStore.openExistingCredential(id);

			this.$telemetry.track('User opened Credential modal', {
				credential_type: credentialType,
				source: 'node',
				new_credential: false,
				workflow_id: this.workflowsStore.workflowId,
			});
			this.subscribedToCredentialType = credentialType;
		},
		showMixedCredentials(credentialType: INodeCredentialDescription): boolean {
			const nodeType = this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			const isRequired = isRequiredCredential(nodeType, credentialType);

			return !KEEP_AUTH_IN_NDV_FOR_NODES.includes(this.node.type || '') && isRequired;
		},
		getCredentialsFieldLabel(credentialType: INodeCredentialDescription): string {
			const credentialTypeName = this.credentialTypeNames[credentialType.name];

			if (!this.showMixedCredentials(credentialType)) {
				return this.$locale.baseText('nodeCredentials.credentialFor', {
					interpolate: {
						credentialType: credentialTypeName,
					},
				});
			}
			return this.$locale.baseText('nodeCredentials.credentialsLabel');
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

.credentialOption {
	display: flex;
	flex-direction: column;
}
</style>
