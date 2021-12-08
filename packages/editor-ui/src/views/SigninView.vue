<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';

const FORM_CONFIG: IFormBoxConfig = {
	title: 'Sign in',
	buttonText: 'Sign in',
	redirectText: 'Forgot my password',
	redirectLink: '/forgot-password',
	inputs: [[
		{
			name: 'email',
			properties: {
				label: 'Email',
				type: 'email',
				required: true,
				validationRules: [{name: 'VALID_EMAIL'}],
				showRequiredAsterisk: false,
			},
		},
		{
			name: 'password',
			properties: {
				label: 'Password',
				type: 'password',
				required: true,
				validationRules: [{name: 'MIN_LENGTH', config: {minimum: 8}}],
				showRequiredAsterisk: false,
			},
		},
	]],
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
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/login', values);
				this.loading = false;

				if (typeof this.$route.query.redirect === 'string') {
					const redirect = decodeURIComponent(this.$route.query.redirect);
					if (redirect.startsWith('/')) { // protect against phishing
						this.$router.push(redirect);

						return;
					}
				}

				this.$router.push({ name: 'NodeViewNew' });
			} catch (error) {
				this.$showError(error, 'Problem logging in');
				this.loading = false;
			}
		},
	},
});
</script>
