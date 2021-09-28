<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		:subtitle="inviteMessage"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';

const FORM_CONFIG: IFormBoxConfig = {
	title: 'Set up your account',
	buttonText: 'Finish account setup',
	inputs: [[
		{
			name: 'firstName',
			properties: {
				label: 'First name',
				maxlength: 32,
				required: true,
			},
		},
		{
			name: 'lastName',
			properties: {
				label: 'Last name',
				maxlength: 32,
				required: true,
			},
		},
		{
			name: 'password',
			properties: {
				label: 'Password',
				type: 'password',
				validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
				required: true,
				infoText: 'At least 8 characters with 1 number and 1 uppercase',
			},
		},
	]],
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
			inviter: null as null | {firstName: string, lastName: string},
		};
	},
	async mounted() {
		const token = this.$route.query.token;
		try {
			if (!token) {
				throw new Error('Missing invite token');
			}

			const invite = await this.$store.dispatch('users/validateSignupToken', {token});
			this.inviter = invite.inviter;
		} catch (e) {
			this.$showError(e, 'Issue validating invite token');
		}
	},
	computed: {
		inviteMessage(): null | string {
			if (!this.inviter) {
				return null;
			}

			return `${this.inviter.firstName} ${this.inviter.lastName} has invited you to n8n`;
		},
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/signup', values);

				await this.$router.push({ name: 'SigninView' });
			} catch (error) {
				this.$showError(error, 'Problem setting up your account', 'There was a problem setting up your account:');
			}
			this.loading = false;
		},
	},
});
</script>
