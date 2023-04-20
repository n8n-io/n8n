<script lang="ts">
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { showMessage } from '@/mixins/showMessage';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'SignoutView',
	mixins: [showMessage],
	computed: {
		...mapStores(useUsersStore),
	},
	methods: {
		async logout() {
			try {
				await this.usersStore.logout();
				this.$router.replace({ name: VIEWS.SIGNIN });
			} catch (e) {
				this.$showError(e, this.$locale.baseText('auth.signout.error'));
			}
		},
	},
	mounted() {
		this.logout();
	},
});
</script>

<template>
	<div />
</template>
