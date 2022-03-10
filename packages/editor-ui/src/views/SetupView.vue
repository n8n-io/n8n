<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSubmit"
		@secondaryClick="onSkip"
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
	name: 'SetupView',
	components: {
		AuthView,
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('settings.setup.setupOwner'),
			buttonText: this.$locale.baseText('auth.setup.next'),
			secondaryButtonText: this.$locale.baseText('settings.setup.skipSetupTemporarily'),
			inputs: [
				{
					name: 'email',
					properties: {
						label: this.$locale.baseText('auth.email'),
						type: 'email',
						required: true,
						validationRules: [{ name: 'VALID_EMAIL' }],
						autocomplete: 'email',
						capitalize: true,
					},
				},
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
						required: true,
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
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
		};
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				const forceRedirectedHere = this.$store.getters['settings/showSetupPage'];
				this.loading = true;
				await this.$store.dispatch('users/createOwner', values);
				if (forceRedirectedHere) {
					await this.$router.push({ name: VIEWS.HOMEPAGE });
				}
				else {
					await this.$router.push({ name: VIEWS.USERS_SETTINGS });
				}

			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.setup.settingUpOwnerError'));
			}
			this.loading = false;
		},
		async onSkip() {
			const skip = await this.confirmMessage(
				this.$locale.baseText('auth.setup.ownerAccountBenefits'),
				this.$locale.baseText('settings.setup.skipOwnerSetupQuestion'),
				null,
				this.$locale.baseText('settings.setup.skipSetup'),
				this.$locale.baseText('settings.goBack'),
			);
			if (skip) {
				this.$store.dispatch('users/skipOwnerSetup');
				this.$router.push({
					name: VIEWS.HOMEPAGE,
				});
			}
		},
	},
});
</script>
