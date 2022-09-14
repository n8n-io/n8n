<template>
	<div :class="$style.container">
		<n8n-info-tip :bold="false" class="mb-s">
			<template v-if="credentialPermissions.isOwner">
				{{ $locale.baseText('credentialEdit.credentialSharing.info.owner') }}
			</template>
			<template v-else>
				{{ $locale.baseText('credentialEdit.credentialSharing.info.sharee', { interpolate: { credentialOwnerName } }) }}
			</template>
		</n8n-info-tip>
		<n8n-info-tip :bold="false" v-if="!credentialPermissions.isOwner && credentialPermissions.isInstanceOwner">
			{{ $locale.baseText('credentialEdit.credentialSharing.info.instanceOwner') }}
		</n8n-info-tip>
		<n8n-user-select
			v-if="credentialPermissions.updateSharing"
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
			:readonly="!credentialPermissions.updateSharing"
			@delete="onRemoveSharee"
		/>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import {IUser} from "@/Interface";
import mixins from "vue-typed-mixins";
import {showMessage} from "@/components/mixins/showMessage";

export default mixins(
	showMessage,
).extend({
	name: 'CredentialSharing',
	props: ['credential', 'credentialId', 'credentialData', 'sharedWith', 'credentialPermissions'],
	computed: {
		...mapGetters('users', ['allUsers', 'currentUser']),
		usersList(): IUser[] {
			return this.allUsers.filter((user: IUser) => {
				const isCurrentUser = user.id === this.currentUser.id;
				const isAlreadySharedWithUser = (this.credentialData.sharedWith || []).find((sharee: IUser) => sharee.id === user.id);

				return !isCurrentUser && !isAlreadySharedWithUser;
			});
		},
		sharedWithList(): IUser[] {
			return [
				{
					...(this.credential ? this.credential.ownedBy : this.currentUser),
					isOwner: true,
				},
			].concat(this.credentialData.sharedWith || []);
		},
		credentialOwnerName(): string {
			return this.$store.getters['credentials/getCredentialOwnerName'](this.credentialId);
		},
	},
	methods: {
		async onAddSharee(userId: string) {
			const { id, firstName, lastName, email } = this.$store.getters['users/getUserById'](userId);
			const sharee = { id, firstName, lastName, email };

			this.$emit('change', (this.credentialData.sharedWith || []).concat(sharee));
		},
		async onRemoveSharee(userId: string) {
			const user = this.$store.getters['users/getUserById'](userId);

			const confirm = await this.confirmMessage(
				this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.message', { interpolate: { name: user.fullName } }),
				this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.title'),
				null,
				this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.confirmButtonText'),
				this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.cancelButtonText'),
			);

			if (confirm) {
				this.$emit('change', this.credentialData.sharedWith.filter((sharee: IUser) => {
					return sharee.id !== user.id;
				}));
			}
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
