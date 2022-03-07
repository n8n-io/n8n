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

export default mixins(
	showMessage,
).extend({
	name: 'SignupView',
	components: {
		AuthView,
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('SET_UP_ACCOUNT'),
			buttonText: this.$locale.baseText('FINISH_ACCOUNT_SETUP'),
			inputs: [
				{
					name: 'firstName',
					properties: {
						label: this.$locale.baseText('FIRST_NAME'),
						maxlength: 32,
						required: true,
						autocomplete: 'given-name',
					},
				},
				{
					name: 'lastName',
					properties: {
						label: this.$locale.baseText('LAST_NAME'),
						maxlength: 32,
						required: true,
						autocomplete: 'family-name',
					},
				},
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('PASSWORD'),
						type: 'password',
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
						required: true,
						infoText: this.$locale.baseText('DEFAULT_PASSWORD_REQUIREMENTS'),
						autocomplete: 'new-password',
					},
				},
			],
		};
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
				throw new Error(this.$locale.baseText('MISSING_INVITE_TOKEN_ERROR'));
			}

			const invite = await this.$store.dispatch('users/validateSignupToken', { inviterId, inviteeId});
			this.inviter = invite.inviter as {firstName: string, lastName: string};
		} catch (e) {
			this.$showError(e, this.$locale.baseText('TOKEN_VALIDATION_ERROR'));
		}
	},
	computed: {
		inviteMessage(): null | string {
			if (!this.inviter) {
				return null;
			}

			return this.$locale.baseText(
				'SIGN_UP_INVITER_INFO',
				{ interpolate: { firstName: this.inviter.firstName, lastName: this.inviter.lastName }},
			);
		},
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				const inviterId = this.$route.query.inviterId;
				const inviteeId = this.$route.query.inviteeId;
				await this.$store.dispatch('users/signup', {...values, inviterId, inviteeId});

				await this.$router.push({ name: 'Homepage' });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('SET_UP_ACCOUNT_ERROR'));
			}
			this.loading = false;
		},
	},
});
</script>
