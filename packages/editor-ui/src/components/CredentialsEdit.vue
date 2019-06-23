<template>
	<div v-if="dialogVisible" @keydown.stop>
		<el-dialog :visible="dialogVisible" append-to-body width="55%" :title="title" :before-close="closeDialog">

			<div class="credential-type-item">
				<el-row v-if="!setCredentialType">
					<el-col :span="6">
						Credential type:
					</el-col>
					<el-col :span="18">
						<el-select v-model="credentialType" placeholder="Select Type" size="small">
							<el-option
								v-for="item in credentialTypes"
								:key="item.name"
								:label="item.displayName"
								:value="item.name">
							</el-option>
						</el-select>
					</el-col>
				</el-row>
			</div>

			<credentials-input v-if="credentialType" @credentialsCreated="credentialsCreated" @credentialsUpdated="credentialsUpdated" :credentialTypeData="getCredentialTypeData(credentialType)" :credentialData="credentialData" :nodesInit="nodesInit"></credentials-input>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { restApi } from '@/components/mixins/restApi';
import { showMessage } from '@/components/mixins/showMessage';
import CredentialsInput from '@/components/CredentialsInput.vue';
import { ICredentialsDecryptedResponse } from '@/Interface';

import {
	ICredentialType,
} from 'n8n-workflow';

import mixins from 'vue-typed-mixins';

export default mixins(
	restApi,
	showMessage,
).extend({
	name: 'CredentialsEdit',
	props: [
		'dialogVisible',		// Boolean
		'editCredentials',
		'setCredentialType',	// String
		'nodesInit',			// Array
	],
	components: {
		CredentialsInput,
	},
	data () {
		return {
			credentialData: null as ICredentialsDecryptedResponse | null,
			credentialType: null as string | null,
		};
	},
	computed: {
		credentialTypes (): ICredentialType[] {
			const credentialTypes = this.$store.getters.allCredentialTypes;
			if (credentialTypes === null) {
				return [];
			}
			return credentialTypes;
		},
		title (): string {
			if (this.editCredentials) {
				const credentialType = this.$store.getters.credentialType(this.editCredentials.type);
				return `Edit Credentials: "${credentialType.displayName}"`;
			} else {
				if (this.credentialType) {
					const credentialType = this.$store.getters.credentialType(this.credentialType);
					return `Create New Credentials: "${credentialType.displayName}"`;
				} else {
					return `Create New Credentials`;
				}
			}
		},
	},
	watch: {
		async dialogVisible (newValue, oldValue): Promise<void> {
			if (newValue) {
				if (this.editCredentials) {
					// Credentials which should be edited are given
					const credentialType = this.$store.getters.credentialType(this.editCredentials.type);

					if (credentialType === null) {
						this.$showMessage({
							title: 'Credential type not known',
							message: `Credentials of type "${this.editCredentials.type}" are not known.`,
							type: 'error',
							duration: 0,
						});
						this.closeDialog();
						return;
					}

					if (this.editCredentials.id === undefined) {
						this.$showMessage({
							title: 'Credential ID missing',
							message: 'The ID of the credentials which should be edited is missing!',
							type: 'error',
						});
						this.closeDialog();
						return;
					}

					let currentCredentials: ICredentialsDecryptedResponse | undefined;
					try {
						currentCredentials = await this.restApi().getCredentials(this.editCredentials.id as string, true) as ICredentialsDecryptedResponse | undefined;
					} catch (error) {
						this.$showError(error, 'Problem loading credentials', 'There was a problem loading the credentials:');
						this.closeDialog();
						return;
					}

					if (currentCredentials === undefined) {
						this.$showMessage({
							title: 'Credentials not found',
							message: `Could not find the credentials with the id: ${this.editCredentials.id}`,
							type: 'error',
							duration: 0,
						});
						this.closeDialog();
						return;
					}

					if (currentCredentials === undefined) {
						this.$showMessage({
							title: 'Problem loading credentials',
							message: 'No credentials could be loaded!',
							type: 'error',
						});
						return;
					}

					this.credentialData = currentCredentials;
				} else {
					if (this.credentialType || this.setCredentialType) {
						const credentialType = this.$store.getters.credentialType(this.credentialType || this.setCredentialType);
						if (credentialType === null) {
							this.$showMessage({
								title: 'Credential type not known',
								message: `Credentials of type "${this.credentialType || this.setCredentialType}" are not known.`,
								type: 'error',
								duration: 0,
							});
							this.closeDialog();
							return;
						}
					}

					this.credentialData = null;
				}

				if (this.setCredentialType || (this.credentialData && this.credentialData.type)) {
					this.credentialType = this.setCredentialType || (this.credentialData && this.credentialData.type);
				}
			} else {
				// Make sure that it gets always reset else it uses by default
				// again the last selection from when it was open the previous time.
				this.credentialType = null;
			}
		},
	},
	methods: {
		getCredentialTypeData (name: string): ICredentialType | null {
			for (const credentialData of this.credentialTypes) {
				if (credentialData.name === name) {
					return credentialData;
				}
			}

			return null;
		},
		credentialsCreated (data: ICredentialsDecryptedResponse): void {
			this.$emit('credentialsCreated', data);

			this.$showMessage({
				title: 'Credentials created',
				message: `The credential "${data.name}" got created!`,
				type: 'success',
			});

			this.closeDialog();
		},
		credentialsUpdated (data: ICredentialsDecryptedResponse): void {
			this.$emit('credentialsUpdated', data);

			this.$showMessage({
				title: 'Credentials updated',
				message: `The credential "${data.name}" got updated!`,
				type: 'success',
			});

			this.closeDialog();
		},
		closeDialog (): void {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
		},
	},
});
</script>

<style lang="scss">

.credential-type-item {
	padding-bottom: 1em;
}

</style>
