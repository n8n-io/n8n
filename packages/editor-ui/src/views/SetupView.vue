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

const FORM_CONFIG: IFormBoxConfig = {
	title: 'Set up owner account',
	buttonText: 'Finish setup',
	secondaryButtonText: 'Skip setup',
	inputs: [[
		{
			name: 'email',
			properties: {
				label: 'Email',
				type: 'email',
				required: true,
				validationRules: [{name: 'VALID_EMAIL'}],
				autocomplete: 'email',
			},
		},
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
				required: true,
				validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
				infoText: 'At least 8 characters with 1 number and 1 uppercase',
				autocomplete: 'new-password',
			},
		},
	]],
};

export default mixins(
	showMessage,
).extend({
	name: 'SetupView',
	components: {
		AuthView,
	},
	data() {
		return {
			FORM_CONFIG,
			loading: false,
		};
	},
	methods: {
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/createOwner', values);

				await this.$router.push({ name: 'NodeViewNew' });
			} catch (error) {
				this.$showError(error, 'Problem setting up instance', 'There was a problem setting up the instance:');
			}
			this.loading = false;
		},
		async onSkip() {
			const skip = await this.confirmMessage(
				'By setting up an owner account, you can invite other users to join your instance. It also ensures your instance can’t be accessed without an account.',
				'Skip owner account setup?',
				null,
				'Skip setup',
				'Go back',
			);
			if (skip) {
				this.$router.push({
					name: 'NodeViewNew',
				});
			}
		},
	},
});
</script>
