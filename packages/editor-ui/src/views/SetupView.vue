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
			title: this.$locale.baseText('auth.setup.setupOwner'),
			buttonText: this.$locale.baseText('auth.setup.next'),
			secondaryButtonText: this.$locale.baseText('auth.setup.skipSetupTemporarily'),
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
		async confirmSetupOrGoBack(): Promise<boolean> {
			if (this.workflowsCount === 0 && this.credentialsCount === 0) {
				return true;
			}

			const workflows = this.workflowsCount > 0
				? this.$locale.baseText(
					'auth.setup.setupConfirmation.existingWorkflows',
					{ adjustToNumber: this.workflowsCount },
				)
				: '';

			const credentials = this.credentialsCount > 0
				? this.$locale.baseText(
					'auth.setup.setupConfirmation.credentials',
					{ adjustToNumber: this.credentialsCount },
				)
				: '';

			const entities = workflows && credentials ? this.$locale.baseText('auth.setup.setupConfirmation.concatEntities', {interpolate: { workflows, credentials }}) : (workflows || credentials);
			return await this.confirmMessage(
				this.$locale.baseText('auth.setup.confirmOwnerSetupMessage', {
					interpolate: {
						entities,
					},
				}),
				this.$locale.baseText('auth.setup.confirmOwnerSetup'),
				null,
				this.$locale.baseText('auth.setup.createAccount'),
				this.$locale.baseText('auth.setup.goBack'),
			);
		},
		async onSubmit(values: {[key: string]: string | boolean}) {
			try {
				const confirmSetup = await this.confirmSetupOrGoBack();
				if (!confirmSetup) {
					return;
				}

				const forceRedirectedHere = this.$store.getters['settings/showSetupPage'];
				this.loading = true;
				await this.$store.dispatch('users/createOwner', values);

				if (values.agree === true) {
					try {
						await this.$store.dispatch('ui/submitContactEmail', { email: values.email, agree: values.agree });
					} catch { }
				}

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
		async showSkipConfirmation() {
			const skip = await this.confirmMessage(
				this.$locale.baseText('auth.setup.ownerAccountBenefits'),
				this.$locale.baseText('auth.setup.skipOwnerSetupQuestion'),
				null,
				this.$locale.baseText('auth.setup.skipSetup'),
				this.$locale.baseText('auth.setup.goBack'),
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
