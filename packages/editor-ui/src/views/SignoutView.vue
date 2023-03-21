<script lang="ts">
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'SignoutView',
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
