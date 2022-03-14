<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		@submit="onSubmit"
		@secondaryClick="showSkipConfirmation"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { IFormBoxConfig } from '@/Interface';
import { VIEWS } from '@/constants';
import { restApi } from '@/components/mixins/restApi';


export default mixins(
	showMessage,
	restApi,
).extend({
	name: 'SetupView',
	components: {
		AuthView,
	},
	async mounted() {
		const getAllCredentialsPromise = this.getAllCredentials();
		const getAllWorkflowsPromise = this.getAllWorkflows();
		await Promise.all([getAllCredentialsPromise, getAllWorkflowsPromise]);
	},
	data() {
		const FORM_CONFIG: IFormBoxConfig = {
			title: this.$locale.baseText('settings.setup.setupOwner'),
			buttonText: this.$locale.baseText('settings.setup.next'),
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
			workflowsCount: 0,
			credentialsCount: 0,
		};
	},
	methods: {
		async getAllCredentials() {
			const credentials = await this.$store.dispatch('credentials/fetchAllCredentials');
			this.credentialsCount = credentials.length;
		},
		async getAllWorkflows() {
			const workflows = await this.restApi().getWorkflows();
			this.workflowsCount = workflows.length;
		},
		async confirmSetupOrSkip(): Promise<boolean> {
			if (this.workflowsCount === 0 && this.credentialsCount === 0) {
				return true;
			}

			const workflows = this.workflowsCount > 0 ? this.$locale.baseText(this.workflowsCount === 1 ? 'settings.setup.showSkipConfirmation.oneWorkflowCount' : 'settings.setup.showSkipConfirmation.workflowsCount', { interpolate: { count: this.workflowsCount } }) : '';
			const credentials = this.credentialsCount > 0 ? this.$locale.baseText(this.credentialsCount === 1? 'settings.setup.showSkipConfirmation.oneCredentialCount' : 'settings.setup.showSkipConfirmation.credentialsCount', { interpolate: { count: this.credentialsCount } }) : '';

			const entities = workflows && credentials ? this.$locale.baseText('settings.setup.showSkipConfirmation.concatEntities', {interpolate: { workflows, credentials }}) : (workflows || credentials);
			return await this.confirmMessage(
				this.$locale.baseText('settings.setup.confirmOwnerSetupMessage', {
					interpolate: {
						entities,
					},
				}),
				this.$locale.baseText('settings.setup.confirmOwnerSetup'),
				null,
				this.$locale.baseText('settings.setup.continue'),
				this.$locale.baseText('settings.setup.skipSetup'),
			);
		},
		async onSubmit(values: {[key: string]: string}) {
			try {
				const confirmSetup = await this.confirmSetupOrSkip();
				if (!confirmSetup) {
					this.onSkip();
					return;
				}

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
				this.$showError(error, this.$locale.baseText('settings.setup.settingUpOwnerError'));
			}
			this.loading = false;
		},
		async showSkipConfirmation() {
			const skip = await this.confirmMessage(
				this.$locale.baseText('settings.setup.ownerAccountBenefits'),
				this.$locale.baseText('settings.setup.skipOwnerSetupQuestion'),
				null,
				this.$locale.baseText('settings.setup.skipSetup'),
				this.$locale.baseText('settings.goBack'),
			);
			if (skip) {
				this.onSkip();
			}
		},
		onSkip() {
			this.$store.dispatch('users/skipOwnerSetup');
			this.$router.push({
				name: VIEWS.HOMEPAGE,
			});
		},
	},
});
</script>
