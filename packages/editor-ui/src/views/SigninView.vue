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
	title: 'Sign in to ACME Corp',
	buttonText: 'Sign in',
	redirectText: 'Forgot my password',
	redirectLink: '/forgot-password',
	inputs: [
		{
			name: 'email',
			placeholder: 'Email',
			type: 'email',
			required: true,
		},
		{
			name: 'password',
			placeholder: 'Password',
			type: 'password',
			required: true,
		},
	],
};

export default mixins(
	showMessage,
).extend({
	name: 'SigninView',
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
				await this.$store.dispatch('auth/login', values);

				await this.$router.push({ name: 'NodeViewNew' });
			} catch (error) {
				this.$showError(error, 'Problem loging in', 'There was a problem while trying to login:');
			}
			this.loading = false;
		},
	},
});
</script>
