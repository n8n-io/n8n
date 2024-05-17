<template>
	<Modal
		:name="modalName"
		:custom-class="$style.credentialModal"
		:event-bus="modalBus"
		:loading="loading"
		:before-close="beforeClose"
		width="70%"
		height="80%"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.credIcon">
						<CredentialIcon :credential-type-name="defaultCredentialTypeName" />
					</div>
					<InlineNameEdit
						:model-value="credentialName"
						:subtitle="credentialType ? credentialType.displayName : ''"
						:readonly="!credentialPermissions.update || !credentialType"
						type="Credential"
						data-test-id="credential-name"
						@update:model-value="onNameEdit"
					/>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button
						v-if="currentCredential && credentialPermissions.delete"
						:title="$locale.baseText('credentialEdit.credentialEdit.delete')"
						icon="trash"
						type="tertiary"
						:disabled="isSaving"
						:loading="isDeleting"
						data-test-id="credential-delete-button"
						@click="deleteCredential"
					/>
					<SaveButton
						v-if="showSaveButton"
						:saved="!hasUnsavedChanges && !isTesting"
						:is-saving="isSaving || isTesting"
						:saving-label="
							isTesting
								? $locale.baseText('credentialEdit.credentialEdit.testing')
								: $locale.baseText('credentialEdit.credentialEdit.saving')
						"
						data-test-id="credential-save-button"
						@click="saveCredential"
					/>
				</div>
			</div>
			<hr />
		</template>
		<template #content>
			<div :class="$style.container" data-test-id="credential-edit-dialog">
				<div :class="$style.sidebar">
					<n8n-menu
						mode="tabs"
						:items="sidebarItems"
						:transparent-background="true"
						@select="onTabSelect"
					></n8n-menu>
				</div>
				<div
					v-if="activeTab === 'connection' && credentialType"
					ref="content"
					:class="$style.mainContent"
				>
					<CredentialConfig
						:credential-type="credentialType"
						:credential-properties="credentialProperties"
						:credential-data="credentialData"
						:credential-id="credentialId"
						:show-validation-warning="showValidationWarning"
						:auth-error="authError"
						:tested-successfully="testedSuccessfully"
						:is-o-auth-type="isOAuthType"
						:is-o-auth-connected="isOAuthConnected"
						:is-retesting="isRetesting"
						:parent-types="parentTypes"
						:required-properties-filled="requiredPropertiesFilled"
						:credential-permissions="credentialPermissions"
						:all-o-auth2-base-properties-overridden="allOAuth2BasePropertiesOverridden"
						:mode="mode"
						:selected-credential="selectedCredential"
						:show-auth-type-selector="requiredCredentials"
						@update="onDataChange"
						@oauth="oAuthCredentialAuthorize"
						@retest="retestCredential"
						@scroll-to-top="scrollToTop"
						@auth-type-changed="onAuthTypeChanged"
					/>
				</div>
				<div v-else-if="showSharingContent" :class="$style.mainContent">
					<CredentialSharing
						:credential="currentCredential"
						:credential-data="credentialData"
						:credential-id="credentialId"
						:credential-permissions="credentialPermissions"
						:modal-bus="modalBus"
						@update:model-value="onChangeSharedWith"
					/>
				</div>
				<div v-else-if="activeTab === 'details' && credentialType" :class="$style.mainContent">
					<CredentialInfo
						:current-credential="currentCredential"
						:credential-permissions="credentialPermissions"
					/>
				</div>
				<div v-else-if="activeTab.startsWith('coming-soon')" :class="$style.mainContent">
					<FeatureComingSoon :feature-id="activeTab.split('/')[1]"></FeatureComingSoon>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import type { ICredentialsResponse, IUser } from '@/Interface';

import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
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
import CredentialIcon from '@/components/CredentialIcon.vue';

