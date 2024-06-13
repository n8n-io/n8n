<template>
	<AuthView
		:form="FORM_CONFIG"
		:form-loading="loading"
		:subtitle="inviteMessage"
		@submit="onSubmit"
	/>
</template>

<script lang="ts">
import AuthView from '@/views/AuthView.vue';
import { useToast } from '@/composables/useToast';

import { defineComponent } from 'vue';
import type { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';

export default defineComponent({
	name: 'SignupView',
	components: {
		AuthView,
	},
	setup() {
		return {
			...useToast(),
		};
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
				{
					name: 'agree',
					properties: {
						label: this.$locale.baseText('auth.agreement.label'),
						type: 'checkbox',
					},
				},
			],
		};
		return {
			FORM_CONFIG,
			loading: false,
			inviter: null as null | { firstName: string; lastName: string },
			inviterId: null as string | null,
			inviteeId: null as string | null,
		};
	},
	async mounted() {
		const inviterId = this.getQueryParameter('inviterId');
		const inviteeId = this.getQueryParameter('inviteeId');
		try {
			if (!inviterId || !inviteeId) {
				throw new Error(this.$locale.baseText('auth.signup.missingTokenError'));
			}
			this.inviterId = inviterId;
			this.inviteeId = inviteeId;

			const invite = await this.usersStore.validateSignupToken({ inviteeId, inviterId });
			this.inviter = invite.inviter as { firstName: string; lastName: string };
		} catch (e) {
			this.showError(e, this.$locale.baseText('auth.signup.tokenValidationError'));
			void this.$router.replace({ name: VIEWS.SIGNIN });
		}
	},
	computed: {
		...mapStores(useUIStore, useUsersStore),
		inviteMessage(): string {
			if (!this.inviter) {
				return '';
			}

			return this.$locale.baseText('settings.signup.signUpInviterInfo', {
				interpolate: { firstName: this.inviter.firstName, lastName: this.inviter.lastName },
			});
		},
	},
	methods: {
		async onSubmit(values: { [key: string]: string | boolean }) {
			if (!this.inviterId || !this.inviteeId) {
				this.showError(
					new Error(this.$locale.baseText('auth.signup.tokenValidationError')),
					this.$locale.baseText('auth.signup.setupYourAccountError'),
				);
				return;
			}

			try {
				this.loading = true;
				await this.usersStore.acceptInvitation({
					...values,
					inviterId: this.inviterId,
					inviteeId: this.inviteeId,
				} as {
					inviteeId: string;
					inviterId: string;
					firstName: string;
					lastName: string;
					password: string;
				});

				if (values.agree === true) {
					try {
						await this.uiStore.submitContactEmail(values.email.toString(), values.agree);
					} catch {}
				}

				await this.$router.push({ name: VIEWS.NEW_WORKFLOW });
			} catch (error) {
				this.showError(error, this.$locale.baseText('auth.signup.setupYourAccountError'));
			}
			this.loading = false;
		},
		getQueryParameter(key: 'inviterId' | 'inviteeId'): string | null {
			return !this.$route.query[key] || typeof this.$route.query[key] !== 'string'
				? null
				: (this.$route.query[key] as string);
		},
	},
});
</script>
