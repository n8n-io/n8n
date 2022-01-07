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
				autocomplete: 'given-name',
			},
		},
		{
			name: 'lastName',
			properties: {
				label: 'Last name',
				maxlength: 32,
				required: true,
				autocomplete: 'family-name',
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
				autocomplete: 'new-password',
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
		const inviterId = this.$route.query.inviterId;
		const inviteeId = this.$route.query.inviteeId;
		try {
			if (!inviterId || !inviteeId) {
				throw new Error('Missing invite token');
			}

			const invite = await this.$store.dispatch('users/validateSignupToken', {inviterId, inviteeId});
			this.inviter = invite.inviter as {firstName: string, lastName: string};
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
				const inviterId = this.$route.query.inviterId;
				const inviteeId = this.$route.query.inviteeId;
				await this.$store.dispatch('users/signup', {...values, inviterId, inviteeId});

				await this.$router.push({ name: 'SigninView' });
			} catch (error) {
				this.$showError(error, 'Problem setting up your account', 'There was a problem setting up your account:');
			}
			this.loading = false;
		},
	},
});
</script>
