<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('settings.ad') }}
				</n8n-heading>
			</div>
			<!-- <div :class="$style.enableFeatureContainer">
				<span>Enable Feature</span>
				<el-switch
					v-model="adConfig.activeDirectoryLoginEnabled"
					active-color="#13ce66"
					@change="valueChanged"
				/>
			</div> -->
			<div>
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					:columnView="true"
					@input="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>

			<div>
				<n8n-button float="right" :label="$locale.baseText('settings.ad.save')" size="large" :disabled="!hasAnyChanges || !readyToSubmit" @click="onSaveClick" />
				<n8n-button float="left" :label=" loadingTestConnection ? $locale.baseText('settings.ad.testingConnection') : $locale.baseText('settings.ad.testConnection')" size="large" :disabled="hasAnyChanges || !readyToSubmit" :loading="loadingTestConnection" @click="OnTestConnectionClick" />
			</div>
		</div>
<!--
		  <el-table
		border="true"
		stripe="true"
    :data="dataTable"
    style="width: 100%"
    height="250">
    <el-table-column
      prop="status"
      label="Status"
      >
    </el-table-column>
    <el-table-column
      prop="runTime"
      label="Run Time"
     >
    </el-table-column>
    <el-table-column
      prop="details"
      label="Details"
			>
    </el-table-column>
  </el-table>
			<br>
				<div>
				<n8n-button float="left" label="Synchronize Now" size="large" :disabled="hasAnyChanges || !readyToSubmit" :loading="loadingTestConnection" @click="OnTestConnectionClick" />
			</div>
						<br>
			<br>
			<br> -->
			<div>
				<n8n-button float="left" label="Synchronize Now" size="large" :disabled="hasAnyChanges || !readyToSubmit" :loading="loadingTestConnection" @click="OnTestConnectionClick" />
			</div>
	</SettingsView>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { IActiveDirectoryConfig, IFormInputs, IUser } from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';

