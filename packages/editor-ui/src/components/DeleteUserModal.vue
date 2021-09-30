<template>
	<Modal
		:name="modalName"
		@enter="onSubmit"
		:title="title"
		:center="true"
		minWidth="460px"
		maxWidth="460px"
		:eventBus="modalBus"
	>
		<template slot="content">
			<div>
				<div :class="$style.content">
					<div><n8n-text color="base">What should we do with their data?</n8n-text></div>
					<el-radio :value="operation" label="transfer" @change="() => setOperation('transfer')">
						<n8n-text color="dark">Transfer their workflows and credentials to another user</n8n-text>
					</el-radio>
					<n8n-input-label label="User to transfer to" v-if="operation === 'transfer'">
						<n8n-user-select
							:users="allUsers"
							:currentUserId="currentUserId"
							:ignoreInvited="true"
							:value="transferId"
						/>
					</n8n-input-label>
					<el-radio :value="operation" label="delete" @change="() => setOperation('delete')">
						<n8n-text color="dark">Delete their workflows and credentials</n8n-text>
					</el-radio>
					<n8n-input-label label="Type “delete all data” to confirm" v-if="operation === 'delete'">
						<n8n-input :value="deleteConfirmText" placeholder="delete all data" @input="setConfirmText" />
					</n8n-input-label>
				</div>
			</div>
		</template>
		<template slot="footer">
			<n8n-button :loading="loading" :disabled="!enabled" label="Delete user" @click="onSubmit" float="right" />
		</template>
	</Modal>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";

import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import Vue from "vue";
import { IUser } from "../Interface";
import { N8nUserSelect } from 'n8n-design-system';
import { mapGetters } from "vuex";

export default mixins(showMessage).extend({
	components: {
		Modal,
		N8nUserSelect,
	},
	name: "DuplicateWorkflow",
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
		};
	},
	computed: {
		...mapGetters('users', ['allUsers', 'currentUserId']),
		userToDelete(): IUser {
			const getUserById = this.$store.getters['users/getUserById'];
			return getUserById(this.activeId);
		},
		title(): string {
			return `Delete ${this.userToDelete.firstName} ${this.userToDelete.lastName}`;
		},
		enabled(): boolean {
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
		},
		setConfirmText(text: string) {
			this.deleteConfirmText = text;
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

				let message = `User has been deleted successfully`;
				if (this.transferId) {
					const getUserById = this.$store.getters['users/getUserById'];
					const transferUser = getUserById(this.transferId);
					message = `${message} and transferred to ${transferUser.firstName} ${transferUser.lastName}`;
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
</style>
