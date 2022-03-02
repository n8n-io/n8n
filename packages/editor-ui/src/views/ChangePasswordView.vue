<template>
	<AuthView
		v-if="config"
		:form="config"
		:formLoading="loading"
		@submit="onSubmit"
		@input="onInput"
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
	name: 'ChangePasswordView',
	components: {
		AuthView,
	},
	data() {
		return {
			password: '',
			loading: false,
			config: null as null | IFormBoxConfig,
		};
	},
	async mounted() {
		this.config = {
			title: this.$locale.baseText('CHANGE_PASSWORD'),
			buttonText: this.$locale.baseText('CHANGE_PASSWORD'),
			redirectText: this.$locale.baseText('SIGN_IN'),
			redirectLink: '/signin',
			inputs: [
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('NEW_PASSWORD'),
						type: 'password',
						required: true,
						validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
						infoText: this.$locale.baseText('DEFAULT_PASSWORD_REQUIREMENTS'),
						autocomplete: 'new-password',
					},
				},
				{
					name: 'password2',
					properties: {
						label: this.$locale.baseText('REENTER_NEW_PASSWORD'),
						type: 'password',
						required: true,
						validators: {
							TWO_PASSWORDS_MATCH: {
								validate: this.passwordsMatch,
							},
						},
						validationRules: [{name: 'TWO_PASSWORDS_MATCH'}],
						autocomplete: 'new-password',
					},
				},
			],
		};

		const token = this.$route.query.token;
		const userId = this.$route.query.userId;
		try {
			if (!token) {
				throw new Error(this.$locale.baseText('MISSING_TOKEN_ERROR'));
			}
			if (!userId) {
				throw new Error(this.$locale.baseText('MISSING_USERID_ERROR'));
			}

			await this.$store.dispatch('users/validatePasswordToken', {token, userId});
		} catch (e) {
			this.$showError(e, this.$locale.baseText('TOKEN_VALIDATION_ERROR'));
		}
	},
	methods: {
		passwordsMatch(value: string) {
			if (value !== this.password) {
				throw new Error(this.$locale.baseText('PASSWORDS_MUST_MATCH_ERROR'));
			}
		},
		onInput(e: {name: string, value: string}) {
			if (e.name === 'password') {
				this.password = e.value;
			}
		},
		async onSubmit() {
			try {
				this.loading = true;
				const token = this.$route.query.token;
				const userId = this.$route.query.userId;
				await this.$store.dispatch('users/changePassword', {token, userId, password: this.password});

				this.$showMessage({
					type: 'success',
					title: this.$locale.baseText('PASSWORD_UPDATE_SUCCESS'),
					message: this.$locale.baseText('PASSWORD_UPDATE_SUCCESS_MESSAGE'),
				});

				await this.$router.push({ name: 'SigninView' });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('PASSWORD_UPDATE_ERROR'));
			}
			this.loading = false;
		},
	},
});
</script>
