<template>
	<div :class="$style.container">
		<n8n-info-tip :bold="false">
			<template v-if="isOwner">
				{{ $locale.baseText('credentialEdit.credentialSharing.info.owner') }}
			</template>
			<template v-else>
				{{ $locale.baseText('credentialEdit.credentialSharing.info.sharee', { interpolate: { ownerName } }) }}
			</template>
		</n8n-info-tip>
		<n8n-user-select
			v-if="isOwner"
			size="large"
			:users="usersList"
			:currentUserId="currentUser.id"
			:placeholder="$locale.baseText('credentialEdit.credentialSharing.select.placeholder')"
			@input="onAddSharee"
		>
			<template #prefix>
				<n8n-icon icon="search" />
			</template>
		</n8n-user-select>
		<n8n-users-list
			:users="sharedWithList"
			:currentUserId="currentUser.id"
			:delete-label="$locale.baseText('credentialEdit.credentialSharing.list.delete')"
			:readonly="!isOwner"
			@delete="onRemoveSharee"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import {IUser} from "@/Interface";

export default Vue.extend({
	name: 'CredentialSharing',
	props: ['credential', 'sharedWith', 'temporary', 'isOwner'],
	computed: {
		...mapGetters('users', ['allUsers', 'currentUser']),
		usersList(): IUser[] {
			return this.allUsers.filter((user: IUser) => {
				const isCurrentUser = user.id === this.currentUser.id;
				const isAlreadySharedWithUser = (this.credential.sharedWith || []).find((sharee: IUser) => sharee.id === user.id);

				return !isCurrentUser && !isAlreadySharedWithUser;
			});
		},
		sharedWithList(): IUser[] {
			return [
				this.credential.ownedBy || this.currentUser,
			].concat(this.credential.sharedWith || []);
		},
		ownerName(): string {
			return this.credential.ownedBy && this.credential.ownedBy.firstName
				? `${this.credential.ownedBy.firstName} ${this.credential.ownedBy.lastName}`
				: this.$locale.baseText('credentialEdit.credentialSharing.info.sharee.fallback');
		},
	},
	methods: {
		async onAddSharee(userId: string) {
			const user = this.$store.getters['users/getUserById'](userId);

			if (this.temporary) {
				this.$emit('change', (this.credential.sharedWith || []).concat(user));
				return;
			}

			await this.$store.dispatch('credentials/addCredentialSharee', {
				credentialId: this.credential.id,
				user,
			});
		},
		async onRemoveSharee(userId: string) {
			const user = this.$store.getters['users/getUserById'](userId);

			if (this.temporary) {
				this.$emit('change', this.credential.sharedWith.filter((sharee: IUser) => {
					return sharee.id !== user.id;
				}));
				return;
			}

			await this.$store.dispatch('credentials/removeCredentialSharee', {
				credentialId: this.credential.id,
				user,
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
