<template>
	<Modal
		:name="CREDENTIAL_LIST_MODAL_KEY"
		width="80%"
		:title="$locale.baseText('credentialsList.credentials')"
	>
		<template v-slot:content>
			<n8n-heading tag="h3" size="small" color="text-light">{{ $locale.baseText('credentialsList.yourSavedCredentials') + ':' }}</n8n-heading>
			<div class="new-credentials-button">
				<n8n-button
					:title="$locale.baseText('credentialsList.createNewCredential')"
					icon="plus"
					:label="$locale.baseText('credentialsList.addNew')"
					size="large"
					@click="createCredential()"
				/>
			</div>

			<el-table :data="credentialsToDisplay" v-loading="loading" :default-sort = "{prop: 'name', order: 'ascending'}" stripe max-height="450" @row-click="editCredential">
				<el-table-column property="name" :label="$locale.baseText('credentialsList.name')" class-name="clickable" sortable></el-table-column>
				<el-table-column property="type" :label="$locale.baseText('credentialsList.type')" class-name="clickable" sortable></el-table-column>
				<el-table-column property="createdAt" :label="$locale.baseText('credentialsList.created')" class-name="clickable" sortable></el-table-column>
				<el-table-column property="updatedAt" :label="$locale.baseText('credentialsList.updated')" class-name="clickable" sortable></el-table-column>
				<el-table-column
					:label="$locale.baseText('credentialsList.operations')"
					width="120">
					<template slot-scope="scope">
						<div class="cred-operations">
							<n8n-icon-button :title="$locale.baseText('credentialsList.editCredential')" @click.stop="editCredential(scope.row)" size="small" icon="pen" />
							<n8n-icon-button :title="$locale.baseText('credentialsList.deleteCredential')" @click.stop="deleteCredential(scope.row)" size="small" icon="trash" />
						</div>
					</template>
				</el-table-column>
			</el-table>
		</template>
	</Modal>
</template>

<script lang="ts">
import { externalHooks } from '@/components/mixins/externalHooks';
import { ICredentialsResponse } from '@/Interface';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { genericHelpers } from '@/components/mixins/genericHelpers';

import { mapGetters } from "vuex";

import mixins from 'vue-typed-mixins';
import { convertToDisplayDate } from './helpers';
import { CREDENTIAL_SELECT_MODAL_KEY, CREDENTIAL_LIST_MODAL_KEY } from '@/constants';

import Modal from './Modal.vue';

export default mixins(
	externalHooks,
	genericHelpers,
	nodeHelpers,
	showMessage,
).extend({
	name: 'CredentialsList',
	components: {
		Modal,
	},
	data() {
		return {
			CREDENTIAL_LIST_MODAL_KEY,
			loading: true,
		};
	},
	computed: {
		...mapGetters('credentials', ['allCredentials']),
		credentialsToDisplay(): ICredentialsResponse[] {
			return this.allCredentials.reduce((accu: ICredentialsResponse[], cred: ICredentialsResponse) => {
				const type = this.$store.getters['credentials/getCredentialTypeByName'](cred.type);

				if (type) {
					accu.push({
						...cred,
						type: type.displayName,
						createdAt: convertToDisplayDate(cred.createdAt as number),
						updatedAt: convertToDisplayDate(cred.updatedAt as number),
					});
				}

				return accu;
			}, []);
		},
	},
	async mounted() {
		try {
			await Promise.all([
				await this.$store.dispatch('credentials/fetchCredentialTypes'),
				await this.$store.dispatch('credentials/fetchAllCredentials'),
			]);
		}	catch (e) {
			this.$showError(e, this.$locale.baseText('credentialsList.errorLoadingCredentials'));
		}
		this.loading = false;

		this.$externalHooks().run('credentialsList.mounted');
		this.$telemetry.track('User opened Credentials panel', { workflow_id: this.$store.getters.workflowId });
	},
	destroyed() {
		this.$externalHooks().run('credentialsList.destroyed');
	},
	methods: {
		createCredential () {
			this.$store.dispatch('ui/openModal', CREDENTIAL_SELECT_MODAL_KEY);
		},

		editCredential (credential: ICredentialsResponse) {
			this.$store.dispatch('ui/openExisitngCredential', { id: credential.id});
			this.$telemetry.track('User opened Credential modal', { credential_type: credential.type, source: 'primary_menu', new_credential: false, workflow_id: this.$store.getters.workflowId });
		},

		async deleteCredential (credential: ICredentialsResponse) {
			const deleteConfirmed = await this.confirmMessage(
				this.$locale.baseText(
					'credentialsList.confirmMessage.message',
					{ interpolate: { credentialName: credential.name }},
				),
				this.$locale.baseText('credentialsList.confirmMessage.headline'),
				null,
				this.$locale.baseText('credentialsList.confirmMessage.confirmButtonText'),
				this.$locale.baseText('credentialsList.confirmMessage.cancelButtonText'),
			);

			if (deleteConfirmed === false) {
				return;
			}

			try {
				await this.$store.dispatch('credentials/deleteCredential', {id: credential.id});
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('credentialsList.showError.deleteCredential.title'),
				);

				return;
			}

			// Now that the credentials got removed check if any nodes used them
			this.updateNodesCredentialsIssues();

			this.$showMessage({
				title: this.$locale.baseText('credentialsList.showMessage.title'),
				type: 'success',
			});
		},
	},
});
</script>

<style lang="scss" scoped>

.new-credentials-button {
	float: right;
	position: relative;
	margin-bottom: var(--spacing-2xs);
}

.cred-operations {
	> * {
		margin-left: 10px;
	}
}

</style>
