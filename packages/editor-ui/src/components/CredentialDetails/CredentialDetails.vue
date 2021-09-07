<template>
	<Modal
		:name="modalName"
		size="lg"
		:customClass="$style.credentialModal"
		:eventBus="modalBus"
		:loading="loading"
		:beforeClose="beforeClose"
	>
		<template slot="header">
			<div v-if="credentialType" :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.credIcon">
						<CredentialIcon :credentialTypeName="credentialTypeName" />
					</div>
					<div>
						<div
							:class="$style.headline"
							@keydown.stop
							@click="enableNameEdit"
							v-click-outside="disableNameEdit"
						>
							<span v-if="isNameEdit">...</span>
							<div v-if="!isNameEdit">
								<span>{{ credentialName }}</span>
								<i><font-awesome-icon icon="pen" /></i>
							</div>
							<div v-else :class="$style.nameInput">
								<n8n-input
									:value="credentialName"
									size="xlarge"
									ref="nameInput"
									@input="onNameEdit"
									@change="disableNameEdit"
									:maxlength="64"
								/>
							</div>
						</div>
						<div :class="$style.subtitle">{{ isNameEdit ? '...' : credentialType.displayName }}</div>
					</div>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button
						v-if="currentCredential"
						size="medium"
						title="Delete"
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
						:savingLabel="isTesting? 'Testing' : 'Saving'"
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
						<n8n-menu-item index="connection" :class="$style.credTab"
							><span slot="title">Connection</span></n8n-menu-item
						>
						<n8n-menu-item index="info" :class="$style.credTab"
							><span slot="title">Info</span></n8n-menu-item
						>
					</n8n-menu>
				</div>
				<div v-if="activeTab === 'connection'" :class="$style.mainContent" ref="content">
					<banner
						v-show="showValidationWarnings && !requiredPropertiesFilled"
						theme="danger"
						message="Please check the errors below"
					/>

					<banner
						v-show="authError"
						theme="danger"
						message="Couldn’t connect with these settings."
						:details="authError"
					/>

					<banner
						v-show="showSuccessBanner"
						theme="success"
						message="Account connected"
						buttonLabel="Reconnect"
						buttonTitle="Reconnect OAuth Credentials"
						@click="oAuthCredentialAuthorize"
					/>

					<n8n-info-tip>
						Need help filling out these fields?
						<a :href="documentationUrl" target="_blank">Open docs</a>
					</n8n-info-tip>

					<CopyInput
						v-if="isOAuthType && credentialProperties.length"
						label="Oauth Redirect URL"
						:copyContent="oAuthCallbackUrl"
						copyButtonText="Click to copy"
						:subtitle="`In ${appName}, use the URL above when prompted to enter an OAuth callback or redirect URL`"
						successMessage="Redirect URL copied to clipboard"
					/>

					<CredentialInputs
						v-if="credentialType"
						:credentialData="credentialData"
						:credentialProperties="credentialProperties"
						:documentationUrl="documentationUrl"
						:showValidationWarnings="showValidationWarnings"
						@change="onDataChange"
					/>

					<OauthButton
						v-if="isOAuthType && requiredPropertiesFilled && !isOAuthConnected"
						:isGoogleOAuthType="isGoogleOAuthType"
						@click="oAuthCredentialAuthorize"
					/>
				</div>
				<div v-if="activeTab === 'info'" :class="$style.mainContent">
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

import Modal from '../Modal.vue';
import CredentialInputs from './CredentialInputs.vue';
import {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	ICredentialsDecrypted,
	ICredentialType,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodeCredentialTestResult,
	NodeHelpers,
} from 'n8n-workflow';
import CredentialIcon from '../CredentialIcon.vue';

import mixins from 'vue-typed-mixins';
import { nodeHelpers } from '../mixins/nodeHelpers';
import { genericHelpers } from '../mixins/genericHelpers';
import { showMessage } from '../mixins/showMessage';

import { getAppNameFromCredType } from '../helpers';
import Banner from '../Banner.vue';
import CopyInput from '../CopyInput.vue';
import CredentialInfo from './CredentialInfo.vue';
import OauthButton from './OauthButton.vue';
import SaveButton from '../SaveButton.vue';

interface NodeAccessMap {
	[nodeType: string]: ICredentialNodeAccess | null;
}

