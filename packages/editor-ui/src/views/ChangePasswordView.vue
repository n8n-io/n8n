<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSetup"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

const FORM_CONFIG = {
	title: 'Change Password',
	buttonText: 'Change Password',
	redirectText: 'Sign in',
	redirectLink: '/login',
	inputs: [
		{
			name: 'password',
			placeholder: 'New password',
			type: 'password',
			required: true,
		},
		{
			name: 'password2',
			placeholder: 'Re-enter new password',
			type: 'password',
			required: true,
		},
	],
};

export default mixins(
	showMessage,
).extend({
	name: 'ChangePassword',
	components: {
		AuthView,
	},
	data() {
		return {
			FORM_CONFIG,
			loading: false,
		};
	},
	methods: {
		async onSetup(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('auth/changePassword', values);

				this.$showMessage({
					type: 'success',
					title: 'Password reset successfully',
					message: 'You can now sign in with your new password',
				});

				await this.$router.push({ name: 'LoginView' });
			} catch (error) {
				this.$showError(error, 'Problem changing the password', 'There was a problem while trying to change the password:');
			}
			this.loading = false;
		},
	},
});
</script>
