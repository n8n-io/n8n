<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSetup"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';

const FORM_CONFIG = {
	title: 'Set up n8n',
	buttonText: 'Finish setup',
	inputs: [
		{
			name: 'email',
			label: 'Owner Email',
			type: 'email',
			required: true,
		},
		{
			name: 'firstName',
			label: 'Owner first name',
			required: true,
		},
		{
			name: 'lastName',
			label: 'Owner last name',
			required: true,
		},
		{
			name: 'password',
			label: 'Owner password',
			type: 'password',
			required: true,
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
		async onSetup(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('auth/setup', values);

				await this.$router.push({ name: 'LoginView' });
			} catch (error) {
				this.$showError(error, 'Problem setting up instance', 'There was a problem setting up the instance:');
			}
			this.loading = false;
		},
	},
});
</script>
