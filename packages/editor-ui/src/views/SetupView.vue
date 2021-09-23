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

const FORM_CONFIG = {
	title: 'Set up owner account',
	buttonText: 'Finish setup',
	inputs: [
		{
			name: 'email',
			label: 'Email',
			type: 'email',
			required: true,
			validationRules: [{name: 'VALID_EMAIL'}],
		},
		{
			name: 'firstName',
			label: 'First name',
			required: true,
		},
		{
			name: 'lastName',
			label: 'Last name',
			required: true,
		},
		{
			name: 'password',
			label: 'Password',
			type: 'password',
			required: true,
			validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
			maxlength: 64,
			infoText: 'At least 8 characters with 1 number and 1 uppercase',
		},
	],
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
				await this.$store.dispatch('users/setup', values);

				await this.$router.push({ name: 'NodeViewNew' });
			} catch (error) {
				this.$showError(error, 'Problem setting up instance', 'There was a problem setting up the instance:');
			}
			this.loading = false;
		},
	},
});
</script>