export default mixins(
	showMessage,
).extend({
	name: 'SettingsActiveDirectoryView',
	components: {
		SettingsView,
	},
	data() {
		return {
			// dataTable: [
			// 	{
			// 		status: "Succeeded",
			// 		runTime: "2016-05-03",
			// 		details: "Scanned 102 LDAP users",
			// 	},
			// 	{
			// 		status: "Succeeded",
			// 		runTime: "2016-05-03",
			// 		details: "Scanned 102 LDAP users",
			// 	},
			// ],
			adConfig: {} as IActiveDirectoryConfig,
			loadingTestConnection: false,
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
		};
	},
	async mounted() {
		await this.getADConfig();
	},
	computed: {
		currentUser() {
			return this.$store.getters['users/currentUser'] as IUser;
		},
	},
	methods: {
		onInput() {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: {
				loginEnaled: string,
				serverAddress: string,
				baseDn: string,
				bindingType: string,
				adminDn: string,
				adminPassword: string,
				loginId: string,
				email: string,
				lastName: string,
				firstName: string,
				username: string,
				syncronizationEnabled: string,
				useSsl: string;
				syncronizationInterval: string;
				}) {
			if (!this.hasAnyChanges) {
				return;
			}

			const newConfiguration = {
				activeDirectoryLoginEnabled: form.loginEnaled === 'true' ? true : false,
				connection: {
					url: form.serverAddress,
					useSsl: form.useSsl === 'true' ? true : false,
				},
				binding: {
					baseDn: form.baseDn,
					adminDn: form.bindingType === 'admin' ? form.adminDn : '',
					adminPassword: form.bindingType === 'admin' ? form.adminPassword : '',
				},
				attributeMapping: {
					email: form.email,
					firstName: form.firstName,
					lastName: form.lastName,
					loginId: form.loginId,
					username: form.username,
				},
				syncronization: {
					enabled: form.syncronizationEnabled === 'true' ? true : false,
					interval: parseInt(form.syncronizationInterval, 10),
				},
			};

			try {
				this.adConfig = await this.$store.dispatch('settings/updateADConfig', newConfiguration);
				this.$showToast({
					title: this.$locale.baseText('settings.ad.updateConfiguration'),
					message: '',
					type: 'success',
				});
			} catch (error) {
				// do something
			} finally {
				this.hasAnyChanges = false;
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		async OnTestConnectionClick() {
			this.loadingTestConnection = true;
			try {
				await this.$store.dispatch('settings/testADConnection');
				this.$showToast({
					title: this.$locale.baseText('settings.ad.connectionTest'),
					message: 'Connection succeeded',
					type: 'success',
				});
			} catch (error) {
				this.$showToast({
					title: this.$locale.baseText('settings.ad.connectionTestError'),
					message: error.message,
					type: 'error',
				});
			} finally {
				this.loadingTestConnection = false;
			}
		},
		async getADConfig() {
			try {
				this.adConfig = await this.$store.dispatch('settings/getADConfig');
				this.formInputs = [
					{
						name: 'loginEnaled',
						initialValue: this.adConfig.activeDirectoryLoginEnabled.toString(),
						properties: {
							type: 'select',
							label: 'Enabled Active Directory Login',
							required: true,
							options: [
								{
									label: 'True',
									value: 'true',
								},
								{
									label: 'False',
									value: 'false',
								},
							],
						},
					},
					{
						name: 'connectionInfo',
						properties: {
							label: 'Connection Details',
							type: 'info',
						},
					},
					{
						name: 'serverAddress',
						initialValue: this.adConfig.connection.url,
						properties: {
							label: 'Server Address',
							required: true,
							autocomplete: 'given-name',
							capitalize: true,
						},
					},
					{
						name: 'useSsl',
						initialValue: this.adConfig.connection.useSsl.toString(),
						properties: {
							type: 'select',
							label: 'Use SSL',
							required: true,
							options: [
								{
									label: 'True',
									value: 'true',
								},
								{
									label: 'False',
									value: 'false',
								},
							],
						},
					},
					{
						name: 'baseDn',
						initialValue: this.adConfig.binding.baseDn,
						properties: {
							label: 'Base DN',
							required: true,
							autocomplete: 'family-name',
							capitalize: true,
						},
					},
					{
						name: 'bindingType',
						initialValue: 'admin',
						properties: {
							type: 'select',
							label: 'Binding as',
							options: [
								{
									value: 'admin',
									label: 'Admin',
								},
								{
									value: 'anonymous',
									label: 'Anonymous',
								},
							],
						},
					},
					{
						name: 'adminDn',
						initialValue: this.adConfig.binding.adminDn,
						properties: {
							label: 'Binding DN',
							required: true,
							autocomplete: 'family-name',
							capitalize: true,
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin';
						},
					},
					{
						name: 'adminPassword',
						initialValue:this.adConfig.binding.adminPassword,
						properties: {
							label: 'Binding Password',
							type: 'password',
							required: true,
							capitalize: true,
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin';
						},
					},
					{
						name: 'attributeMappingInfo',
						properties: {
							label: 'Attribute Mapping',
							type: 'info',
						},
					},
					{
						name: 'username',
						initialValue: this.adConfig.attributeMapping.username,
						properties: {
							label: 'Username',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'loginId',
						initialValue: this.adConfig.attributeMapping.loginId,
						properties: {
							label: 'Login ID',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'email',
						initialValue: this.adConfig.attributeMapping.email,
						properties: {
							label: 'Email',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'firstName',
						initialValue: this.adConfig.attributeMapping.firstName,
						properties: {
							label: 'First Name',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'lastName',
						initialValue: this.adConfig.attributeMapping.lastName,
						properties: {
							label: 'Last Name',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'syncronizationInfo',
						properties: {
							label: 'Syncronization Info',
							type: 'info',
						},
					},
					{
						name: 'syncronizationEnabled',
						initialValue: this.adConfig.syncronization.enabled.toString(),
						properties: {
							type: 'select',
							label: 'Enabled Active Directory Syncronization',
							required: true,
							options: [
								{
									label: 'True',
									value: 'true',
								},
								{
									label: 'False',
									value: 'false',
								},
							],
						},
					},
					{
						name: 'syncronizationInterval',
						initialValue:this.adConfig.syncronization.interval,
						properties: {
							label: 'Syncronization Interval',
							type: 'text',
							required: true,
						},
						shouldDisplay(values): boolean {
							return values['syncronizationEnabled'] === 'true';
						},
					},
				];
			} catch (error) {
				//this.$showError(error, this.$locale.baseText('settings.api.view.error'));
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
	padding-bottom: 100px;
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
	margin-bottom: var(--spacing-1xl),
}

.enableFeatureContainer > span {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	padding: 0
}

.enableFeatureContainer {
	> * {
    padding: .5em;
  }
}

.sectionHeader {
	margin-bottom: var(--spacing-s);
}
</style>

