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
		<template slot="header">
			<div v-if="credentialType" :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.credIcon">
						<CredentialIcon :credentialTypeName="credentialTypeName" />
					</div>
					<InlineNameEdit
						:name="credentialName"
						:subtitle="credentialType.displayName"
						type="Credential"
						@input="onNameEdit"
					/>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button
						v-if="currentCredential"
						size="small"
						:title="$locale.baseText('credentialEdit.credentialEdit.delete')"
						icon="trash"
						type="text"
						:disabled="isSaving"
						:loading="isDeleting"
						@click="deleteCredential"
					/>
					<SaveButton
						v-if="hasUnsavedChanges || credentialId"
						:saved="!hasUnsavedChanges && !isTesting"
						:isSaving="isSaving || isTesting"
						:savingLabel="isTesting
							? $locale.baseText('credentialEdit.credentialEdit.testing')
							: $locale.baseText('credentialEdit.credentialEdit.saving')"
						@click="saveCredential"
					/>
				</div>
			</div>
			<hr />
		</template>
		<template slot="content">
			<div :class="$style.container">
				<div :class="$style.sidebar">
					<n8n-menu
						type="secondary"
						@select="onTabSelect"
						defaultActive="connection"
						:light="true"
					>
						<n8n-menu-item index="connection"
							><span slot="title">{{ $locale.baseText('credentialEdit.credentialEdit.connection') }}</span></n8n-menu-item
						>
						<n8n-menu-item index="details"
							><span slot="title">{{ $locale.baseText('credentialEdit.credentialEdit.details') }}</span></n8n-menu-item
						>
					</n8n-menu>
				</div>
				<div v-if="activeTab === 'connection'" :class="$style.mainContent" ref="content">
					<CredentialConfig
						:credentialType="credentialType"
						:credentialProperties="credentialProperties"
						:credentialData="credentialData"
						:showValidationWarning="showValidationWarning"
						:authError="authError"
						:testedSuccessfully="testedSuccessfully"
						:isOAuthType="isOAuthType"
						:isOAuthConnected="isOAuthConnected"
						:isRetesting="isRetesting"
						:parentTypes="parentTypes"
						:requiredPropertiesFilled="requiredPropertiesFilled"
						@change="onDataChange"
						@oauth="oAuthCredentialAuthorize"
						@retest="retestCredential"
						@scrollToTop="scrollToTop"
					/>
				</div>
				<div v-if="activeTab === 'details'" :class="$style.mainContent">
					<CredentialInfo
						:nodeAccess="nodeAccess"
						:nodesWithAccess="nodesWithAccess"
						:currentCredential="currentCredential"
						@accessChange="onNodeAccessChange"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
} from '@/Interface';

import {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	ICredentialsDecrypted,
	ICredentialType,
	INodeCredentialTestResult,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	ITelemetryTrackProperties,
	NodeHelpers,
} from 'n8n-workflow';
import CredentialIcon from '../CredentialIcon.vue';

import mixins from 'vue-typed-mixins';
import { nodeHelpers } from '../mixins/nodeHelpers';
import { showMessage } from '../mixins/showMessage';

import CredentialConfig from './CredentialConfig.vue';
import CredentialInfo from './CredentialInfo.vue';
import SaveButton from '../SaveButton.vue';
import Modal from '../Modal.vue';
import InlineNameEdit from '../InlineNameEdit.vue';

interface NodeAccessMap {
	[nodeType: string]: ICredentialNodeAccess | null;
}

