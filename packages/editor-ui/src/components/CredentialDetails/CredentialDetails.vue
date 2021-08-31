<template>
	<Modal
		:name="modalName"
		size="lg"
		:customClass="$style.credentialModal"
		:showClose="false"
		:eventBus="modalBus"
		:loading="loading"
		:beforeClose="beforeClose"
	>
		<template slot="header">
			<div :class="$style.header" v-if="credentialType">
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
									size="medium"
									ref="nameInput"
									@input="onNameEdit"
									@change="disableNameEdit"
									maxlength="64"
								/>
							</div>
						</div>
						<div :class="$style.subtitle">{{ credentialType.displayName }}</div>
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
					<n8n-button
						size="medium"
						label="Save"
						@click="saveCredential"
						:loading="isSaving"
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
					>
						<n8n-menu-item index="connection"
							><span slot="title">Connection</span></n8n-menu-item
						>
						<n8n-menu-item index="info"
							><span slot="title">Info</span></n8n-menu-item
						>
					</n8n-menu>
				</div>
				<div :class="$style.mainContent" v-if="activeTab === 'connection'">
					<credentials-input
						v-if="credentialType"
						:credentialTypeData="credentialType"
						:credentialData="credentialData"
						:parentTypes="parentTypes"
						@change="onDataChange"
						@oauth="oAuthCredentialAuthorize"
					/>
				</div>
				<div :class="$style.mainContent" v-if="activeTab === 'info'">
					<el-row>
						<el-col :span="8">
							<span :class="$style.label">Can be used with:</span>
						</el-col>
						<el-col :span="16">
							<div
								v-for="node in nodesWithAccess"
								:key="node.name"
								:class="$style.valueLabel"
							>
								<el-checkbox
									:value="!!nodeAccess[node.name]"
									@change="(val) => onNodeAccessChange(node.name, val)"
									:label="node.displayName"
								/>
							</div>
						</el-col>
					</el-row>
					<el-row v-if="currentCredential">
						<el-col :span="8">
							<span :class="$style.label">Created:</span>
						</el-col>
						<el-col :span="16" :class="$style.valueLabel">
							<span>{{
								convertToHumanReadableDate(currentCredential.createdAt)
							}}</span>
						</el-col>
					</el-row>
					<el-row v-if="currentCredential">
						<el-col :span="8">
							<span :class="$style.label">Last modified:</span>
						</el-col>
						<el-col :span="16" :class="$style.valueLabel">
							<TimeAgo :date="currentCredential.updatedAt" />
						</el-col>
					</el-row>
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
import CredentialsInput from './CredentialsInput.vue';
import TimeAgo from '../TimeAgo.vue';
import {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialNodeAccess,
	ICredentialsDecrypted,
	ICredentialType,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodeHelpers,
} from 'n8n-workflow';
import CredentialIcon from '../CredentialIcon.vue';

import mixins from 'vue-typed-mixins';
import { nodeHelpers } from '../mixins/nodeHelpers';
import { genericHelpers } from '../mixins/genericHelpers';
import { convertToHumanReadableDate } from '../helpers';
import { showMessage } from '../mixins/showMessage';

interface NodeAccessMap {
	[nodeType: string]: ICredentialNodeAccess | null;
}

