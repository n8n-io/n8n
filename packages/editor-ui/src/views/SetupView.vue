<template>
	<AuthView
		:form="FORM_CONFIG"
		:formLoading="loading"
		data-test-id="setup-form"
		@submit="onSubmit"
		@secondaryClick="showSkipConfirmation"
	/>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { defineComponent } from 'vue';

import { useToast, useMessage } from '@/composables';
import type { IFormBoxConfig } from '@/Interface';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useCredentialsStore } from '@/stores/credentials.store';

export default defineComponent({
	name: 'SetupView',
	components: {
		AuthView,
	},
	setup() {
		return {
			...useToast(),
			...useMessage(),
		};
	},
	async mounted() {
		const { credentials, workflows } = await this.usersStore.preOwnerSetup();
		this.credentialsCount = credentials;
		this.workflowsCount = workflows;
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
	computed: {
		...mapStores(useCredentialsStore, useSettingsStore, useUIStore, useUsersStore),
	},
	methods: {
		async confirmSetupOrGoBack(): Promise<boolean> {
			if (this.workflowsCount === 0 && this.credentialsCount === 0) {
				return true;
			}

			const workflows =
				this.workflowsCount > 0
					? this.$locale.baseText('auth.setup.setupConfirmation.existingWorkflows', {
							adjustToNumber: this.workflowsCount,
					  })
					: '';

			const credentials =
				this.credentialsCount > 0
					? this.$locale.baseText('auth.setup.setupConfirmation.credentials', {
							adjustToNumber: this.credentialsCount,
					  })
					: '';

			const entities =
				workflows && credentials
					? this.$locale.baseText('auth.setup.setupConfirmation.concatEntities', {
							interpolate: { workflows, credentials },
					  })
					: workflows || credentials;
			const confirm = await this.confirm(
				this.$locale.baseText('auth.setup.confirmOwnerSetupMessage', {
					interpolate: {
						entities,
					},
				}),
				this.$locale.baseText('auth.setup.confirmOwnerSetup'),
				{
					confirmButtonText: this.$locale.baseText('auth.setup.createAccount'),
					cancelButtonText: this.$locale.baseText('auth.setup.goBack'),
				},
			);

			return confirm === MODAL_CONFIRM;
		},
		async onSubmit(values: { [key: string]: string | boolean }) {
			try {
				const confirmSetup = await this.confirmSetupOrGoBack();
				if (!confirmSetup) {
					return;
				}

				const forceRedirectedHere = this.settingsStore.showSetupPage;
				this.loading = true;
				await this.usersStore.createOwner(
					values as { firstName: string; lastName: string; email: string; password: string },
				);

				if (values.agree === true) {
					try {
						await this.uiStore.submitContactEmail(values.email.toString(), values.agree);
					} catch {}
				}

				if (forceRedirectedHere) {
					await this.$router.push({ name: VIEWS.NEW_WORKFLOW });
				} else {
					await this.$router.push({ name: VIEWS.USERS_SETTINGS });
				}
			} catch (error) {
				this.showError(error, this.$locale.baseText('auth.setup.settingUpOwnerError'));
			}
			this.loading = false;
		},
		async showSkipConfirmation() {
			const skip = await this.confirm(
				this.$locale.baseText('auth.setup.ownerAccountBenefits'),
				this.$locale.baseText('auth.setup.skipOwnerSetupQuestion'),
				{
					confirmButtonText: this.$locale.baseText('auth.setup.skipSetup'),
					cancelButtonText: this.$locale.baseText('auth.setup.goBack'),
				},
			);
			if (skip === MODAL_CONFIRM) {
				this.onSkip();
			}
		},
		onSkip() {
			void this.usersStore.skipOwnerSetup();
			void this.$router.push({
				name: VIEWS.NEW_WORKFLOW,
			});
		},
	},
});
</script>
