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
import { showMessage } from '@/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';

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
			inviter: null as null | {firstName: string, lastName: string},
			inviterId: null as string | null,
			inviteeId: null as string | null,
		};
	},
	async mounted() {
		const inviterId = (!this.$route.query.inviterId || typeof this.$route.query.inviterId !== 'string') ? null : this.$route.query.inviterId;
		const inviteeId = (!this.$route.query.inviteeId || typeof this.$route.query.inviteeId !== 'string') ? null : this.$route.query.inviteeId;
		try {
			if (!inviterId || !inviteeId) {
				throw new Error(this.$locale.baseText('auth.signup.missingTokenError'));
			}
			this.inviterId = inviterId;
			this.inviteeId = inviteeId;

			const invite = await this.usersStore.validateSignupToken({ inviteeId, inviterId });
			this.inviter = invite.inviter as {firstName: string, lastName: string};
		} catch (e) {
			this.$showError(e, this.$locale.baseText('auth.signup.tokenValidationError'));
			this.$router.replace({name: VIEWS.SIGNIN});
		}
	},
	computed: {
		...mapStores(
			useUIStore,
			useUsersStore,
		),
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
		async onSubmit(values: {[key: string]: string | boolean}) {
			if (!this.inviterId || !this.inviteeId) {
				this.$showError(new Error(this.$locale.baseText('auth.changePassword.tokenValidationError')), this.$locale.baseText('auth.signup.setupYourAccountError'));
				return;
			}

			try {
				this.loading = true;
				await this.usersStore.signup({...values, inviterId: this.inviterId,  inviteeId: this.inviteeId} as { inviteeId: string; inviterId: string; firstName: string; lastName: string; password: string;});

				if (values.agree === true) {
					try {
						await this.uiStore.submitContactEmail(values.email.toString(), values.agree);
					} catch { }
				}

				await this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.signup.setupYourAccountError'));
			}
			this.loading = false;
		},
	},
});
</script>