export default mixins(showMessage, nodeHelpers).extend({
	name: 'CredentialsDetail',
	components: {
		CredentialConfig,
		CredentialIcon,
		CredentialInfo,
		InlineNameEdit,
		Modal,
		SaveButton,
	},
	props: {
		modalName: {
			type: String,
			required: true,
		},
		activeId: {
			type: String,
			required: true,
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
			modalBus: new Vue(),
			nodeAccess: {} as NodeAccessMap,
			isDeleting: false,
			isSaving: false,
			isTesting: false,
			hasUnsavedChanges: false,
			loading: true,
			showValidationWarning: false,
			testedSuccessfully: false,
			isRetesting: false,
		};
	},
	async mounted() {
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

		if (this.mode === 'new') {
			this.credentialName = await this.$store.dispatch(
				'credentials/getNewCredentialName',
				{ credentialTypeName: this.credentialTypeName },
			);
		} else {
			await this.loadCurrentCredential();
		}

		if (this.credentialType) {
			for (const property of this.credentialType.properties) {
				if (!this.credentialData.hasOwnProperty(property.name)) {
					Vue.set(this.credentialData, property.name, property.default as CredentialInformation);
				}
			}
		}

		this.$externalHooks().run('credentialsEdit.credentialModalOpened', {
			credentialType: this.credentialTypeName,
			isEditingCredential: this.mode === 'edit',
			activeNode: this.$store.getters.activeNode,
		});

		setTimeout(() => {
			if (this.credentialId) {
				if (!this.requiredPropertiesFilled) {
					this.showValidationWarning = true;
				}
				else {
					this.retestCredential();
				}
			}
		}, 0);

		this.loading = false;
	},
	computed: {
		currentCredential(): ICredentialsResponse | null {
			if (!this.credentialId) {
				return null;
			}

			return this.$store.getters['credentials/getCredentialById'](
				this.credentialId,
			);
		},
		credentialTypeName(): string | null {
			if (this.mode === 'edit') {
				if (this.currentCredential) {
					return this.currentCredential.type;
				}

				return null;
			}

			return this.activeId;
		},
		credentialType(): ICredentialType | null {
			if (!this.credentialTypeName) {
				return null;
			}

			const type = this.$store.getters['credentials/getCredentialTypeByName'](
				this.credentialTypeName,
			);

			return {
				...type,
				properties: this.getCredentialProperties(this.credentialTypeName),
			};
		},
		isCredentialTestable (): boolean {
			if (this.isOAuthType || !this.requiredPropertiesFilled) {
				return false;
			}

			const hasExpressions = Object.values(this.credentialData).reduce((accu: boolean, value: CredentialInformation) => accu || (typeof value === 'string' && value.startsWith('=')), false);
			if (hasExpressions) {
				return false;
			}

			const nodesThatCanTest = this.nodesWithAccess.filter(node => {
				if (node.credentials) {
					// Returns a list of nodes that can test this credentials
					const eligibleTesters = node.credentials.filter(credential => {
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
				return this.$store.getters['credentials/getNodesWithAccess'](
					this.credentialTypeName,
				);
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
			return !!this.credentialTypeName && (
				(
					(
						this.credentialTypeName === 'oAuth2Api' ||
						this.parentTypes.includes('oAuth2Api')
					) && this.credentialData.grantType === 'authorizationCode'
				)
				||
				(
					this.credentialTypeName === 'oAuth1Api' ||
					this.parentTypes.includes('oAuth1Api')
				)
			);
		},
		isOAuthConnected(): boolean {
			return this.isOAuthType && !!this.credentialData.oauthTokenData;
		},
		credentialProperties(): INodeProperties[] {
			if (!this.credentialType) {
				return [];
			}

			return this.credentialType.properties.filter(
				(propertyData: INodeProperties) => {
					if (!this.displayCredentialParameter(propertyData)) {
						return false;
					}
					return (
						!this.credentialType!.__overwrittenProperties ||
						!this.credentialType!.__overwrittenProperties.includes(
							propertyData.name,
						)
					);
				},
			);
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
	},
	methods: {
		async beforeClose() {
			let keepEditing = false;

			if (this.hasUnsavedChanges) {
				const displayName = this.credentialType ? this.credentialType.displayName : '';
				keepEditing = await this.confirmMessage(
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose1.message', { interpolate: { credentialDisplayName: displayName } }),
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose1.headline'),
					null,
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose1.cancelButtonText'),
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose1.confirmButtonText'),
				);
			}
			else if (this.isOAuthType && !this.isOAuthConnected) {
				keepEditing = await this.confirmMessage(
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose2.message'),
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose2.headline'),
					null,
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose2.cancelButtonText'),
					this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.beforeClose2.confirmButtonText'),
				);
			}

			if (!keepEditing) {
				return true;
			}
			else if (!this.requiredPropertiesFilled) {
				this.showValidationWarning = true;
				this.scrollToTop();
			}
			else if (this.isOAuthType) {
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

			return this.displayParameter(
				this.credentialData as INodeParameters,
				parameter,
				'',
				null,
			);
		},
		getCredentialProperties(name: string): INodeProperties[] {
			const credentialsData =
				this.$store.getters['credentials/getCredentialTypeByName'](name);

			if (!credentialsData) {
				throw new Error(
					this.$locale.baseText('credentialEdit.credentialEdit.couldNotFindCredentialOfType') + ':' + name,
				);
			}

			if (credentialsData.extends === undefined) {
				return credentialsData.properties;
			}

			const combineProperties = [] as INodeProperties[];
			for (const credentialsTypeName of credentialsData.extends) {
				const mergeCredentialProperties =
					this.getCredentialProperties(credentialsTypeName);
				NodeHelpers.mergeNodeProperties(
					combineProperties,
					mergeCredentialProperties,
				);
			}

			// The properties defined on the parent credentials take presidence
			NodeHelpers.mergeNodeProperties(
				combineProperties,
				credentialsData.properties,
			);

			return combineProperties;
		},

		async loadCurrentCredential() {
			this.credentialId = this.activeId;

			try {
				const currentCredentials: ICredentialsDecryptedResponse =
					await this.$store.dispatch('credentials/getCredentialData', {
						id: this.credentialId,
					});
				if (!currentCredentials) {
					throw new Error(
						this.$locale.baseText('credentialEdit.credentialEdit.couldNotFindCredentialWithId') + ':' + this.credentialId,
					);
				}

				this.credentialData = currentCredentials.data || {};
				this.credentialName = currentCredentials.name;
				currentCredentials.nodesAccess.forEach(
					(access: { nodeType: string }) => {
						// keep node access structure to keep dates when updating
						this.nodeAccess[access.nodeType] = access;
					},
				);
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
		},
		onNodeAccessChange({name, value}: {name: string, value: boolean}) {
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
		onDataChange({ name, value }: { name: string; value: any }) { // tslint:disable-line:no-any
			this.hasUnsavedChanges = true;

			const { oauthTokenData, ...credData } = this.credentialData;

			this.credentialData = {
				...credData,
				[name]: value,
			};
		},
		closeDialog() {
			this.modalBus.$emit('close');
		},

		getParentTypes(name: string): string[] {
			const credentialType =
				this.$store.getters['credentials/getCredentialTypeByName'](name);

			if (
				credentialType === undefined ||
				credentialType.extends === undefined
			) {
				return [];
			}

			const types: string[] = [];
			for (const typeName of credentialType.extends) {
				types.push(typeName);
				types.push.apply(types, this.getParentTypes(typeName));
			}

			return types;
		},

		onNameEdit(text: string) {
			this.hasUnsavedChanges = true;
			this.credentialName = text;
		},

		scrollToTop() {
			setTimeout(() => {
				const content = this.$refs.content as Element;
				if (content) {
					content.scrollTop = 0;
				}
			}, 0);
		},

		scrollToBottom() {
			setTimeout(() => {
				const content = this.$refs.content as Element;
				if (content) {
					content.scrollTop = content.scrollHeight;
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

			const details: ICredentialsDecrypted = {
				id: this.credentialId,
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: this.credentialData,
				nodesAccess,
			};

			this.isRetesting = true;
			await this.testCredential(details);
			this.isRetesting = false;
		},

		async testCredential(credentialDetails: ICredentialsDecrypted) {
			const result: INodeCredentialTestResult = await this.$store.dispatch('credentials/testCredential', credentialDetails);
			if (result.status === 'Error') {
				this.authError = result.message;
				this.testedSuccessfully = false;
			}
			else {
				this.authError = '';
				this.testedSuccessfully = true;
			}

			this.scrollToTop();
		},

		async saveCredential(): Promise<ICredentialsResponse | null> {
			if (!this.requiredPropertiesFilled) {
				this.showValidationWarning = true;
				this.scrollToTop();
			}
			else {
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

			const credentialDetails: ICredentialsDecrypted = {
				id: this.credentialId,
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: data as unknown as ICredentialDataDecryptedObject,
				nodesAccess,
			};

			let credential;

			const isNewCredential = this.mode === 'new' && !this.credentialId;

			if (isNewCredential) {
				credential = await this.createCredential(
					credentialDetails,
				);
			} else {
				credential = await this.updateCredential(
					credentialDetails,
				);
			}

			this.isSaving = false;
			if (credential) {
				this.credentialId = credential.id as string;

				if (this.isCredentialTestable) {
					this.isTesting = true;

					// Add the full data including defaults for testing
					credentialDetails.data = this.credentialData;

					await this.testCredential(credentialDetails);
					this.isTesting = false;
				}
				else {
					this.authError = '';
					this.testedSuccessfully = false;
				}

				const trackProperties: ITelemetryTrackProperties = {
					credential_type: credentialDetails.type,
					workflow_id: this.$store.getters.workflowId,
					credential_id: credential.id,
					is_complete: !!this.requiredPropertiesFilled,
					is_new: isNewCredential,
				};

				if (this.isOAuthType) {
					trackProperties.is_valid = !!this.isOAuthConnected;
				} else if (this.isCredentialTestable) {
					trackProperties.is_valid = !!this.testedSuccessfully;
				}

				if (this.$store.getters.activeNode) {
					trackProperties.node_type = this.$store.getters.activeNode.type;
				}

				if (this.authError && this.authError !== '') {
					trackProperties.authError = this.authError;
				}

				this.$telemetry.track('User saved credentials', trackProperties);
			}

			return credential;
		},

		async createCredential(
			credentialDetails: ICredentialsDecrypted,
		): Promise<ICredentialsResponse | null> {
			let credential;

			try {
				credential = (await this.$store.dispatch(
					'credentials/createNewCredential',
					credentialDetails,
				)) as ICredentialsResponse;
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
				);

				return null;
			}

			this.$externalHooks().run('credentials.create', {
				credentialTypeData: this.credentialData,
			});

			this.$telemetry.track('User created credentials', { credential_type: credentialDetails.type, workflow_id: this.$store.getters.workflowId });

			return credential;
		},

		async updateCredential(
			credentialDetails: ICredentialsDecrypted,
		): Promise<ICredentialsResponse | null> {
			let credential;
			try {
				credential = (await this.$store.dispatch(
					'credentials/updateCredential',
					{ id: this.credentialId, data: credentialDetails },
				)) as ICredentialsResponse;
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.updateCredential.title'),
				);

				return null;
			}

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
				this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.message', { interpolate: { savedCredentialName } }),
				this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline'),
				null,
				this.$locale.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText'),
			);

			if (deleteConfirmed === false) {
				return;
			}

			try {
				this.isDeleting = true;
				await this.$store.dispatch('credentials/deleteCredential', {
					id: this.credentialId,
				});
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
				if (
					this.credentialTypeName === 'oAuth2Api' ||
					types.includes('oAuth2Api')
				) {
					url = (await this.$store.dispatch('credentials/oAuth2Authorize', {
						...this.credentialData,
						id: credential.id,
					})) as string;
				} else if (
					this.credentialTypeName === 'oAuth1Api' ||
					types.includes('oAuth1Api')
				) {
					url = (await this.$store.dispatch('credentials/oAuth1Authorize', {
						...this.credentialData,
						id: credential.id,
					})) as string;
				}
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialEdit.credentialEdit.showError.generateAuthorizationUrl.title'),
					this.$locale.baseText('credentialEdit.credentialEdit.showError.generateAuthorizationUrl.message'),
				);

				return;
			}

			const params = `scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700`;
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
					this.$store.commit('credentials/enableOAuthCredential', credential);

					// Close the window
					if (oauthPopup) {
						oauthPopup.close();
					}
				}
			};

			window.addEventListener('message', receiveMessage, false);
		},
	},

});
</script>

<style module lang="scss">
.credentialModal {
	max-width: 900px;
	--dialog-close-top: 28px;
}

.mainContent {
	flex-grow: 1;
	overflow: auto;
	padding-bottom: 100px;
}

.sidebar {
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing-l);
	flex-grow: 1;
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
	flex-grow: 1;
	margin-bottom: var(--spacing-s);
}

.credActions {
	margin-right: var(--spacing-xl);
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
