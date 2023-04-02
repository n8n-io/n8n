<template>
	<div>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('settings.openid') }}
				</n8n-heading>
			</div>
			<div :class="$style.settingsForm">
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					:columnView="true"
					verticalSpacing="l"
					ref="openidConfigForm"
					@input="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
			<div>
				<n8n-button
					:label="$locale.baseText('settings.openid.save')"
					size="large"
					:disabled="!hasAnyChanges || !readyToSubmit"
					@click="onSaveClick"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { showMessage } from '@/mixins/showMessage';
import { IFormInput, IFormInputs, IUser, IOpenIDConfig } from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';

type FormValues = {
	loginEnabled: boolean;
	serviceProvider: string;
	clientId: string;
	clientSecret: string;
	discoveryEndpoint: string;
	buttonName: string;
};

export default mixins(showMessage).extend({
	name: 'SettingsOpenIDView',
	components: {},
	data() {
		return {
			openidConfig: {} as IOpenIDConfig,
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
			loginEnabled: false,
		};
	},
	async mounted() {
		if (!this.isOpenIDFeatureEnabled) return;
		await this.getOpenIDConfig();
	},
	computed: {
		...mapStores(useUsersStore, useSettingsStore),
		currentUser(): null | IUser {
			return this.usersStore.currentUser;
		},
		isOpenIDFeatureEnabled(): boolean {
			return this.settingsStore.settings.enterprise.openid === true;
		},
	},
	methods: {
		onInput(input: { name: string; value: string | number | boolean }) {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(): Promise<void> {
			// We want to save all form values (incl. the hidden onces), so we are using
			// `values` data prop of the `FormInputs` child component since they are all preserved there
			const formInputs = this.$refs.openidConfigForm as (Vue & { values: FormValues }) | undefined;
			if (!this.hasAnyChanges || !formInputs) {
				return;
			}

			const newConfiguration: IOpenIDConfig = {
				loginEnabled: formInputs.values.loginEnabled,
				serviceProvider: formInputs.values.serviceProvider,
				discoveryEndpoint: formInputs.values.discoveryEndpoint,
				clientId: formInputs.values.clientId,
				clientSecret: formInputs.values.clientSecret,
				buttonName: formInputs.values.buttonName,
			};

			try {
				this.openidConfig = await this.settingsStore.updateOpenIDConfig(newConfiguration);
				this.$showToast({
					title: this.$locale.baseText('settings.openid.updateConfiguration'),
					message: '',
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.openid.configurationError'));
			} finally {
				this.hasAnyChanges = false;
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		async getOpenIDConfig() {
			try {
				this.openidConfig = await this.settingsStore.getOpenIDConfig();
				this.loginEnabled = this.openidConfig.loginEnabled;

				const whenLoginEnabled: IFormInput['shouldDisplay'] = (values) =>
					values['loginEnabled'] === true;

				const whenServiceProviderIsCustom: IFormInput['shouldDisplay'] = (values) =>
					values['serviceProvider'] === 'custom';

				this.formInputs = [
					{
						name: 'loginEnabled',
						initialValue: this.openidConfig.loginEnabled,
						properties: {
							type: 'toggle',
							label: this.$locale.baseText('settings.openid.form.loginEnabled.label'),
							required: true,
						},
					},
					{
						name: 'serviceProvider',
						initialValue: this.openidConfig.serviceProvider,
						properties: {
							type: 'select',
							label: 'Service Provider',
							options: [
								{
									label: 'Google Apps',
									value: 'google',
								},
								{
									label: 'Microsoft',
									value: 'microsoft',
								},
								{
									label: 'Custom',
									value: 'custom',
								},
							],
							required: true,
							capitalize: true,
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'buttonName',
						initialValue: this.openidConfig.buttonName,
						properties: {
							label: this.$locale.baseText('settings.openid.form.buttonName.label'),
							required: true,
							capitalize: true,
						},
						shouldDisplay: whenServiceProviderIsCustom,
					},
					{
						name: 'discoveryEndpoint',
						initialValue: this.openidConfig.discoveryEndpoint,
						properties: {
							label: this.$locale.baseText('settings.openid.form.discoveryEndpoint.label'),
							required: true,
							capitalize: true,
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'clientId',
						initialValue: this.openidConfig.clientId,
						properties: {
							label: this.$locale.baseText('settings.openid.form.clientId.label'),
							required: true,
							capitalize: true,
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'clientSecret',
						initialValue: this.openidConfig.clientSecret,
						properties: {
							label: this.$locale.baseText('settings.openid.form.clientSecret.label'),
							required: true,
							capitalize: true,
						},
						shouldDisplay: whenLoginEnabled,
					},
				];
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.openid.configurationError'));
			}
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.syncTable {
	margin-bottom: var(--spacing-2xl);
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.enableFeatureContainer {
	margin-bottom: var(--spacing-1xl);
}

.enableFeatureContainer > span {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	padding: 0;
}

.enableFeatureContainer {
	> * {
		padding: 0.5em;
	}
}

.sectionHeader {
	margin-bottom: var(--spacing-s);
}

.settingsForm {
	:global(.form-text) {
		margin-top: var(--spacing-xl);
	}
}

.docsInfoTip {
	&,
	& > div {
		margin-bottom: var(--spacing-xl);
	}
}
</style>
