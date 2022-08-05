<template>
	<div :class="$style.container">
		<n8n-info-tip :bold="false">
			{{ $locale.baseText('credentialEdit.credentialSharing.info') }}
		</n8n-info-tip>
		<n8n-user-select
			size="large"
			:users="usersList"
			:currentUserId="currentUserId"
			:placeholder="$locale.baseText('credentialEdit.credentialSharing.select.placeholder')"
			@input="onAddSharee"
		>
			<template #prefix>
				<n8n-icon icon="search" />
			</template>
		</n8n-user-select>
		<n8n-users-list
			:users="sharedWith"
			:currentUserId="currentUserId"
			:delete-label="$locale.baseText('credentialEdit.credentialSharing.list.delete')"
			@delete="onRemoveSharee"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import { N8nUserSelect, N8nUsersList } from 'n8n-design-system';
import {IUser} from "@/Interface";

export default Vue.extend({
	name: 'CredentialSharing',
	components: {
		N8nUserSelect,
		N8nUsersList,
	},
	props: ['currentCredential'],
	computed: {
		...mapGetters('users', ['allUsers', 'currentUserId']),
		usersList(): IUser[] {
			return this.allUsers; // @TODO Remove
			return this.allUsers.filter((user: IUser) => {
				return user.id !== this.currentUserId;
			});
		},
		sharedWith(): IUser[] {
			return this.currentCredential.sharedWith || [
				...this.allUsers,
				{
					id: '124241',
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@doe.com',
				},
			];
		},
	},
	methods: {
		async onAddSharee(userId: string) {
			await this.$store.dispatch('credentials/addCredentialSharee', {
				credentialId: this.currentCredential.id,
				userId,
			});
		},
		async onRemoveSharee(userId: string) {
			await this.$store.dispatch('credentials/removeCredentialSharee', {
				credentialId: this.currentCredential.id,
				userId,
			});
		},
		async loadUsers() {
			await this.$store.dispatch('users/fetchUsers');
		},
	},
	mounted() {
		this.loadUsers();
	},
});
</script>

<style lang="scss" module>
.container {
	width: 100%;
	> * {
		margin-bottom: var(--spacing-l);
	}
}
</style>