import { useToast } from '@/composables/useToast';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useMessage } from '@/composables/useMessage';
import CredentialConfig from '@/components/CredentialEdit/CredentialConfig.vue';
import CredentialInfo from '@/components/CredentialEdit/CredentialInfo.vue';
import CredentialSharing from '@/components/CredentialEdit/CredentialSharing.ee.vue';
import SaveButton from '@/components/SaveButton.vue';
import Modal from '@/components/Modal.vue';
import InlineNameEdit from '@/components/InlineNameEdit.vue';
import { CREDENTIAL_EDIT_MODAL_KEY, EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import FeatureComingSoon from '@/components/FeatureComingSoon.vue';
import type { PermissionsMap } from '@/permissions';
import { getCredentialPermissions } from '@/permissions';
import type { IMenuItem } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system/utils';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { ProjectSharingData } from '@/features/projects/projects.types';

import {
	getNodeAuthOptions,
	getNodeCredentialForSelectedAuthType,
	updateNodeAuthType,
} from '@/utils/nodeTypesUtils';
import { isValidCredentialResponse, isCredentialModalState } from '@/utils/typeGuards';
import { isExpression, isTestableExpression } from '@/utils/expressions';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { CredentialScope } from '@n8n/permissions';

export default defineComponent({
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
	setup() {
		const nodeHelpers = useNodeHelpers();

		return {
			externalHooks: useExternalHooks(),
			...useToast(),
			...useMessage(),
			nodeHelpers,
		};
	},
	data() {
		return {
			activeTab: 'connection',
			authError: '',
			credentialId: '',
			credentialName: '',
			credentialData: {} as ICredentialDataDecryptedObject,
			modalBus: createEventBus(),
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
			isSharedWithChanged: false,
		};
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNDVStore,
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useWorkflowsStore,
			useNodeTypesStore,
			useProjectsStore,
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
				return this.credentialsStore.getCredentialTypeByName(this.selectedCredential) ?? null;
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
			if (this.isOAuthType || !this.requiredPropertiesFilled) {
				return false;
			}

			const hasUntestableExpressions = Object.values(this.credentialData).reduce(
				(accu: boolean, value: CredentialInformation) =>
					accu ||
					(typeof value === 'string' && isExpression(value) && !isTestableExpression(value)),
				false,
			);
			if (hasUntestableExpressions) {
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
					(this.credentialData.grantType === 'authorizationCode' ||
						this.credentialData.grantType === 'pkce')) ||
					this.credentialTypeName === 'oAuth1Api' ||
					this.parentTypes.includes('oAuth1Api'))
			);
		},
		allOAuth2BasePropertiesOverridden() {
			if (this.credentialType?.__overwrittenProperties) {
				return (
					this.credentialType.__overwrittenProperties.includes('clientId') &&
					this.credentialType.__overwrittenProperties.includes('clientSecret')
				);
			}
			return false;
		},
		isOAuthConnected(): boolean {
			return this.isOAuthType && !!this.credentialData.oauthTokenData;
		},
		credentialProperties(): INodeProperties[] {
			if (!this.credentialType) {
				return [];
			}

			const properties = this.credentialType.properties.filter((propertyData: INodeProperties) => {
				if (!this.displayCredentialParameter(propertyData)) {
					return false;
				}
				return (
					!this.credentialType!.__overwrittenProperties ||
					!this.credentialType!.__overwrittenProperties.includes(propertyData.name)
				);
			});

			/**
			 * If after all credentials overrides are applied only "notice"
			 * properties are left, do not return them. This will avoid
			 * showing notices that refer to a property that was overridden.
			 */
			if (properties.every((p) => p.type === 'notice')) {
				return [];
			}

			return properties;
		},
		requiredPropertiesFilled(): boolean {
			for (const property of this.credentialProperties) {
				if (property.required !== true) {
					continue;
				}

				if (property.type === 'string' && !this.credentialData[property.name]) {
					return false;
				}

				if (property.type === 'number') {
					const isExpression =
						typeof this.credentialData[property.name] === 'string' &&
						this.credentialData[property.name].startsWith('=');

					if (typeof this.credentialData[property.name] !== 'number' && !isExpression) {
						return false;
					}
				}
			}
			return true;
		},
		credentialPermissions(): PermissionsMap<CredentialScope> {
			if (this.loading) {
				return {} as PermissionsMap<CredentialScope>;
			}

			return getCredentialPermissions(
				(this.credentialId ? this.currentCredential : this.credentialData) as ICredentialsResponse,
			);
		},
		sidebarItems(): IMenuItem[] {
			const menuItems: IMenuItem[] = [
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

			return menuItems;
		},
		isSharingAvailable(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		defaultCredentialTypeName(): string {
			let credentialTypeName = this.credentialTypeName;
			if (!credentialTypeName || credentialTypeName === 'null') {
				if (this.activeNodeType?.credentials) {
					credentialTypeName = this.activeNodeType.credentials[0].name;
				}
			}
			return credentialTypeName || '';
		},
		showSaveButton(): boolean {
			return (
				(this.hasUnsavedChanges || !!this.credentialId) &&
				(this.credentialPermissions.create || this.credentialPermissions.update)
			);
		},
		showSharingMenu(): boolean {
			return !this.$route.params.projectId;
		},
		showSharingContent(): boolean {
			return this.activeTab === 'sharing' && !!this.credentialType;
		},
	},
	async mounted() {
		this.requiredCredentials =
			isCredentialModalState(this.uiStore.modals[CREDENTIAL_EDIT_MODAL_KEY]) &&
			this.uiStore.modals[CREDENTIAL_EDIT_MODAL_KEY].showAuthSelector === true;

		if (this.mode === 'new' && this.credentialTypeName) {
			this.credentialName = await this.credentialsStore.getNewCredentialName({
				credentialTypeName: this.defaultCredentialTypeName,
			});

			const { currentProject, personalProject } = this.projectsStore;
			const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];
			const homeProject = currentProject ?? personalProject ?? {};

			this.credentialData = {
				...this.credentialData,
				scopes,
				homeProject,
			};
		} else {
			await this.loadCurrentCredential();
		}

		if (this.credentialType) {
			for (const property of this.credentialType.properties) {
				if (
					!this.credentialData.hasOwnProperty(property.name) &&
					!this.credentialType.__overwrittenProperties?.includes(property.name)
				) {
					this.credentialData = {
						...this.credentialData,
						[property.name]: property.default as CredentialInformation,
					};
				}
			}
		}

		await this.externalHooks.run('credentialsEdit.credentialModalOpened', {
			credentialType: this.credentialTypeName,
			isEditingCredential: this.mode === 'edit',
			activeNode: this.ndvStore.activeNode,
		});

		setTimeout(async () => {
			if (this.credentialId) {
				if (!this.requiredPropertiesFilled && this.credentialPermissions.update) {
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
	methods: {
		async beforeClose() {
			let keepEditing = false;

			if (this.hasUnsavedChanges) {
				const displayName = this.credentialType ? this.credentialType.displayName : '';
				const confirmAction = await this.confirm(
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose1.message',
						{ interpolate: { credentialDisplayName: displayName } },
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose1.headline',
					),
					{
						cancelButtonText: this.$locale.baseText(
							'credentialEdit.credentialEdit.confirmMessage.beforeClose1.cancelButtonText',
						),
						confirmButtonText: this.$locale.baseText(
							'credentialEdit.credentialEdit.confirmMessage.beforeClose1.confirmButtonText',
						),
					},
				);
				keepEditing = confirmAction === MODAL_CONFIRM;
			} else if (this.isOAuthType && !this.isOAuthConnected) {
				const confirmAction = await this.confirm(
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose2.message',
					),
					this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.beforeClose2.headline',
					),
					{
						cancelButtonText: this.$locale.baseText(
							'credentialEdit.credentialEdit.confirmMessage.beforeClose2.cancelButtonText',
						),
						confirmButtonText: this.$locale.baseText(
							'credentialEdit.credentialEdit.confirmMessage.beforeClose2.confirmButtonText',
						),
					},
				);
				keepEditing = confirmAction === MODAL_CONFIRM;
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

			if (parameter.displayOptions?.hideOnCloud && this.settingsStore.isCloudDeployment) {
				return false;
			}

			if (parameter.displayOptions === undefined) {
				// If it is not defined no need to do a proper check
				return true;
			}

			return this.nodeHelpers.displayParameter(
				this.credentialData as INodeParameters,
				parameter,
				'',
				null,
			);
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
			this.credentialId = (this.activeId ?? '') as string;

			try {
				const currentCredentials = (await this.credentialsStore.getCredentialData({
					id: this.credentialId,
				})) as unknown as ICredentialDataDecryptedObject;

				if (!currentCredentials) {
					throw new Error(
						this.$locale.baseText('credentialEdit.credentialEdit.couldNotFindCredentialWithId') +
							':' +
							this.credentialId,
					);
				}

				this.credentialData = (currentCredentials.data as ICredentialDataDecryptedObject) || {};
				if (currentCredentials.sharedWithProjects) {
					this.credentialData = {
						...this.credentialData,
						sharedWithProjects: currentCredentials.sharedWithProjects,
					};
				}
				if (currentCredentials.homeProject) {
					this.credentialData = {
						...this.credentialData,
						homeProject: currentCredentials.homeProject,
					};
				}

				this.credentialName = currentCredentials.name as string;
			} catch (error) {
				this.showError(
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
		onChangeSharedWith(sharedWithProjects: ProjectSharingData[]) {
			this.credentialData = {
				...this.credentialData,
				sharedWithProjects,
			};
			this.isSharedWithChanged = true;
			this.hasUnsavedChanges = true;
		},

		onDataChange({ name, value }: { name: string; value: CredentialInformation }) {
			// skip update if new value matches the current
			if (this.credentialData[name] === value) return;

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

			if (credentialType?.extends === undefined) {
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

			const { ownedBy, sharedWithProjects, ...credentialData } = this.credentialData;
			const details: ICredentialsDecrypted = {
				id: this.credentialId,
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: credentialData,
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

			// Save only the none default data
			const data = NodeHelpers.getNodeParameters(
				this.credentialType!.properties,
				this.credentialData as INodeParameters,
				false,
				false,
				null,
			);

			const credentialDetails: ICredentialsDecrypted = {
				id: this.credentialId,
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: data as unknown as ICredentialDataDecryptedObject,
				nodesAccess: [],
			};

			if (
				this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing) &&
				this.credentialData.sharedWithProjects
			) {
				credentialDetails.sharedWithProjects = this.credentialData
					.sharedWithProjects as ProjectSharingData[];
			}

			let credential;

			const isNewCredential = this.mode === 'new' && !this.credentialId;

			if (isNewCredential) {
				credential = await this.createCredential(
					credentialDetails,
					this.projectsStore.currentProjectId,
				);

				let toastTitle = this.$locale.baseText('credentials.create.personal.toast.title');
				let toastText = '';

				if (!credentialDetails.sharedWithProjects) {
					toastText = this.$locale.baseText('credentials.create.personal.toast.text');
				}

				if (this.projectsStore.currentProject) {
					toastTitle = this.$locale.baseText('credentials.create.project.toast.title', {
						interpolate: { projectName: this.projectsStore.currentProject.name ?? '' },
					});

					toastText = this.$locale.baseText('credentials.create.project.toast.text', {
						interpolate: { projectName: this.projectsStore.currentProject.name ?? '' },
					});
				}

				this.showMessage({
					title: toastTitle,
					message: toastText,
					type: 'success',
				});
			} else {
				if (this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
					credentialDetails.sharedWithProjects = this.credentialData
						.sharedWithProjects as ProjectSharingData[];
				}

				credential = await this.updateCredential(credentialDetails);
			}

			this.isSaving = false;
			if (credential) {
				this.credentialId = credential.id;

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

				const usesExternalSecrets = Object.entries(credentialDetails.data || {}).some(([, value]) =>
					/=.*\{\{[^}]*\$secrets\.[^}]+}}.*/.test(`${value}`),
				);

				const trackProperties: ITelemetryTrackProperties = {
					credential_type: credentialDetails.type,
					workflow_id: this.workflowsStore.workflowId,
					credential_id: credential.id,
					is_complete: !!this.requiredPropertiesFilled,
					is_new: isNewCredential,
					uses_external_secrets: usesExternalSecrets,
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
				await this.externalHooks.run('credentialEdit.saveCredential', trackProperties);
			}

			return credential;
		},

		async createCredential(
			credentialDetails: ICredentialsDecrypted,
			projectId?: string,
		): Promise<ICredentialsResponse | null> {
			let credential;

			try {
				credential = await this.credentialsStore.createNewCredential(credentialDetails, projectId);
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
				);

				return null;
			}

			await this.externalHooks.run('credential.saved', {
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
				if (this.credentialPermissions.update) {
					credential = await this.credentialsStore.updateCredential({
						id: this.credentialId,
						data: credentialDetails,
					});
				}
				if (
					this.credentialPermissions.share &&
					this.isSharedWithChanged &&
					credentialDetails.sharedWithProjects
				) {
					credential = await this.credentialsStore.setCredentialSharedWith({
						credentialId: credentialDetails.id,
						sharedWithProjects: credentialDetails.sharedWithProjects,
					});
					this.isSharedWithChanged = false;
				}
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.updateCredential.title'),
				);

				return null;
			}

			await this.externalHooks.run('credential.saved', {
				credential_type: credentialDetails.type,
				credential_id: credential.id,
				is_new: false,
			});

			// Now that the credentials changed check if any nodes use credentials
			// which have now a different name
			this.nodeHelpers.updateNodesCredentialsIssues();

			return credential;
		},

		async deleteCredential() {
			if (!this.currentCredential) {
				return;
			}

			const savedCredentialName = this.currentCredential.name;

			const deleteConfirmed = await this.confirm(
				this.$locale.baseText(
					'credentialEdit.credentialEdit.confirmMessage.deleteCredential.message',
					{ interpolate: { savedCredentialName } },
				),
				this.$locale.baseText(
					'credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline',
				),
				{
					confirmButtonText: this.$locale.baseText(
						'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
					),
				},
			);

			if (deleteConfirmed !== MODAL_CONFIRM) {
				return;
			}

			try {
				this.isDeleting = true;
				await this.credentialsStore.deleteCredential({ id: this.credentialId });
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.deleteCredential.title'),
				);
				this.isDeleting = false;

				return;
			}

			this.isDeleting = false;
			// Now that the credentials were removed check if any nodes used them
			this.nodeHelpers.updateNodesCredentialsIssues();
			this.credentialData = {};

			this.showMessage({
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
				this.showError(
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

			this.credentialData = {
				...this.credentialData,
				oauthTokenData: null as unknown as CredentialInformation,
			};

			const receiveMessage = (event: MessageEvent) => {
				// // TODO: Add check that it came from n8n
				// if (event.origin !== 'http://example.org:8080') {
				// 	return;
				// }
				if (event.data === 'success') {
					window.removeEventListener('message', receiveMessage, false);

					// Set some kind of data that status changes.
					// As data does not get displayed directly it does not matter what data.
					this.credentialData = {
						...this.credentialData,
						oauthTokenData: {} as CredentialInformation,
					};

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
		resetCredentialData(): void {
			if (!this.credentialType) {
				return;
			}
			for (const property of this.credentialType.properties) {
				if (!this.credentialType.__overwrittenProperties?.includes(property.name)) {
					this.credentialData = {
						...this.credentialData,
						[property.name]: property.default as CredentialInformation,
					};
				}
			}

			const { currentProject, personalProject } = this.projectsStore;
			const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];
			const homeProject = currentProject ?? personalProject ?? {};

			this.credentialData = {
				...this.credentialData,
				scopes,
				homeProject,
			};
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
