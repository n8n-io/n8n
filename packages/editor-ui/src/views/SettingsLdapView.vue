<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('settings.ldap') }}
				</n8n-heading>
			</div>
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
				<n8n-button float="right" :label="$locale.baseText('settings.ldap.save')" size="large" :disabled="!hasAnyChanges || !readyToSubmit" @click="onSaveClick" />
				<n8n-button float="left" :label=" loadingTestConnection ? $locale.baseText('settings.ldap.testingConnection') : $locale.baseText('settings.ldap.testConnection')" size="large" :disabled="hasAnyChanges || !readyToSubmit" :loading="loadingTestConnection" @click="onTestConnectionClick" />
			</div>
		</div>
		<div :class="$style.syncTable">
			<el-table
			v-loading="loadingTable"
			:border="true"
			:stripe="true"
			:data="dataTable"
			:cell-style="cellClassStyle"
			style="width: 100%"
			height="250">
			<el-table-column
				prop="status"
				:label="$locale.baseText('settings.ldap.syncronizationTable.column.status')"
				>
			</el-table-column>
			<el-table-column
				prop="endedAt"
				:label="$locale.baseText('settings.ldap.syncronizationTable.column.endedAt')"
			>
			</el-table-column>
			<el-table-column
				prop="runMode"
				:label="$locale.baseText('settings.ldap.syncronizationTable.column.runMode')"
			>
			</el-table-column>
			<el-table-column
				prop="runTime"
				:label="$locale.baseText('settings.ldap.syncronizationTable.column.runTime')"
			>
			</el-table-column>
			<el-table-column
				prop="details"
				:label="$locale.baseText('settings.ldap.syncronizationTable.column.details')"
				>
			</el-table-column>
		</el-table>
		</div>
		<div :class="$style.syncronizationActionButtons">
			<n8n-button float="right" :label="$locale.baseText('settings.ldap.dryRun')" type="secondary" size="large" :disabled="hasAnyChanges || !readyToSubmit" :loading="loadingDryRun" @click="onDryRunClick" />
			<n8n-button float="left" :label="$locale.baseText('settings.ldap.synchronizeNow')" size="large" :disabled="hasAnyChanges || !readyToSubmit" :loading="loadingLiveRun" @click="onLiveRunClick" />
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { convertToDisplayDate } from '@/components/helpers';
import { showMessage } from '@/components/mixins/showMessage';
import { ILdapConfig, ILdapSyncData, ILdapSyncTable, IFormInputs, IUser } from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import humanizeDuration from 'humanize-duration';