export default mixins(genericHelpers, showMessage, nodeHelpers).extend({
	name: 'CredentialsDetail',
	components: {
		CredentialInputs,
		CredentialIcon,
		CredentialInfo,
		CopyInput,
		Banner,
		Modal,
		OauthButton,
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
			isNameEdit: false,
			hasUnsavedChanges: false,
			loading: true,
			showValidationWarnings: false,
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
					this.credentialData[property.name] =
						property.default as CredentialInformation;
				}
			}
		}

		this.loading = false;
	},
	computed: {
		appName(): string {
			if (!this.credentialType) {
				return '';
			}

			const appName = getAppNameFromCredType(
				this.credentialType.displayName,
			);

			return appName || "the service you're connecting to";
		},
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
		documentationUrl(): string {
			const type = this.credentialType;

			if (!type) {
				return '';
			}

			if (type.documentationUrl && type.documentationUrl.startsWith('http')) {
				return type.documentationUrl;
			}

			if (type.documentationUrl) {
				return `https://docs.n8n.io/credentials/${type.documentationUrl}/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal`;
			}

			return '';
		},
		isCredentialTestable (): boolean {
			if (this.isOAuthType || !this.requiredPropertiesFilled) {
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

			return !!nodesThatCanTest.length;
		},
		showSuccessBanner(): boolean {
			return this.isOAuthType && this.requiredPropertiesFilled && this.isOAuthConnected && !this.authError;
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
				['oAuth1Api', 'oAuth2Api'].includes(this.credentialTypeName) ||
				this.parentTypes.includes('oAuth1Api') ||
				this.parentTypes.includes('oAuth2Api')
			);
		},
		isOAuthConnected(): boolean {
			return this.isOAuthType && !!this.credentialData.oauthTokenData;
		},
		isGoogleOAuthType(): boolean {
			return this.credentialTypeName === 'googleOAuth2Api' || this.parentTypes.includes('googleOAuth2Api');
		},
		// todo move to store
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

				if (!this.credentialData[property.name]) {
					return false;
				}
			}
			return true;
		},
		oAuthCallbackUrl(): string {
			const oauthType =
				this.credentialTypeName === 'oAuth2Api' ||
				this.parentTypes.includes('oAuth2Api')
					? 'oauth2'
					: 'oauth1';
			return this.$store.getters.oauthCallbackUrls[oauthType];
		},
	},
	methods: {
		async beforeClose(done: () => void) {
			let close = false;

			if (this.isOAuthConnected) {
				close = true;
			}
			else if (this.isOAuthType) {
				const goBack = await this.confirmMessage(
					`You need to connect your credential for it to work`,
					'Close without connecting?',
					null,
					'No, go back',
					'Ignore',
				);

				close = !goBack;
			}
			else if (!this.hasUnsavedChanges) {
				close = true;
			}
			else {
				const displayName = this.credentialType ? this.credentialType.displayName : '';
				close = await this.confirmMessage(
					`Are you sure you want to throw away the changes you made to the ${displayName} credential?`,
					'Discard changes?',
					null,
					'Discard',
					'Go back',
				);
			}

			if (close) {
				done();
				return;
			}
			else if (!this.requiredPropertiesFilled) {
				this.showValidationWarnings = true;
				this.scrollToTop();

				return;
			}
			else if (this.isOAuthType) {
				this.scrollToBottom();
			}
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
			);
		},
		getCredentialProperties(name: string): INodeProperties[] {
			const credentialsData =
				this.$store.getters['credentials/getCredentialTypeByName'](name);

			if (!credentialsData) {
				throw new Error(`Could not find credentials of type: ${name}`);
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

		getNodeByName(nodeTypeName: string): INodeTypeDescription {
			return this.$store.getters['nodeType'](nodeTypeName);
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
						`Could not find the credentials with the id: ${this.credentialId}`,
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
			} catch (e) {
				this.$showError(
					e,
					'Problem loading credentials',
					'There was a problem loading the credentials:',
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
			this.authError = '';
			this.showValidationWarnings = false;

			const { oauthTokenData, ...credData } = this.credentialData;

			this.credentialData = {
				...credData,
				[name]: value,
			};
		},
		closeDialog() {
			this.modalBus.$emit('close');
		},

		// todo move to store
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

		enableNameEdit() {
			this.isNameEdit = true;

			setTimeout(() => {
				const input = this.$refs.nameInput as HTMLInputElement;
				if (input) {
					input.focus();
				}
			}, 0);
		},

		disableNameEdit() {
			if (!this.credentialName) {
				this.$showWarning('Error', 'Credential name cannot be empty');

				return;
			}

			this.isNameEdit = false;
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

		async testCredential(credentialDetails: ICredentialsDecrypted) {
			if (this.isCredentialTestable) {
				this.isTesting = true;
				const result: NodeCredentialTestResult = await this.$store.dispatch('credentials/testCredential', credentialDetails);
				this.isTesting = false;

				if (result.status === 'Error') {
					this.authError = result.message;

					this.scrollToTop();
				}
			}
		},

		async saveCredential(): Promise<ICredentialsResponse | null> {
			this.showValidationWarnings = false;
			this.authError = '';

			if (!this.requiredPropertiesFilled) {
				this.showValidationWarnings = true;
				this.scrollToTop();
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
			);

			const credentialDetails: ICredentialsDecrypted = {
				name: this.credentialName,
				type: this.credentialTypeName!,
				data: data as unknown as ICredentialDataDecryptedObject,
				nodesAccess,
			};

			let credential;

			if (this.mode === 'new' && !this.credentialId) {
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

				await this.testCredential(credentialDetails);
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
					'Problem creating credentials',
					'There was a problem creating the credentials:',
				);

				return null;
			}

			this.$externalHooks().run('credentials.create', {
				credentialTypeData: this.credentialData,
			});

			return credential;
		},

		async updateCredential(
			credentialDetails: ICredentialsDecrypted,
		): Promise<ICredentialsResponse | null> {
			let credential;
			try {
				credential = (await this.$store.dispatch(
					'credentials/updateCredentialDetails',
					{ id: this.credentialId, data: credentialDetails },
				)) as ICredentialsResponse;
				this.hasUnsavedChanges = false;
			} catch (error) {
				this.$showError(
					error,
					'Problem updating credentials',
					'There was a problem updating the credentials:',
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
				`Are you sure you want to delete "${savedCredentialName}" credentials?`,
				'Delete Credentials?',
				null,
				'Yes, delete!',
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
					'Problem deleting credentials',
					'There was a problem deleting the credentials:',
				);
				this.isDeleting = false;

				return;
			}

			this.isDeleting = false;
			// Now that the credentials were removed check if any nodes used them
			this.updateNodesCredentialsIssues();

			this.$showMessage({
				title: 'Credentials deleted',
				message: `The credential "${savedCredentialName}" was deleted!`,
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
					'OAuth Authorization Error',
					'Error generating authorization URL:',
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

					if (!this.credentialData.oauthTokenData) {
						this.callDebounced('$showMessage', 1000, {
							title: 'Connected',
							message: 'Credentials connected successfully',
							type: 'success',
						});
					}

					// Set some kind of data that status changes.
					// As data does not get displayed directly it does not matter what data.
					Vue.set(this.credentialData, 'oauthTokenData', {});

					// Close the window
					if (oauthPopup) {
						oauthPopup.close();
					}
				}
			};

			window.addEventListener('message', receiveMessage, false);
		},
	},
	watch: {
		showSuccessBanner(newValue, oldValue) {
			if (newValue && !oldValue) {
				this.scrollToTop();
			}
		},
	},
});
</script>

<style module lang="scss">
.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: var(--spacing-5xs);
	display: inline-block;
	cursor: pointer;
	padding: 0 var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	position: relative;
	min-height: 22px;
	max-height: 22px;
	font-weight: 400;

	i {
		display: var(--headline-icon-display, none);
		font-size: 0.75em;
		margin-left: 8px;
		color: var(--color-text-base);
	}

	&:hover {
		background-color: var(--color-background-base);
		--headline-icon-display: inline-flex;
	}
}

.nameInput {
	z-index: 1;
	position: absolute;
	top: -13px;
	left: -9px;
	width: 400px;
}

.mainContent {
	flex-grow: 1;
	overflow: scroll;
	padding-bottom: 100px;

	> * {
		margin-bottom: var(--spacing-l);
	}
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

.credTab {
	padding-left: 12px !important;
}

.credActions {
	margin-right: var(--spacing-l);
	> * {
		margin-left: var(--spacing-2xs);
	}
}

.subtitle {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: 4px;
	font-weight: 400;
}

.credIcon {
	display: flex;
	align-items: center;
	margin-right: var(--spacing-xs);
}

.credentialModal {
	max-width: 900px;
	--dialog-close-top: 28px;
}

</style>
