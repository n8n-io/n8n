<template>
	<Modal
		:name="modalName"
		@enter="onSubmit"
		:title="title"
		:center="true"
		width="460px"
		:eventBus="modalBus"
	>
		<template slot="content">
			<div>
				<div v-if="isPending">
					<n8n-text color="text-base">Are you sure you want to delete this invited user?</n8n-text>
				</div>
				<div :class="$style.content" v-else>
					<div><n8n-text color="text-base">What should we do with their data?</n8n-text></div>
					<el-radio :value="operation" label="transfer" @change="() => setOperation('transfer')">
						<n8n-text color="text-dark">Transfer their workflows and credentials to another user</n8n-text>
					</el-radio>
					<div :class="$style.optionInput" v-if="operation === 'transfer'">
						<n8n-input-label label="User to transfer to">
							<n8n-user-select
								:users="allUsers"
								:value="transferId"
								:ignoreIds="ignoreIds"
								@input="setTransferId"
							/>
						</n8n-input-label>
					</div>
					<el-radio :value="operation" label="delete" @change="() => setOperation('delete')">
						<n8n-text color="text-dark">Delete their workflows and credentials</n8n-text>
					</el-radio>
					<div :class="$style.optionInput" v-if="operation === 'delete'">
						<n8n-input-label label="Type “delete all data” to confirm">
							<n8n-input :value="deleteConfirmText" placeholder="delete all data" @input="setConfirmText" />
						</n8n-input-label>
					</div>
				</div>
			</div>
		</template>
		<template slot="footer">
			<n8n-button :loading="loading" :disabled="!enabled" label="Delete" @click="onSubmit" float="right" />
		</template>
	</Modal>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";

import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import Vue from "vue";
import { IUser } from "../Interface";
import { mapGetters } from "vuex";
import { N8nUserSelect } from 'n8n-design-system';

export default mixins(showMessage).extend({
	components: {
		Modal,
		N8nUserSelect,
	},
	name: "DeleteUserModal",
	props: {
		modalName: {
			type: String,
		},
		activeId: {
			type: String,
		},
	},
	data() {
		return {
			modalBus: new Vue(),
			loading: false,
			operation: '',
			deleteConfirmText: '',
			transferId: '',
			ignoreIds: [this.activeId],
		};
	},
	computed: {
		...mapGetters('users', ['allUsers', 'currentUserId']),
		userToDelete(): IUser {
			const getUserById = this.$store.getters['users/getUserById'];
			return getUserById(this.activeId);
		},
		isPending(): boolean {
			return this.userToDelete && !this.userToDelete.firstName;
		},
		title(): string {
			if (!this.userToDelete) {
				return '';
			}
			if (!this.userToDelete.fullName) {
				return `Delete ${this.userToDelete.email}?`;
			}
			return `Delete ${this.userToDelete.fullName}?`;
		},
		enabled(): boolean {
			if (this.isPending) {
				return true;
			}
			if (this.operation === 'delete' && this.deleteConfirmText === 'delete all data') {
				return true;
			}

			if (this.operation === 'transfer' && this.transferId) {
				return true;
			}

			return false;
		},
	},
	methods: {
		setOperation(operation: string) {
			this.operation = operation;
			this.transferId = '';
		},
		setConfirmText(text: string) {
			this.deleteConfirmText = text;
		},
		setTransferId(id: string) {
			this.transferId = id;
		},
		async onSubmit() {
			try {
				if (!this.enabled) {
					return;
				}

				this.loading = true;

				const params = {id: this.activeId} as {id: string, transferId?: string};
				if (this.operation === 'transfer') {
					params.transferId = this.transferId;
				}

				await this.$store.dispatch('users/deleteUser', params);

				let message = '';
				if (this.transferId) {
					const getUserById = this.$store.getters['users/getUserById'];
					const transferUser = getUserById(this.transferId);
					message = `Transferred to ${transferUser.fullName}`;
				}

				this.$showMessage({
					type: 'success',
					title: `User deleted successfully`,
					message,
				});

				this.modalBus.$emit('close');

			} catch (error) {
				this.$showError(error, 'Problem while deleting users');
			}
			this.loading = false;
		},
	},
});

</script>

<style lang="scss" module>
.content {
	padding-bottom: var(--spacing-2xs);
	> * {
		margin-bottom: var(--spacing-s);
	}
}

.innerContent {
	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.optionInput {
	padding-left: var(--spacing-l);
}
</style>
