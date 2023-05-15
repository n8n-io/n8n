<template>
	<Modal
		:name="modalName"
		:customClass="$style.credentialModal"
		:eventBus="modalBus"
		:loading="loading"
		:beforeClose="beforeClose"
		width="70%"
		height="80%"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.credIcon">
						<CredentialIcon :credentialTypeName="defaultCredentialTypeName" />
					</div>
					<InlineNameEdit
						:name="credentialName"
						:subtitle="credentialType ? credentialType.displayName : ''"
						:readonly="!credentialPermissions.updateName || !credentialType"
						type="Credential"
						@input="onNameEdit"
						data-test-id="credential-name"
					/>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button
						v-if="currentCredential && credentialPermissions.delete"
						:title="$locale.baseText('credentialEdit.credentialEdit.delete')"
						icon="trash"
						size="medium"
						type="tertiary"
						:disabled="isSaving"
						:loading="isDeleting"
						@click="deleteCredential"
						data-test-id="credential-delete-button"
					/>
					<SaveButton
						v-if="(hasUnsavedChanges || credentialId) && credentialPermissions.save"
						:saved="!hasUnsavedChanges && !isTesting"
						:isSaving="isSaving || isTesting"
						:savingLabel="
							isTesting
								? $locale.baseText('credentialEdit.credentialEdit.testing')
								: $locale.baseText('credentialEdit.credentialEdit.saving')
						"
						@click="saveCredential"
						data-test-id="credential-save-button"
					/>
				</div>
			</div>
			<hr />
		</template>
		<template #content>
			<div :class="$style.container" data-test-id="credential-edit-dialog">
				<div :class="$style.sidebar">
					<n8n-menu mode="tabs" :items="sidebarItems" @select="onTabSelect"></n8n-menu>
				</div>
				<div v-if="activeTab === 'connection'" :class="$style.mainContent" ref="content">
					<CredentialConfig
						:credentialType="credentialType"
						:credentialProperties="credentialProperties"
						:credentialData="credentialData"
						:credentialId="credentialId"
						:showValidationWarning="showValidationWarning"
						:authError="authError"
						:testedSuccessfully="testedSuccessfully"
						:isOAuthType="isOAuthType"
						:isOAuthConnected="isOAuthConnected"
						:isRetesting="isRetesting"
						:parentTypes="parentTypes"
						:requiredPropertiesFilled="requiredPropertiesFilled"
						:credentialPermissions="credentialPermissions"
						:mode="mode"
						:selectedCredential="selectedCredential"
						:showAuthTypeSelector="requiredCredentials"
						@change="onDataChange"
						@oauth="oAuthCredentialAuthorize"
						@retest="retestCredential"
						@scrollToTop="scrollToTop"
						@authTypeChanged="onAuthTypeChanged"
					/>
				</div>
				<div v-else-if="activeTab === 'sharing' && credentialType" :class="$style.mainContent">
					<CredentialSharing
						:credential="currentCredential"
						:credentialData="credentialData"
						:credentialId="credentialId"
						:credentialPermissions="credentialPermissions"
						:modalBus="modalBus"
						@change="onChangeSharedWith"
					/>
				</div>
				<div v-else-if="activeTab === 'details' && credentialType" :class="$style.mainContent">
					<CredentialInfo
						:nodeAccess="nodeAccess"
						:nodesWithAccess="nodesWithAccess"
						:currentCredential="currentCredential"
						:credentialPermissions="credentialPermissions"
						@accessChange="onNodeAccessChange"
					/>
				</div>
				<div v-else-if="activeTab.startsWith('coming-soon')" :class="$style.mainContent">
					<FeatureComingSoon :featureId="activeTab.split('/')[1]"></FeatureComingSoon>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import type { ICredentialsResponse, IUser } from '@/Interface';

import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	ICredentialsDecrypted,
	ICredentialType,
	INode,
	INodeCredentialDescription,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import CredentialIcon from '../CredentialIcon.vue';

import mixins from 'vue-typed-mixins';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { showMessage } from '@/mixins/showMessage';

