<script lang="ts">
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { defineComponent } from 'vue';
import { useToast } from '@/composables/useToast';

export default defineComponent({
	name: 'SignoutView',
	setup() {
		return {
			...useToast(),
		};
	},
	computed: {
		...mapStores(useUsersStore),
	},
	mounted() {
		void this.logout();
	},
	methods: {
		async logout() {
			try {
				await this.usersStore.logout();
				window.location.href = this.$router.resolve({ name: VIEWS.SIGNIN }).href;
			} catch (e) {
				this.showError(e, this.$locale.baseText('auth.signout.error'));
			}
		},
	},
});
</script>

<template>
	<div />
</template>
