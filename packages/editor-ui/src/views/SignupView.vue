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
	title: 'Set up your account',
	buttonText: 'Finish account setup',
	inputs: [
		{
			name: 'firstName',
			label: 'First name',
			required: true,
		},
		{
			name: 'lastName',
			label: 'Last name',
			required: true,
		},
		{
			name: 'password',
			label: 'Password',
			type: 'password',
			required: true,
		},
	],
};

export default mixins(
	showMessage,
).extend({
	name: 'SignupView',
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
				await this.$store.dispatch('auth/signup', values);

				await this.$router.push({ name: 'LoginView' });
			} catch (error) {
				this.$showError(error, 'Problem setting up your account', 'There was a problem setting up your account:');
			}
			this.loading = false;
		},
	},
});
</script>
