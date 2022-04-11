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
import { VIEWS } from '@/constants';

export default mixins(
	showMessage,
).extend({
	name: 'SignupView',
	components: {
		AuthView,
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('auth.signup.setupYourAccount'),
			buttonText: this.$locale.baseText('auth.signup.finishAccountSetup'),
			inputs: [
				{
					name: 'firstName',
					properties: {
						label: this.$locale.baseText('auth.firstName'),
						maxlength: 32,
						required: true,
						autocomplete: 'given-name',
						capitalize: true,
					},
				},
				{
					name: 'lastName',
					properties: {
						label: this.$locale.baseText('auth.lastName'),
						maxlength: 32,
						required: true,
						autocomplete: 'family-name',
						capitalize: true,
					},
				},
				{
					name: 'password',
					properties: {
						label: this.$locale.baseText('auth.password'),
						type: 'password',
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
						required: true,
						infoText: this.$locale.baseText('auth.defaultPasswordRequirements'),
						autocomplete: 'new-password',
						capitalize: true,
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
				throw new Error(this.$locale.baseText('auth.signup.missingTokenError'));
			}

			const invite = await this.$store.dispatch('users/validateSignupToken', { inviterId, inviteeId});
			this.inviter = invite.inviter as {firstName: string, lastName: string};
		} catch (e) {
			this.$showError(e, this.$locale.baseText('auth.signup.tokenValidationError'));
			this.$router.replace({name: VIEWS.SIGNIN});
		}
	},
	computed: {
		inviteMessage(): null | string {
			if (!this.inviter) {
				return null;
			}

			return this.$locale.baseText(
				'settings.signup.signUpInviterInfo',
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

				await this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.signup.setupYourAccountError'));
			}
			this.loading = false;
		},
	},
});
</script>
