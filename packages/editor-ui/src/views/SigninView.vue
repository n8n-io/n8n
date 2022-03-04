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

export default mixins(
	showMessage,
).extend({
	name: 'SigninView',
	components: {
		AuthView,
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('SIGN_IN'),
			buttonText: this.$locale.baseText('SIGN_IN'),
			redirectText: this.$locale.baseText('FORGOT_MY_PASSWORD'),
			redirectLink: '/forgot-password',
			inputs: [
				{
					name: 'email',
					properties: {
						label: this.$locale.baseText('EMAIL'),
						type: 'email',
						required: true,
						validationRules: [{ name: 'VALID_EMAIL' }],
						showRequiredAsterisk: false,
						validateOnBlur: false,
						autocomplete: 'email',
					},
				},
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('PASSWORD'),
						type: 'password',
						required: true,
						showRequiredAsterisk: false,
						validateOnBlur: false,
						autocomplete: 'current-password',
					},
				},
			],
		};

		return {
			FORM_CONFIG,
			loading: false,
		};
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/loginWithCreds', values);
				this.clearAllStickyNotifications();
				this.loading = false;

				if (typeof this.$route.query.redirect === 'string') {
					const redirect = decodeURIComponent(this.$route.query.redirect);
					if (redirect.startsWith('/')) { // protect against phishing
						this.$router.push(redirect);

						return;
					}
				}

				this.$router.push({ name: 'Homepage' });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('LOGIN_ERROR'));
				this.loading = false;
			}
		},
	},
});
</script>
