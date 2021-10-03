<template>
	<div v-if="dialogVisible">
		<el-dialog :visible="dialogVisible" append-to-body width="80%" title="Credentials" :before-close="closeDialog">
			<div class="text-very-light">
				Your saved credentials:
			</div>

			<div class="new-credentials-button">
				<n8n-button
					title="Create New Credentials"
					icon="plus"
					label="Add New"
					size="large"
					@click="createCredential()"
				/>
			</div>

			<el-table :data="credentialsToDisplay" :default-sort = "{prop: 'name', order: 'ascending'}" stripe max-height="450" @row-click="editCredential">
				<el-table-column property="name" label="Name" class-name="clickable" sortable></el-table-column>
				<el-table-column property="type" label="Type" class-name="clickable" sortable></el-table-column>
				<el-table-column property="createdAt" label="Created" class-name="clickable" sortable></el-table-column>
				<el-table-column property="updatedAt" label="Updated" class-name="clickable" sortable></el-table-column>
				<el-table-column
					label="Operations"
					width="120">
					<template slot-scope="scope">
						<div class="cred-operations">
							<n8n-icon-button title="Edit Credentials" @click.stop="editCredential(scope.row)" icon="pen" />
							<n8n-icon-button title="Delete Credentials" @click.stop="deleteCredential(scope.row)" icon="trash" />
						</div>
					</template>
				</el-table-column>
			</el-table>
		</el-dialog>
	</div>
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

export default mixins(
	externalHooks,
	genericHelpers,
	nodeHelpers,
	showMessage,
).extend({
	name: 'CredentialsList',
	props: [
		'dialogVisible',
	],
	computed: {
		...mapGetters('credentials', ['allCredentials']),
		credentialsToDisplay() {
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
	watch: {
		dialogVisible (newValue) {
			this.$externalHooks().run('credentialsList.dialogVisibleChanged', { dialogVisible: newValue });
		},
	},
	methods: {
		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},

		createCredential () {
			this.$store.dispatch('ui/openCredentialsSelectModal');
		},

		editCredential (credential: ICredentialsResponse) {
			this.$store.dispatch('ui/openExisitngCredential', { id: credential.id});
		},

		async deleteCredential (credential: ICredentialsResponse) {
			const deleteConfirmed = await this.confirmMessage(`Are you sure you want to delete "${credential.name}" credentials?`, 'Delete Credentials?', null, 'Yes, delete!');

			if (deleteConfirmed === false) {
				return;
			}

			try {
				await this.$store.dispatch('credentials/deleteCredential', {id: credential.id});
			} catch (error) {
				this.$showError(error, 'Problem deleting credentials', 'There was a problem deleting the credentials:');

				return;
			}

			// Now that the credentials got removed check if any nodes used them
			this.updateNodesCredentialsIssues();

			this.$showMessage({
				title: 'Credentials deleted',
				message: `The credential "${credential.name}" was deleted!`,
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
	top: -15px;
}

.cred-operations {
	> * {
		margin-left: 10px;
	}
}

</style>