export default mixins(genericHelpers, showMessage, nodeHelpers).extend({
	name: 'CredentialsDetail',
	components: {
		CredentialsInput,
		Modal,
		TimeAgo,
		CredentialIcon,
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
			loading: true,
			credentialName: '',
			credentialData: {} as ICredentialDataDecryptedObject,
			modalBus: new Vue(),
			nodeAccess: {} as NodeAccessMap,
			activeTab: 'connection',
			isSaving: false,
			isDeleting: false,
			credentialId: '',
			isNameEdit: false,
			hasUnsavedChanges: false,
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
		isGoogleCredType(): boolean {
			return (
				this.credentialTypeName === 'googleOAuth2Api' ||
				this.credentialTypeName === 'googleApi' ||
				this.parentTypes.includes('googleOAuth2Api')
			);
		},
		isAWSCredType(): boolean {
			return this.credentialTypeName === 'aws';
		},
		isMicrosoftCredType(): boolean {
			return (
				this.credentialTypeName === 'microsoftOAuth2Api' ||
				this.parentTypes.includes('microsoftOAuth2Api')
			);
		},
	},
	methods: {
		async beforeClose(done: () => void) {
			if (!this.hasUnsavedChanges) {
				done();

				return;
			}

			const save = await this.confirmMessage(
				'Are you sure to close this dialog?',
				'Save changes?',
				'warning',
				'Save',
				'Discard',
			);
			if (save) {
				this.saveCredential(true);
			} else {
				done();
			}
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
		onNodeAccessChange(name: string, value: boolean) {
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
		convertToHumanReadableDate,
		onDataChange({ name, value }: { name: string; value: any }) { // tslint:disable-line:no-any
			this.hasUnsavedChanges = true;
			this.credentialData = {
				...this.credentialData,
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

		async saveCredential(
			closeDialog = true,
		): Promise<ICredentialsResponse | null> {
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
					closeDialog,
				);
			} else {
				credential = await this.updateCredential(
					credentialDetails,
					closeDialog,
				);
			}

			this.isSaving = false;

			return credential;
		},

		async createCredential(
			credentialDetails: ICredentialsDecrypted,
			closeDialog: boolean,
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

			if (closeDialog) {
				this.closeDialog();
			}
			this.$externalHooks().run('credentials.create', {
				credentialTypeData: this.credentialData,
			});

			return credential;
		},

		async updateCredential(
			credentialDetails: ICredentialsDecrypted,
			closeDialog: boolean,
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

			if (closeDialog) {
				this.closeDialog();
			}

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
				'warning',
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
			// Now that the credentials got removed check if any nodes used them
			this.updateNodesCredentialsIssues();

			this.$showMessage({
				title: 'Credentials deleted',
				message: `The credential "${savedCredentialName}" got deleted!`,
				type: 'success',
			});
			this.closeDialog();
		},

		async oAuthCredentialAuthorize() {
			let url;

			const credential = await this.saveCredential(false);
			if (!credential) {
				return;
			}

			this.credentialId = credential.id as string;

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

			const receiveMessage = (event: MessageEvent) => {
				// // TODO: Add check that it came from n8n
				// if (event.origin !== 'http://example.org:8080') {
				// 	return;
				// }

				if (event.data === 'success') {
					// Set some kind of data that status changes.
					// As data does not get displayed directly it does not matter what data.
					Vue.set(this.credentialData, 'oauthTokenData', {});

					// Close the window
					if (oauthPopup) {
						oauthPopup.close();
					}

					this.callDebounced('$showMessage', 100, {
						title: 'Connected',
						message: 'Connected successfully!',
						type: 'success',
					});

					window.removeEventListener('message', receiveMessage, false);
				}
			};

			window.addEventListener('message', receiveMessage, false);
		},
	},
});
</script>

<style module lang="scss">
.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: 4px;
	display: inline-block;
	cursor: pointer;
	padding: 0 4px;
	border-radius: 4px;
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
		background-color: var(--color-foreground-base);
		--headline-icon-display: inline;
	}
}

.nameInput {
	z-index: 1;
	position: absolute;
	top: -4px;
	left: -10px;
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

.credActions {
	> * {
		margin-left: var(--spacing-xs);
	}
}

.subtitle {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: 4px;
	font-weight: 400;
}

.nodeName {
	margin-left: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
}

.credIcon {
	display: flex;
	align-items: center;
	margin-right: var(--spacing-xs);
}

.defaultCredIcon {
	height: 26px;
	width: 26px;
}

.valueLabel {
	font-weight: var(--font-weight-regular);
}

.credentialModal {
	max-width: 900px;
}

</style>