export default mixins(
	showMessage,
).extend({
	name: 'SettingsLdapView',
	components: {
		SettingsView,
	},
	data() {
		return {
			dataTable: [] as ILdapSyncTable[],
			adConfig: {} as ILdapConfig,
			loadingTestConnection: false,
			loadingDryRun: false,
			loadingLiveRun: false,
			loadingTable: false,
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
		};
	},
	async mounted() {
		await this.getLdapConfig();
		await this.getLdapSyncronizations();
	},
	computed: {
		currentUser() {
			return this.$store.getters['users/currentUser'] as IUser;
		},
	},
	methods: {
		// @ts-ignore
		cellClassStyle({ row, column }) {
			if (column.property === 'status') {
				if (row.status === 'Success') {
					return { color: 'green'};
				} else if (row.status === 'Error') {
					return { color: 'red'};
				}
			}
			if (column.property === 'runMode') {
				if (row.runMode === 'Dry') {
					return { color: 'orange'};
				} else if (row.runMode === 'Live') {
					return { color: 'blue'};
				}
			}
		},
		onInput() {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: {
				loginEnabled: string,
				loginLabel: string,
				serverAddress: string,
				baseDn: string,
				bindingType: string,
				adminDn: string,
				adminPassword: string,
				loginId: string,
				email: string,
				lastName: string,
				firstName: string,
				ldapId: string,
				syncronizationEnabled: string,
				useSsl: string;
				allowUnauthorizedCerts: string;
				startTLS: string;
				syncronizationInterval: string;
				userFilter: string;
				pageSize: string;
				searchTimeout: string;
				}) {
			if (!this.hasAnyChanges) {
				return;
			}

			const newConfiguration = {
				login: {
					enabled: form.loginEnabled === 'true' ? true : false,
					label: form.loginLabel ?? '',
				},
				connection: {
					url: form.serverAddress,
					useSsl: form.useSsl === 'true' ? true : false,
					allowUnauthorizedCerts: form.allowUnauthorizedCerts === 'true' ? true : false,
					startTLS: form.startTLS === 'true' ? true : false,
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
					ldapId: form.ldapId,
				},
				filter: {
					user: form.userFilter ?? '',
				},
				syncronization: {
					enabled: form.syncronizationEnabled === 'true' ? true : false,
					interval: parseInt(form.syncronizationInterval || '60', 10),
					pageSize:  parseInt(form.pageSize || '0', 10),
					searchTimeout: parseInt(form.searchTimeout || '60', 10),
				},
			};

			try {
				this.adConfig = await this.$store.dispatch('settings/updateLdapConfig', newConfiguration);
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.updateConfiguration'),
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
		async onTestConnectionClick() {
			this.loadingTestConnection = true;
			try {
				await this.$store.dispatch('settings/testLdapConnection');
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.connectionTest'),
					message: 'Connection succeeded',
					type: 'success',
				});
			} catch (error) {
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.connectionTestError'),
					message: error.message,
					type: 'error',
				});
			} finally {
				this.loadingTestConnection = false;
			}
		},
		async onDryRunClick() {
			this.loadingDryRun = true;
			try {
				this.adConfig = await this.$store.dispatch('settings/runLdapSync', { type: 'dry' });
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.runSync.title'),
					message: 'Syncronization succeded',
					type: 'success',
				});
			} catch (error) {
			} finally {
				this.loadingDryRun = false;
				await this.getLdapSyncronizations();
			}
		},
		async onLiveRunClick() {
			this.loadingLiveRun = true;
			try {
				this.adConfig = await this.$store.dispatch('settings/runLdapSync', { type: 'live' });
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.runSync.title'),
					message: 'Syncronization succeded',
					type: 'success',
				});
			} catch (error) {
			} finally {
				this.loadingLiveRun = false;
				await this.getLdapSyncronizations();
			}
		},
		async getLdapConfig() {
			try {
				this.adConfig = await this.$store.dispatch('settings/getLdapConfig');
				this.formInputs = [
					{
						name: 'loginEnabled',
						initialValue: this.adConfig.login.enabled.toString(),
						properties: {
							type: 'select',
							label: 'Enabled LDAP Login',
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
							infoText: 'Whether to allow n8n users to sign-in using LDAP.'
						},
					},
					{
						name: 'loginLabel',
						initialValue: this.adConfig.login.label,
						properties: {
							label: 'Login Label',
							required: false,
							placeholder: 'LDAP Username or Email',
							infoText: 'The placeholder text that appears in the login field on the login page.',
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
						name: 'allowUnauthorizedCerts',
						initialValue: this.adConfig.connection.allowUnauthorizedCerts.toString(),
						properties: {
							type: 'select',
							label: 'Ignore SSL/TLS Issues',
							required: false,
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
						shouldDisplay(values): boolean {
							return values['useSsl'] === 'true';
						},
					},
					{
						name: 'startTLS',
						initialValue: this.adConfig.connection.startTLS.toString(),
						properties: {
							type: 'select',
							label: 'StartTLS',
							required: false,
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
							infoText: 'Performs a StartTLS extended operation against the LDAP server to initiate a TLS-secured communication channel over an otherwise clear-text connection.'
						},
						shouldDisplay(values): boolean {
							return values['useSsl'] === 'true';
						},
					},
					{
						name: 'baseDn',
						initialValue: this.adConfig.binding.baseDn,
						properties: {
							label: 'Base DN',
							required: true,
							capitalize: true,
							infoText: 'Distinguished Name of the location where n8n should start its search for user in the AD/LDAP tree.'
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
							capitalize: true,
							infoText: 'Distinguished Name of user used to perform the search.'
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
							capitalize: true,
							infoText: 'Password of the user provided in the Binding DN field.'
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin';
						},
					},
					{
						name: 'filters',
						properties: {
							label: 'Filters',
							type: 'info',
						},
					},
					{
						name: 'userFilter',
						initialValue: this.adConfig.filter.user,
						properties: {
							label: 'User Filter',
							type: 'text',
							required: false,
							capitalize: true,
							infoText: 'LDAP query to use when searching for user. Only users returned by this filter will be allowed to sign-in in n8n.'
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
						name: 'ldapId',
						initialValue: this.adConfig.attributeMapping.ldapId,
						properties: {
							label: 'ID',
							type: 'text',
							required: true,
							capitalize: true,
							infoText: 'The atribute in the LDAP server used as a unique identifier in n8n. It shoud be an unique LDAP attribute like uid.'
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
							infoText: 'The attribute in the LDAP server used to log-in in n8n.'
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
							infoText: 'The attribute in the LDAP server used to populate the email in n8n.'
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
							placeholder: 'givenName',
							infoText: 'The attribute in the LDAP server used to populate the first name in n8n.'
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
							placeholder: 'sn',
							infoText: 'The attribute in the LDAP server used to populate the last name in n8n.'
						},
					},
					{
						name: 'syncronizationInfo',
						properties: {
							label: 'Syncronization Info',
							type: 'info',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === 'true';
						},
					},
					{
						name: 'syncronizationEnabled',
						initialValue: this.adConfig.syncronization.enabled.toString(),
						properties: {
							type: 'select',
							label: 'Enabled LDAP Syncronization',
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
							infoText: 'Whether to enable background syncronizations.'
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === 'true';
						},
					},
					{
						name: 'syncronizationInterval',
						initialValue:this.adConfig.syncronization.interval,
						properties: {
							label: 'Syncronization Interval (Minutes)',
							type: 'text',
							infoText: 'How often the syncronization should run.'
						},
						shouldDisplay(values): boolean {
							return values['syncronizationEnabled'] === 'true' && values['loginEnabled'] === 'true';
						},
					},
					{
						name: 'pageSize',
						initialValue:this.adConfig.syncronization.pageSize,
						properties: {
							label: 'Page Size',
							type: 'text',
							infoText: 'Max number of records to return per page during syncronization. 0 for unlimited.'
						},
						shouldDisplay(values): boolean {
							return values['syncronizationEnabled'] === 'true' && values['loginEnabled'] === 'true';
						},
					},
					{
						name: 'searchTimeout',
						initialValue:this.adConfig.syncronization.searchTimeout,
						properties: {
							label: 'Search Timeout (Seconds)',
							type: 'text',
							infoText: 'The timeout value for queries to the AD/LDAP server. Increase if you are getting timeout errors caused by a slow AD/LDAP server.'
						},
						shouldDisplay(values): boolean {
							return values['syncronizationEnabled'] === 'true' && values['loginEnabled'] === 'true';
						},
					},
				];
			} catch (error) {
				//this.$showError(error, this.$locale.baseText('settings.api.view.error'));
			}
		},
		async getLdapSyncronizations() {
			try {
				this.loadingTable = true;
				const data = await this.$store.dispatch('settings/getLdapSyncronizations') as ILdapSyncData[];

				const syncDataMapper = (sync: ILdapSyncData): ILdapSyncTable => {
					const startedAt = new Date(sync.startedAt);
					const endedAt = new Date(sync.endedAt);
					const runTimeInMinutes = endedAt.getTime() - startedAt.getTime();
					return {
						runTime: humanizeDuration(runTimeInMinutes),
						runMode: sync.runMode.charAt(0).toLocaleUpperCase() + sync.runMode.slice(1),
						status: sync.status.charAt(0).toLocaleUpperCase() + sync.status.slice(1),
						endedAt: convertToDisplayDate(endedAt.getTime()),
						details: `Users scanned: ${sync.scanned}`,
					};
				};

				this.dataTable = data.map(syncDataMapper);
				this.loadingTable = false;
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

.syncTable {
		margin-bottom: var(--spacing-2xl);
}

.syncronizationActionButtons {
		padding-bottom: var(--spacing-3xl);
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

// .el-table .success-row > .cell {
// 	color: green !important;
// 	background-color: black !important;
// }

// .el-table .error-row > .cell {
// 	color: red !important;
// }

</style>

