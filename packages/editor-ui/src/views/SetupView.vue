<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSubmit"
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
	inputs: [[
		{
			name: 'email',
			properties: {
				label: 'Email',
				type: 'email',
				required: true,
				validationRules: [{name: 'VALID_EMAIL'}],
			},
		},
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
				required: true,
				validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
				infoText: 'At least 8 characters with 1 number and 1 uppercase',
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
	},
});
</script>
