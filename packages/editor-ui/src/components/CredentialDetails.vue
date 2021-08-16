<template>
	<Modal
		:name="modalName"
		size="lg"
		:showClose="false"
		:eventBus="modalBus"
	>
		<template slot="header">
			<div :class="$style.header">
				<div :class="$style.credInfo">
					<div :class="$style.headline">{{ credentialName }}</div>
					<div :class="$style.subtitle">{{ credentialType.displayName }}</div>
				</div>
				<div :class="$style.credActions">
					<n8n-icon-button v-if="currentCredential" size="medium" title="Delete" icon="trash" type="text" :loading="isSaving" @click="deleteCredential" />
					<n8n-button size="medium" label="Save" @click="saveCredential" :loading="isSaving" />
				</div>
			</div>
			<hr />
		</template>
		<template slot="content">
			<div :class="$style.container">
				<div :class="$style.sidebar">
					<n8n-menu type="secondary" @select="onTabSelect" defaultActive="connection">
						<n8n-menu-item index="connection"><span slot="title">Connection</span></n8n-menu-item>
						<n8n-menu-item index="info"><span slot="title">Info</span></n8n-menu-item>
					</n8n-menu>
				</div>
				<div :class="$style.mainContent" v-if="activeTab === 'connection'">
					<div :class="$style.infotip"><n8n-icon icon="info-circle"/> Need help filling out these fields? <a :href="credentialType.documentationUrl" target="_blank">Open docs</a></div>
					<credentials-input
						:credentialTypeData="credentialType"
						:credentialData="credentialData"
						@change="onDataChange"
					/>
				</div>
				<div :class="$style.mainContent" v-if="activeTab === 'info'">
					<el-row>
						<el-col :span="8">
							<span :class="$style.label">Can be used with:</span>
						</el-col>
						<el-col :span="16">
							<div v-for="node in nodesWithAccess" :key="node.name">
								<el-checkbox :value="!!nodeAccess[node.name]" @change="(val) => onNodeAccessChange(node.name, val)" :label="node.displayName" />
							</div>
						</el-col>
					</el-row>
					<el-row v-if="currentCredential">
						<el-col :span="8">
							<span :class="$style.label">Created:</span>
						</el-col>
						<el-col :span="16">
							<span>{{ convertToDisplayDate(currentCredential.createdAt) }}</span>
						</el-col>
					</el-row>
					<el-row v-if="currentCredential">
						<el-col :span="8">
							<span :class="$style.label">Last modified:</span>
						</el-col>
						<el-col :span="16">
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

import Modal from './Modal.vue';
import CredentialsInput from './CredentialsInput.vue';
import { convertToDisplayDate } from './helpers';
import TimeAgo from './TimeAgo.vue';
import { CredentialInformation, ICredentialDataDecryptedObject, ICredentialNodeAccess, ICredentialsDecrypted, ICredentialType, INodeParameters, INodeTypeDescription, NodeHelpers } from 'n8n-workflow';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { ICredentialsDecryptedResponse } from '@/Interface';
import { nodeHelpers } from './mixins/nodeHelpers';
import { genericHelpers } from './mixins/genericHelpers';