import CredentialConfig from './CredentialConfig.vue';
import CredentialInfo from './CredentialInfo.vue';
import CredentialSharing from './CredentialSharing.ee.vue';
import SaveButton from '../SaveButton.vue';
import Modal from '../Modal.vue';
import InlineNameEdit from '../InlineNameEdit.vue';
import { CREDENTIAL_EDIT_MODAL_KEY, EnterpriseEditionFeature } from '@/constants';
import type { IDataObject } from 'n8n-workflow';
import FeatureComingSoon from '../FeatureComingSoon.vue';
import type { IPermissions } from '@/permissions';
import { getCredentialPermissions } from '@/permissions';
import type { IMenuItem } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import {
	isValidCredentialResponse,
	getNodeAuthOptions,
	getNodeCredentialForSelectedAuthType,
	updateNodeAuthType,
	isCredentialModalState,
} from '@/utils';

interface NodeAccessMap {
	[nodeType: string]: ICredentialNodeAccess | null;
}

export default mixins(showMessage, nodeHelpers).extend({
	name: 'CredentialEdit',
	components: {
		CredentialSharing,
		CredentialConfig,
		CredentialIcon,
		CredentialInfo,
		InlineNameEdit,
		Modal,
		SaveButton,
		FeatureComingSoon,
	},
	props: {
		modalName: {
			type: String,
			required: true,
		},
		activeId: {
			type: [String, Number],
			required: false,
		},
		mode: {
			type: String,
		},
	},
	data() {
		return {
			activeTab: 'connection',
			authError: '',
			credentialId: '',
			credentialName: '',
			credentialData: {} as ICredentialDataDecryptedObject,
			modalBus: createEventBus(),
			nodeAccess: {} as NodeAccessMap,
			isDeleting: false,
			isSaving: false,
			isTesting: false,
			hasUnsavedChanges: false,
			loading: true,
			showValidationWarning: false,
			testedSuccessfully: false,
			isRetesting: false,
			EnterpriseEditionFeature,
			selectedCredential: '',
			requiredCredentials: false, // Are credentials required or optional for the node
			hasUserSpecifiedName: false,
		};
	},
	async mounted() {
		this.requiredCredentials =
			isCredentialModalState(this.uiStore.modals[CREDENTIAL_EDIT_MODAL_KEY]) &&
			this.uiStore.modals[CREDENTIAL_EDIT_MODAL_KEY].showAuthSelector === true;

		this.setupNodeAccess();

		if (this.mode === 'new' && this.credentialTypeName) {
			this.credentialName = await this.credentialsStore.getNewCredentialName({
				credentialTypeName: this.defaultCredentialTypeName,
			});

			if (this.currentUser) {
				Vue.set(this.credentialData, 'ownedBy', {
					id: this.currentUser.id,
					firstName: this.currentUser.firstName,
					lastName: this.currentUser.lastName,
					email: this.currentUser.email,
				});
			}
		} else {
			await this.loadCurrentCredential();
		}

		if (this.credentialType) {
			for (const property of this.credentialType.properties) {
				if (
					!this.credentialData.hasOwnProperty(property.name) &&
					!this.credentialType.__overwrittenProperties?.includes(property.name)
				) {
					Vue.set(this.credentialData, property.name, property.default as CredentialInformation);
				}
			}
		}

		await this.$externalHooks().run('credentialsEdit.credentialModalOpened', {
			credentialType: this.credentialTypeName,
			isEditingCredential: this.mode === 'edit',
			activeNode: this.ndvStore.activeNode,
		});

		setTimeout(async () => {
			if (this.credentialId) {
				if (!this.requiredPropertiesFilled && this.credentialPermissions.isOwner === true) {
					// sharees can't see properties, so this check would always fail for them
					// if the credential contains required fields.
					this.showValidationWarning = true;
				} else {
					await this.retestCredential();
				}
			}
		}, 0);

		this.loading = false;
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNDVStore,
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
		),
		activeNodeType(): INodeTypeDescription | null {
			const activeNode = this.ndvStore.activeNode;

			if (activeNode) {
				return this.nodeTypesStore.getNodeType(activeNode.type, activeNode.typeVersion);
			}
			return null;
		},
		selectedCredentialType(): INodeCredentialDescription | null {
			if (this.mode !== 'new') {
				return null;
			}

			// If there is already selected type, use it
			if (this.selectedCredential !== '') {
				return this.credentialsStore.getCredentialTypeByName(this.selectedCredential);
			} else if (this.requiredCredentials) {
				// Otherwise, use credential type that corresponds to the first auth option in the node definition
				const nodeAuthOptions = getNodeAuthOptions(this.activeNodeType);
				// But only if there is zero or one auth options available
				if (nodeAuthOptions.length > 0 && this.activeNodeType?.credentials) {
					return getNodeCredentialForSelectedAuthType(
						this.activeNodeType,
						nodeAuthOptions[0].value,
					);
				} else {
					return this.activeNodeType?.credentials ? this.activeNodeType.credentials[0] : null;
				}
			}

			return null;
		},
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		currentCredential(): ICredentialsResponse | null {
			if (!this.credentialId) {
				return null;
			}

			return this.credentialsStore.getCredentialById(this.credentialId);
		},
		credentialTypeName(): string | null {
			if (this.mode === 'edit') {
				if (this.currentCredential) {
					return this.currentCredential.type;
				}

				return null;
			}
			if (this.selectedCredentialType) {
				return this.selectedCredentialType.name;
			}
			return `${this.activeId}`;
		},
		credentialType(): ICredentialType | null {
			if (!this.credentialTypeName) {
				return null;
			}

			const type = this.credentialsStore.getCredentialTypeByName(this.credentialTypeName);

			if (!type) {
				return null;
			}

			return {
				...type,
				properties: this.getCredentialProperties(this.credentialTypeName),
			};
		},
		isCredentialTestable(): boolean {
			// Sharees can always test since they can't see the data.
			if (this.credentialPermissions.isOwner === false) {
				return true;
			}
			if (this.isOAuthType || !this.requiredPropertiesFilled) {
				return false;
			}

			const { ownedBy, sharedWith, ...credentialData } = this.credentialData;
			const hasExpressions = Object.values(credentialData).reduce(
				(accu: boolean, value: CredentialInformation) =>
					accu || (typeof value === 'string' && value.startsWith('=')),
				false,
			);
			if (hasExpressions) {
				return false;
			}

			const nodesThatCanTest = this.nodesWithAccess.filter((node) => {
				if (node.credentials) {
					// Returns a list of nodes that can test this credentials
					const eligibleTesters = node.credentials.filter((credential) => {
						return credential.name === this.credentialTypeName && credential.testedBy;
					});
					// If we have any node that can test, return true.
					return !!eligibleTesters.length;
				}
				return false;
			});

			return !!nodesThatCanTest.length || (!!this.credentialType && !!this.credentialType.test);
		},
		nodesWithAccess(): INodeTypeDescription[] {
			if (this.credentialTypeName) {
				return this.credentialsStore.getNodesWithAccess(this.credentialTypeName);
			}

			return [];
		},
		parentTypes(): string[] {
			if (this.credentialTypeName) {
				return this.getParentTypes(this.credentialTypeName);
			}

			return [];
		},
		isOAuthType(): boolean {
			return (
				!!this.credentialTypeName &&
				(((this.credentialTypeName === 'oAuth2Api' || this.parentTypes.includes('oAuth2Api')) &&
					this.credentialData.grantType === 'authorizationCode') ||
					this.credentialTypeName === 'oAuth1Api' ||
					this.parentTypes.includes('oAuth1Api'))
			);
		},
		isOAuthConnected(): boolean {
			return this.isOAuthType && !!this.credentialData.oauthTokenData;
		},
		credentialProperties(): INodeProperties[] {
			if (!this.credentialType) {
				return [];
			}

			return this.credentialType.properties.filter((propertyData: INodeProperties) => {
				if (!this.displayCredentialParameter(propertyData)) {
					return false;
				}
				return (
					!this.credentialType!.__overwrittenProperties ||
					!this.credentialType!.__overwrittenProperties.includes(propertyData.name)
				);
			});
		},
		requiredPropertiesFilled(): boolean {
			for (const property of this.credentialProperties) {
				if (property.required !== true) {
					continue;
				}

				if (property.type === 'string' && !this.credentialData[property.name]) {
					return false;
				}

				if (property.type === 'number' && typeof this.credentialData[property.name] !== 'number') {
					return false;
				}
			}
			return true;
		},
		credentialPermissions(): IPermissions {
			if (this.loading) {
				return {};
			}

			return getCredentialPermissions(
				this.currentUser,
				(this.credentialId ? this.currentCredential : this.credentialData) as ICredentialsResponse,
			);
		},
		sidebarItems(): IMenuItem[] {
			return [
				{
					id: 'connection',
					label: this.$locale.baseText('credentialEdit.credentialEdit.connection'),
					position: 'top',
				},
				{
					id: 'sharing',
					label: this.$locale.baseText('credentialEdit.credentialEdit.sharing'),
					position: 'top',
				},
				{
					id: 'details',
					label: this.$locale.baseText('credentialEdit.credentialEdit.details'),
					position: 'top',
				},
			];
		},
		isSharingAvailable(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		defaultCredentialTypeName(): string {
			let credentialTypeName = this.credentialTypeName;
			if (!credentialTypeName || credentialTypeName === 'null') {
				if (this.activeNodeType && this.activeNodeType.credentials) {
					credentialTypeName = this.activeNodeType.credentials[0].name;
				}
			}
			return credentialTypeName || '';
		},
	},
	methods: {
		async beforeClose() {
			let keepEditing = false;

			if (this.hasUnsavedChanges) {
				const displayName = this.credentialType ? this.credentialType.displayName : '';
				keepEditing = await this.confirmMessage(
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose1.message',
						{ interpolate: { credentialDisplayName: displayName } },
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose1.headline',
					),
					null,
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose1.cancelButtonText',
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose1.confirmButtonText',
					),
				);
			} else if (this.credentialPermissions.isOwner && this.isOAuthType && !this.isOAuthConnected) {
				keepEditing = await this.confirmMessage(
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose2.message',
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose2.headline',
					),
					null,
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose2.cancelButtonText',
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose2.confirmButtonText',
					),
				);
			}

			if (!keepEditing) {
				return true;
			} else if (!this.requiredPropertiesFilled) {
				this.showValidationWarning = true;
				this.scrollToTop();
			} else if (this.isOAuthType) {
				this.scrollToBottom();
			}

			return false;
		},
		displayCredentialParameter(parameter: INodeProperties): boolean {
			if (parameter.type === 'hidden') {
				return false;
			}

			if (parameter.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}

			return this.displayParameter(this.credentialData as INodeParameters, parameter, '', null);
		},
		getCredentialProperties(name: string): INodeProperties[] {
			const credentialTypeData = this.credentialsStore.getCredentialTypeByName(name);

			if (!credentialTypeData) {
				return [];
			}

			if (credentialTypeData.extends === undefined) {
				return credentialTypeData.properties;
			}

			const combineProperties = [] as INodeProperties[];
			for (const credentialsTypeName of credentialTypeData.extends) {
				const mergeCredentialProperties = this.getCredentialProperties(credentialsTypeName);
				NodeHelpers.mergeNodeProperties(combineProperties, mergeCredentialProperties);
			}

			// The properties defined on the parent credentials take precedence
			NodeHelpers.mergeNodeProperties(combineProperties, credentialTypeData.properties);

			return combineProperties;
		},

		async loadCurrentCredential() {
			this.credentialId = this.activeId;

			try {
				const currentCredentials = await this.credentialsStore.getCredentialData({
					id: this.credentialId,
				});

				if (!currentCredentials) {
					throw new Error(
						this.$locale.baseText('credentialEdit.credentialEdit.couldNotFindCredentialWithId') +
							':' +
							this.credentialId,
					);
				}

				this.credentialData = currentCredentials.data || {};
				if (currentCredentials.sharedWith) {
					Vue.set(this.credentialData, 'sharedWith', currentCredentials.sharedWith);
				}
				if (currentCredentials.ownedBy) {
					Vue.set(this.credentialData, 'ownedBy', currentCredentials.ownedBy);
				}

				this.credentialName = currentCredentials.name;
				currentCredentials.nodesAccess.forEach((access: { nodeType: string }) => {
					// keep node access structure to keep dates when updating
					this.nodeAccess[access.nodeType] = access;
				});
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
				);
				this.closeDialog();

				return;
			}
		},
		onTabSelect(tab: string) {
			this.activeTab = tab;
			const tabName: string = tab.replaceAll('coming-soon/', '');
			const credType: string = this.credentialType ? this.credentialType.name : '';
			const activeNode: INode | null = this.ndvStore.activeNode;

			this.$telemetry.track('User viewed credential tab', {
				credential_type: credType,
				node_type: activeNode ? activeNode.type : null,
				tab: tabName,
				workflow_id: this.workflowsStore.workflowId,
				credential_id: this.credentialId,
				sharing_enabled: EnterpriseEditionFeature.Sharing,
			});
		},
		onNodeAccessChange({ name, value }: { name: string; value: boolean }) {
			this.hasUnsavedChanges = true;

			if (value) {
				this.nodeAccess = {
					...this.nodeAccess,
					[name]: {
						nodeType: name,
					},
				};
			} else {
				this.nodeAccess = {
					...this.nodeAccess,
					[name]: null,
				};
			}
		},
		onChangeSharedWith(sharees: IDataObject[]) {
			Vue.set(this.credentialData, 'sharedWith', sharees);
			this.hasUnsavedChanges = true;
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onDataChange({ name, value }: { name: string; value: any }) {
			this.hasUnsavedChanges = true;

			const { oauthTokenData, ...credData } = this.credentialData;

			this.credentialData = {
				...credData,
				[name]: value,
			};
		},
		closeDialog() {
			this.modalBus.emit('close');
		},

		getParentTypes(name: string): string[] {
			const credentialType = this.credentialsStore.getCredentialTypeByName(name);

			if (credentialType === undefined || credentialType.extends === undefined) {
				return [];
			}

			const types: string[] = [];
			for (const typeName of credentialType.extends) {
				types.push(typeName);
				types.push.apply(types, this.getParentTypes(typeName)); // eslint-disable-line prefer-spread
			}

			return types;
		},

		onNameEdit(text: string) {
			this.hasUnsavedChanges = true;
			this.hasUserSpecifiedName = true;
			this.credentialName = text;
		},

		scrollToTop() {
			setTimeout(() => {
				const contentRef = this.$refs.content as Element | undefined;
				if (contentRef) {
					contentRef.scrollTop = 0;
				}
			}, 0);
		},

		scrollToBottom() {
			setTimeout(() => {
				const contentRef = this.$refs.content as Element | undefined;
				if (contentRef) {
					contentRef.scrollTop = contentRef.scrollHeight;
				}
			}, 0);
		},

		async retestCredential() {
			if (!this.isCredentialTestable) {
				this.authError = '';
				this.testedSuccessfully = false;

				return;
			}

			const nodesAccess = Object.values(this.nodeAccess).filter(
				(access) => !!access,
			) as ICredentialNodeAccess[];

			const { ownedBy, sharedWith, ...credentialData } = this.credentialData;
			const details: ICredentialsDecrypted = {
				id: this.credentialId,
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: credentialData,
				nodesAccess,
			};

			this.isRetesting = true;
			await this.testCredential(details);
			this.isRetesting = false;
		},

		async testCredential(credentialDetails: ICredentialsDecrypted) {
			const result = await this.credentialsStore.testCredential(credentialDetails);
			if (result.status === 'Error') {
				this.authError = result.message;
				this.testedSuccessfully = false;
			} else {
				this.authError = '';
				this.testedSuccessfully = true;
			}

			this.scrollToTop();
		},

		async saveCredential(): Promise<ICredentialsResponse | null> {
			if (!this.requiredPropertiesFilled) {
				this.showValidationWarning = true;
				this.scrollToTop();
			} else {
				this.showValidationWarning = false;
			}

			this.isSaving = true;
			const nodesAccess = Object.values(this.nodeAccess).filter(
				(access) => !!access,
			) as ICredentialNodeAccess[];

			// Save only the none default data
			const data = NodeHelpers.getNodeParameters(
				this.credentialType!.properties,
				this.credentialData as INodeParameters,
				false,
				false,
				null,
			);

			let sharedWith: IUser[] | undefined;
			let ownedBy: IUser | undefined;
			if (this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				sharedWith = this.credentialData.sharedWith as unknown as IUser[];
				ownedBy = this.credentialData.ownedBy as unknown as IUser;
			}

			const credentialDetails: ICredentialsDecrypted = {
				id: this.credentialId,
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: data as unknown as ICredentialDataDecryptedObject,
				nodesAccess,
				sharedWith,
				ownedBy,
			};

			let credential;

			const isNewCredential = this.mode === 'new' && !this.credentialId;

			if (isNewCredential) {
				credential = await this.createCredential(credentialDetails);
			} else {
				credential = await this.updateCredential(credentialDetails);
			}

			this.isSaving = false;
			if (credential) {
				this.credentialId = credential.id as string;

				if (this.isCredentialTestable) {
					this.isTesting = true;
					// Add the full data including defaults for testing
					credentialDetails.data = this.credentialData;

					credentialDetails.id = this.credentialId;

					await this.testCredential(credentialDetails);
					this.isTesting = false;
				} else {
					this.authError = '';
					this.testedSuccessfully = false;
				}

				const trackProperties: ITelemetryTrackProperties = {
					credential_type: credentialDetails.type,
					workflow_id: this.workflowsStore.workflowId,
					credential_id: credential.id,
					is_complete: !!this.requiredPropertiesFilled,
					is_new: isNewCredential,
				};

				if (this.isOAuthType) {
					trackProperties.is_valid = !!this.isOAuthConnected;
				} else if (this.isCredentialTestable) {
					trackProperties.is_valid = !!this.testedSuccessfully;
				}

				if (this.ndvStore.activeNode) {
					trackProperties.node_type = this.ndvStore.activeNode.type;
				}

				if (this.authError && this.authError !== '') {
					trackProperties.authError = this.authError;
				}

				this.$telemetry.track('User saved credentials', trackProperties);
				await this.$externalHooks().run('credentialEdit.saveCredential', trackProperties);
			}

			return credential;
		},

		async createCredential(
			credentialDetails: ICredentialsDecrypted,
		): Promise<ICredentialsResponse | null> {
			let credential;

			try {
				credential = await this.credentialsStore.createNewCredential(credentialDetails);
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
				);

				return null;
			}

			await this.$externalHooks().run('credential.saved', {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				is_new: true,
			});

			this.$telemetry.track('User created credentials', {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				workflow_id: this.workflowsStore.workflowId,
			});

			return credential;
		},

		async updateCredential(
			credentialDetails: ICredentialsDecrypted,
		): Promise<ICredentialsResponse | null> {
			let credential;
			try {
				credential = await this.credentialsStore.updateCredential({
					id: this.credentialId,
					data: credentialDetails,
				});
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.updateCredential.title'),
				);

				return null;
			}

			await this.$externalHooks().run('credential.saved', {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				is_new: false,
			});

			// Now that the credentials changed check if any nodes use credentials
			// which have now a different name
			this.updateNodesCredentialsIssues();

			return credential;
		},

		async deleteCredential() {
			if (!this.currentCredential) {
				return;
			}

			const savedCredentialName = this.currentCredential.name;

			const deleteConfirmed = await this.confirmMessage(
				this.$locale.baseText(
					'credentialEdit.credentialEdit.confirmMessage.deleteCredential.message',
					{ interpolate: { savedCredentialName } },
				),
				this.$locale.baseText(
					'credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline',
				),
				null,
				this.$locale.baseText(
					'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
				),
			);

			if (deleteConfirmed === false) {
				return;
			}

			try {
				this.isDeleting = true;
				await this.credentialsStore.deleteCredential({ id: this.credentialId });
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.deleteCredential.title'),
				);
				this.isDeleting = false;

				return;
			}

			this.isDeleting = false;
			// Now that the credentials were removed check if any nodes used them
			this.updateNodesCredentialsIssues();
			this.credentialData = {};

			this.$showMessage({
				title: this.$locale.baseText('credentialEdit.credentialEdit.showMessage.title'),
				type: 'success',
			});
			this.closeDialog();
		},

		async oAuthCredentialAuthorize() {
			let url;

			const credential = await this.saveCredential();
			if (!credential) {
				return;
			}

			const types = this.parentTypes;

			try {
				const credData = { id: credential.id, ...this.credentialData };
				if (this.credentialTypeName === 'oAuth2Api' || types.includes('oAuth2Api')) {
					if (isValidCredentialResponse(credData)) {
						url = await this.credentialsStore.oAuth2Authorize(credData);
					}
				} else if (this.credentialTypeName === 'oAuth1Api' || types.includes('oAuth1Api')) {
					if (isValidCredentialResponse(credData)) {
						url = await this.credentialsStore.oAuth1Authorize(credData);
					}
				}
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText(
						'credentialEdit.credentialEdit.showError.generateAuthorizationUrl.title',
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.showError.generateAuthorizationUrl.message',
					),
				);

				return;
			}

			const params =
				'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700';
			const oauthPopup = window.open(url, 'OAuth2 Authorization', params);
			Vue.set(this.credentialData, 'oauthTokenData', null);

			const receiveMessage = (event: MessageEvent) => {
				// // TODO: Add check that it came from n8n
				// if (event.origin !== 'http://example.org:8080') {
				// 	return;
				// }
				if (event.data === 'success') {
					window.removeEventListener('message', receiveMessage, false);

					// Set some kind of data that status changes.
					// As data does not get displayed directly it does not matter what data.
					Vue.set(this.credentialData, 'oauthTokenData', {});
					this.credentialsStore.enableOAuthCredential(credential);

					// Close the window
					if (oauthPopup) {
						oauthPopup.close();
					}
				}
			};

			window.addEventListener('message', receiveMessage, false);
		},
		async onAuthTypeChanged(type: string): Promise<void> {
			if (!this.activeNodeType?.credentials) {
				return;
			}
			const credentialsForType = getNodeCredentialForSelectedAuthType(this.activeNodeType, type);
			if (credentialsForType) {
				this.selectedCredential = credentialsForType.name;
				this.resetCredentialData();
				this.setupNodeAccess();
				// Update current node auth type so credentials dropdown can be displayed properly
				updateNodeAuthType(this.ndvStore.activeNode, type);
				// Also update credential name but only if the default name is still used
				if (this.hasUnsavedChanges && !this.hasUserSpecifiedName) {
					const newDefaultName = await this.credentialsStore.getNewCredentialName({
						credentialTypeName: this.defaultCredentialTypeName,
					});
					this.credentialName = newDefaultName;
				}
			}
		},
		setupNodeAccess(): void {
			this.nodeAccess = this.nodesWithAccess.reduce(
				(accu: NodeAccessMap, node: { name: string }) => {
					if (this.mode === 'new') {
						accu[node.name] = { nodeType: node.name }; // enable all nodes by default
					} else {
						accu[node.name] = null;
					}

					return accu;
				},
				{},
			);
		},
		resetCredentialData(): void {
			if (!this.credentialType) {
				return;
			}
			for (const property of this.credentialType.properties) {
				if (!this.credentialType.__overwrittenProperties?.includes(property.name)) {
					Vue.set(this.credentialData, property.name, property.default as CredentialInformation);
				}
			}
		},
	},
});
</script>

<style module lang="scss">
.credentialModal {
	--dialog-max-width: 900px;
	--dialog-close-top: 31px;
}

.mainContent {
	flex: 1;
	overflow: auto;
	padding-bottom: 100px;
}

.sidebar {
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing-l);
	flex-grow: 1;

	ul {
		padding: 0 !important;
	}
}

.header {
	display: flex;
}

.container {
	display: flex;
	height: 100%;
}

.credInfo {
	display: flex;
	align-items: center;
	flex-direction: row;
	flex-grow: 1;
	margin-bottom: var(--spacing-l);
}

.credActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-right: var(--spacing-xl);
	margin-bottom: var(--spacing-l);

	> * {
		margin-left: var(--spacing-2xs);
	}
}

.credIcon {
	display: flex;
	align-items: center;
	margin-right: var(--spacing-xs);
}
</style>
