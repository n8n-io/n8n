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


export default mixins(
	showMessage,
).extend({
	name: 'SetupView',
	components: {
		AuthView,
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('SET_UP_OWNER'),
			buttonText: this.$locale.baseText('NEXT'),
			secondaryButtonText: this.$locale.baseText('SKIP_SETUP_TEMPORARILY'),
			inputs: [
				{
					name: 'email',
					properties: {
						label: this.$locale.baseText('EMAIL'),
						type: 'email',
						required: true,
						validationRules: [{ name: 'VALID_EMAIL' }],
						autocomplete: 'email',
					},
				},
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
						required: true,
						validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
						infoText: this.$locale.baseText('DEFAULT_PASSWORD_REQUIREMENTS'),
						autocomplete: 'new-password',
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
					await this.$router.push({ name: 'Homepage' });
				}
				else {
					await this.$router.push({ name: 'UsersSettings' });
				}

			} catch (error) {
				this.$showError(error, this.$locale.baseText('SETTING_UP_OWNER_ERROR'));
			}
			this.loading = false;
		},
		async onSkip() {
			const skip = await this.confirmMessage(
				this.$locale.baseText('OWNER_ACCOUNT_BENEFITS_MESSAGE'),
				this.$locale.baseText('SKIP_OWNER_SETUP_QUESTION'),
				null,
				this.$locale.baseText('SKIP_SETUP'),
				this.$locale.baseText('GO_BACK'),
			);
			if (skip) {
				this.$store.dispatch('settings/skipOwnerSetup');
				this.$router.push({
					name: 'Homepage',
				});
			}
		},
	},
});
</script>