export default mixins(
	genericHelpers,
	showMessage,
	nodeHelpers,
).extend({
	name: 'CredentialsDetail',
	components: {
		Modal,
		CredentialsInput,
		TimeAgo,
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
			nodeAccess: {} as {[nodeName: string]: ICredentialNodeAccess | null},
			activeTab: 'connection',
			isSaving: false,
		};
	},
	async mounted() {
		for (const property of (this.credentialType as ICredentialType).properties) {
			this.credentialData[property.name] = property.default as CredentialInformation;
		}

		this.nodeAccess = this.nodesWithAccess.reduce((accu: any, node: INodeTypeDescription) => {
			if (this.mode === 'new') {
				accu[node.name] = {nodeType: node.name}; // enable all nodes by default
			}
			else {
				accu[node.name] = null;
			}

			return accu;
		}, {});

		if (this.mode === 'new') {
			this.credentialName = await this.$store.dispatch('credentials/getNewCredentialName', { credentialTypeName: this.credentialTypeName });
		}
		else {
			await this.loadCurrentCredential();
		}

		this.loading = false;
	},
	computed: {
		currentCredential() {
			if (this.mode === 'new') {
				return null;
			}

			return this.$store.getters['credentials/getCredentialById'](this.activeId);
		},
		credentialTypeName() {
			if (this.mode === 'edit') {
				return this.currentCredential.type;
			}

			return this.activeId;
		},
		credentialType(): ICredentialType {
			return this.$store.getters['credentials/getCredentialTypeByName'](this.credentialTypeName);
		},
		nodesWithAccess() {
			return this.$store.getters['credentials/getNodesWithAccess'](this.credentialTypeName);
		},
	},
	methods: {
		async loadCurrentCredential() {
			try {
				const currentCredentials: ICredentialsDecryptedResponse = await this.$store.dispatch('credentials/getCredentialData', { id: this.activeId });
				if (!currentCredentials) {
					throw new Error(`Could not find the credentials with the id: ${this.activeId}`);
				}

				this.credentialData = currentCredentials.data || {};
				this.credentialName = currentCredentials.name;
				currentCredentials.nodesAccess.forEach((access: {nodeType: string}) => {
					// keep node access structure to keep dates when updating
					this.nodeAccess[access.nodeType] = access;
				});
			}
			catch (e) {
				this.$showError(e, 'Problem loading credentials', 'There was a problem loading the credentials:');
				this.closeDialog();

				return;
			};
		},
		onTabSelect(tab: string) {
			this.activeTab = tab;
		},
		onNodeAccessChange(name: string, value: boolean) {
			if (value) {
				this.nodeAccess[name] = {
					nodeType: name,
				};
			}
			else {
				this.nodeAccess[name] = null;
			}
		},
		convertToDisplayDate,
		onDataChange({name, value}: {name: string, value: any}) {
			this.credentialData[name] = value;
		},
		closeDialog() {
			this.modalBus.$emit('close');
		},

		async saveCredential() {
			this.isSaving = true;
			const nodesAccess = Object.values(this.nodeAccess)
				.filter((access) => !!access) as ICredentialNodeAccess[];

		 	// Save only the none default data
			const data = NodeHelpers.getNodeParameters(this.credentialType.properties, this.credentialData as INodeParameters, false, false);

			const credentialDetails: ICredentialsDecrypted = {
				name: this.credentialName,
				type: this.credentialTypeName,
				data: data as unknown as ICredentialDataDecryptedObject,
				nodesAccess,
			};

			if (this.mode === 'new') {
				await this.createCredential(credentialDetails);
			}
			else {
				await this.updateCredential(credentialDetails);
			}

			this.isSaving = false;
		},

		async createCredential(credentialDetails: ICredentialsDecrypted) {
			try {
				await this.$store.dispatch('credentials/createNewCredential', credentialDetails);
			} catch (error) {
				this.$showError(error, 'Problem creating credentials', 'There was a problem creating the credentials:');

				return;
			}

			this.closeDialog();
			this.$externalHooks().run('credentials.create', { credentialTypeData: this.credentialData });
		},

		async updateCredential (credentialDetails: ICredentialsDecrypted) {
			try {
				await this.$store.dispatch('credentials/updateCredentialDetails', { id: this.activeId, data: credentialDetails });
			} catch (error) {
				this.$showError(error, 'Problem updating credentials', 'There was a problem updating the credentials:');

				return;
			}

			// Now that the credentials changed check if any nodes use credentials
			// which have now a different name
			this.updateNodesCredentialsIssues();
			this.closeDialog();
		},

		async deleteCredential () {
			const deleteConfirmed = await this.confirmMessage(`Are you sure you want to delete "${this.credentialName}" credentials?`, 'Delete Credentials?', 'warning', 'Yes, delete!');

			if (deleteConfirmed === false) {
				return;
			}

			try {
				this.isSaving = true;
				await this.$store.dispatch('credentials/deleteCredential', {id: this.activeId});
			} catch (error) {
				this.$showError(error, 'Problem deleting credentials', 'There was a problem deleting the credentials:');
				this.isSaving = false;

				return;
			}

			this.isSaving = false;
			// Now that the credentials got removed check if any nodes used them
			this.updateNodesCredentialsIssues();

			this.$showMessage({
				title: 'Credentials deleted',
				message: `The credential "${this.credentialName}" got deleted!`,
				type: 'success',
			});
			this.closeDialog();
		},

		// async oAuthCredentialAuthorize () {
		// 	let url;

		// 	let credentialData = this.credentialDataDynamic;
		// 	let newCredentials = false;
		// 	if (!credentialData) {
		// 		// Credentials did not get created yet. So create first before
		// 		// doing oauth authorize
		// 		credentialData = await this.createCredentials(false) as ICredentialsDecryptedResponse;
		// 		newCredentials = true;
		// 		if (credentialData === null) {
		// 			return;
		// 		}

		// 		// Set the internal data directly so that even if it fails it displays a "Save" instead
		// 		// of the "Create" button. If that would not be done, people could not retry after a
		// 		// connect issue as it woult try to create credentials again which would fail as they
		// 		// exist already.
		// 		Vue.set(this, 'credentialDataTemp', credentialData);
		// 	} else {
		// 		// Exists already but got maybe changed. So save first
		// 		credentialData = await this.updateCredentials(false) as ICredentialsDecryptedResponse;
		// 		if (credentialData === null) {
		// 			return;
		// 		}
		// 	}

		// 	const types = this.parentTypes(this.credentialTypeData.name);

		// 	try {
		// 		if (this.credentialTypeData.name === 'oAuth2Api' || types.includes('oAuth2Api')) {
		// 			url = await this.restApi().oAuth2CredentialAuthorize(credentialData as ICredentialsResponse) as string;
		// 		} else if (this.credentialTypeData.name === 'oAuth1Api' || types.includes('oAuth1Api')) {
		// 			url = await this.restApi().oAuth1CredentialAuthorize(credentialData as ICredentialsResponse) as string;
		// 		}
		// 	} catch (error) {
		// 		this.$showError(error, 'OAuth Authorization Error', 'Error generating authorization URL:');
		// 		return;
		// 	}

		// 	const params = `scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700`;
		// 	const oauthPopup = window.open(url, 'OAuth2 Authorization', params);

		// 	const receiveMessage = (event: MessageEvent) => {
		// 		// // TODO: Add check that it came from n8n
		// 		// if (event.origin !== 'http://example.org:8080') {
		// 		// 	return;
		// 		// }

		// 		if (event.data === 'success') {

		// 			// Set some kind of data that status changes.
		// 			// As data does not get displayed directly it does not matter what data.
		// 			if (this.credentialData === null) {
		// 				// Are new credentials so did not get send via "credentialData"
		// 				Vue.set(this, 'credentialDataTemp', credentialData);
		// 				Vue.set(this.credentialDataTemp!.data!, 'oauthTokenData', {});
		// 			} else {
		// 				// Credentials did already exist so can be set directly
		// 				Vue.set(this.credentialData.data, 'oauthTokenData', {});
		// 			}

		// 			// Save that OAuth got authorized locally
		// 			this.$store.commit('updateCredentials', this.credentialDataDynamic);

		// 			// Close the window
		// 			if (oauthPopup) {
		// 				oauthPopup.close();
		// 			}

		// 			if (newCredentials === true) {
		// 				this.$emit('credentialsCreated', {data: credentialData, options: { closeDialog: false }});
		// 			}

		// 			this.$showMessage({
		// 				title: 'Connected',
		// 				message: 'Connected successfully!',
		// 				type: 'success',
		// 			});

		// 			// Make sure that the event gets removed again
		// 			window.removeEventListener('message', receiveMessage, false);
		// 		}

		// 	};

		// 	window.addEventListener('message', receiveMessage, false);
		// },

	},
});
</script>

<style module lang="scss">
.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: 2px;
}

.mainContent {
	flex-grow: 1;
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
}

.credInfo {
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
}

.infotip {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	margin-bottom: var(--spacing-l);
}

.nodeName {
	margin-left: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
}
</style>
