<template>
		<div v-if="!isLDAPFeatureEnabled">
			<div :class="[$style.header, 'mb-2xl']">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('settings.ldap') }}
				</n8n-heading>
			</div>
			<n8n-action-box
				:description="$locale.baseText('settings.ldap.disabled.description')"
				:buttonText="$locale.baseText('settings.ldap.disabled.buttonText')"
				@click="openDocsPage"
			>
				<template #heading>
					<span>{{ $locale.baseText('settings.ldap.disabled.title') }}</span>
				</template>
			</n8n-action-box>
			</div>
		<div v-else>
			<div :class="$style.container">
				<div :class="$style.header">
					<n8n-heading size="2xlarge">
						{{ $locale.baseText('settings.ldap') }}
					</n8n-heading>
				</div>
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText('settings.ldap.infoTip')"></span>
					</template>
				</n8n-info-tip>
				<div :class="$style.settingsForm">
					<n8n-form-inputs
						v-if="formInputs"
						ref="ldapConfigForm"
						:inputs="formInputs"
						:eventBus="formBus"
						:columnView="true"
						verticalSpacing="l"
						@input="onInput"
						@ready="onReadyToSubmit"
						@submit="onSubmit"
					/>
				</div>
				<div>
					<n8n-button
						v-if="loginEnabled"
						:label="
							loadingTestConnection
								? $locale.baseText('settings.ldap.testingConnection')
								: $locale.baseText('settings.ldap.testConnection')
						"
						size="large"
						class="mr-s"
						:disabled="hasAnyChanges || !readyToSubmit"
						:loading="loadingTestConnection"
						@click="onTestConnectionClick"
					/>
					<n8n-button
						:label="$locale.baseText('settings.ldap.save')"
						size="large"
						:disabled="!hasAnyChanges || !readyToSubmit"
						@click="onSaveClick"
					/>
				</div>
			</div>
			<div v-show="loginEnabled">
				<div :class="$style.syncTable">
					<el-table
						v-loading="loadingTable"
						:border="true"
						:stripe="true"
						:data="dataTable"
						:cell-style="cellClassStyle"
						style="width: 100%"
						height="250"
						:key="tableKey"
					>
						<el-table-column
							prop="status"
							:label="$locale.baseText('settings.ldap.synchronizationTable.column.status')"
						>
						</el-table-column>
						<el-table-column
							prop="endedAt"
							:label="$locale.baseText('settings.ldap.synchronizationTable.column.endedAt')"
						>
						</el-table-column>
						<el-table-column
							prop="runMode"
							:label="$locale.baseText('settings.ldap.synchronizationTable.column.runMode')"
						>
						</el-table-column>
						<el-table-column
							prop="runTime"
							:label="$locale.baseText('settings.ldap.synchronizationTable.column.runTime')"
						>
						</el-table-column>
						<el-table-column
							prop="details"
							:label="$locale.baseText('settings.ldap.synchronizationTable.column.details')"
						>
						</el-table-column>
						<template #empty>Test synchronization to preview updates</template>
						<template #append>
						<infinite-loading
							@infinite="getLdapSynchronizations"
							force-use-infinite-wrapper=".el-table__body-wrapper"
						>
						</infinite-loading>
					</template>
					</el-table>
				</div>
				<div class="pb-3xl">
					<n8n-button
						:label="$locale.baseText('settings.ldap.dryRun')"
						type="secondary"
						size="large"
						class="mr-s"
						:disabled="hasAnyChanges || !readyToSubmit"
						:loading="loadingDryRun"
						@click="onDryRunClick"
					/>
					<n8n-button
						:label="$locale.baseText('settings.ldap.synchronizeNow')"
						size="large"
						:disabled="hasAnyChanges || !readyToSubmit"
						:loading="loadingLiveRun"
						@click="onLiveRunClick"
					/>
				</div>
			</div>
		</div>
</template>

<script lang="ts">
import { convertToDisplayDate } from '@/components/helpers';
import { showMessage } from '@/components/mixins/showMessage';
import { ILdapConfig, ILdapSyncData, ILdapSyncTable, IFormInputs, IUser } from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import humanizeDuration from 'humanize-duration';
import type { rowCallbackParams, cellCallbackParams } from 'element-ui/types/table';
import { capitalizeFirstLetter } from '@/utils';
import InfiniteLoading from 'vue-infinite-loading';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';

type FormValues = {
	loginEnabled: boolean;
	loginLabel: string;
	serverAddress: string;
	baseDn: string;
	bindingType: string;
	adminDn: string;
	adminPassword: string;
	loginId: string;
	email: string;
	lastName: string;
	firstName: string;
	ldapId: string;
	syncronizationEnabled: boolean;
	allowUnauthorizedCerts: boolean;
	syncronizationInterval: number;
	userFilter: string;
	pageSize: number;
	searchTimeout: number;
	port: number;
	connectionSecurity: string;
}

type tableRow = {
	status: string;
	startAt: string;
	endedAt: string;
	error: string;
	runMode: string;
};

type rowType = rowCallbackParams & tableRow;

type cellType = cellCallbackParams & { property: keyof tableRow };

export default mixins(showMessage).extend({
	name: 'SettingsLdapView',
	components: {
		InfiniteLoading,
	},
	data() {
		return {
			dataTable: [] as ILdapSyncTable[],
			tableKey: 0,
			adConfig: {} as ILdapConfig,
			loadingTestConnection: false,
			loadingDryRun: false,
			loadingLiveRun: false,
			loadingTable: false,
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
			page: 0,
			loginEnabled: false,
			syncEnabled: false,
		};
	},
	async mounted() {
		await this.getLdapConfig();
	},
	computed: {
		...mapStores(useUsersStore, useSettingsStore),
		currentUser(): null | IUser {
			return this.usersStore.currentUser;
		},
		isLDAPFeatureEnabled(): boolean {
			return this.settingsStore.settings.enterprise.ldap === true;
		},
	},
	methods: {
		openDocsPage(event: MouseEvent): void {
			window.open('https://n8n.io/pricing/', '_blank');
		},
		cellClassStyle({ row, column }: { row: rowType; column: cellType }) {
			if (column.property === 'status') {
				if (row.status === 'Success') {
					return { color: 'green' };
				} else if (row.status === 'Error') {
					return { color: 'red' };
				}
			}
			if (column.property === 'runMode') {
				if (row.runMode === 'Dry') {
					return { color: 'orange' };
				} else if (row.runMode === 'Live') {
					return { color: 'blue' };
				}
			}
			return {};
		},
		onInput(input: { name: string, value: string | number | boolean }) {
			if (input.name === 'loginEnabled' && typeof input.value === 'boolean') {
				this.loginEnabled = input.value;
			}
			if (input.name === 'syncronizationEnabled' && typeof input.value === 'boolean') {
				this.syncEnabled = input.value;
			}
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		syncDataMapper(sync: ILdapSyncData): ILdapSyncTable {
			const startedAt = new Date(sync.startedAt);
			const endedAt = new Date(sync.endedAt);
			const runTimeInMinutes = endedAt.getTime() - startedAt.getTime();
			return {
				runTime: humanizeDuration(runTimeInMinutes),
				runMode: capitalizeFirstLetter(sync.runMode),
				status: capitalizeFirstLetter(sync.status),
				endedAt: convertToDisplayDate(endedAt.getTime()),
				details: this.$locale.baseText('settings.ldap.usersScanned', {
					interpolate: {
						scanned: sync.scanned.toString(),
					},
				}),
			};
		},
		async onSubmit(): Promise<void> {
			// We want to save all form values (incl. the hidden onces), so we are using
			// `values` data prop of the `FormInputs` child component since they are all preserved there
			const formInputs = this.$refs.ldapConfigForm as Vue & { values: FormValues} | undefined;
			if (!this.hasAnyChanges || !formInputs) {
				return;
			}

			const newConfiguration: ILdapConfig = {
				loginEnabled: formInputs.values.loginEnabled,
				loginLabel: formInputs.values.loginLabel,
				connectionUrl: formInputs.values.serverAddress,
				allowUnauthorizedCerts: formInputs.values.allowUnauthorizedCerts,
				connectionPort: formInputs.values.port,
				connectionSecurity: formInputs.values.connectionSecurity,
				baseDn: formInputs.values.baseDn,
				bindingAdminDn: formInputs.values.bindingType === 'admin' ? formInputs.values.adminDn : '',
				bindingAdminPassword: formInputs.values.bindingType === 'admin' ? formInputs.values.adminPassword : '',
				emailAttribute: formInputs.values.email,
				firstNameAttribute: formInputs.values.firstName,
				lastNameAttribute: formInputs.values.lastName,
				loginIdAttribute: formInputs.values.loginId,
				ldapIdAttribute: formInputs.values.ldapId,
				userFilter: formInputs.values.userFilter,
				syncronizationEnabled: formInputs.values.syncronizationEnabled,
				syncronizationInterval: formInputs.values.syncronizationInterval,
				searchPageSize: +formInputs.values.pageSize,
				searchTimeout: formInputs.values.searchTimeout,
			};

			let saveForm = true;

			try {
				if (this.adConfig.loginEnabled === true && newConfiguration.loginEnabled === false) {
					saveForm = await this.confirmMessage(
						this.$locale.baseText('settings.ldap.confirmMessage.beforeSaveForm.message'),
						this.$locale.baseText('settings.ldap.confirmMessage.beforeSaveForm.headline'),
					null,
					this.$locale.baseText('settings.ldap.confirmMessage.beforeSaveForm.cancelButtonText'),
					this.$locale.baseText('settings.ldap.confirmMessage.beforeSaveForm.confirmButtonText'),
				);
				}

				if (!saveForm) {
					this.hasAnyChanges = true;
				}

				this.adConfig = await this.settingsStore.updateLdapConfig(newConfiguration);
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.updateConfiguration'),
					message: '',
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.configurationError'));
			} finally {
				if (saveForm) {
					this.hasAnyChanges = false;
				}
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		async onTestConnectionClick() {
			this.loadingTestConnection = true;
			try {
				await this.settingsStore.testLdapConnection();
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
				await this.settingsStore.runLdapSync({ type: 'dry' });
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.runSync.title'),
					message: 'Syncronization succeded',
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.synchronizationError'));
			} finally {
				this.loadingDryRun = false;
				await this.reloadLdapSyncronizations();
			}
		},
		async onLiveRunClick() {
			this.loadingLiveRun = true;
			try {
				await this.settingsStore.runLdapSync({ type: 'live' });
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.runSync.title'),
					message: 'Syncronization succeded',
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.synchronizationError'));
			} finally {
				this.loadingLiveRun = false;
				await this.reloadLdapSyncronizations();
			}
		},
		async getLdapConfig() {
			try {
				this.adConfig = await this.settingsStore.getLdapConfig();
				this.loginEnabled = this.adConfig.loginEnabled;
				this.syncEnabled = this.adConfig.syncronizationEnabled;
				this.formInputs = [
					{
						name: 'loginEnabled',
						initialValue: this.adConfig.loginEnabled,
						properties: {
							type: 'toggle',
							label: 'Enable LDAP Login',
							tooltipText: 'Connection settings and data will still be saved if you disable LDAP Login',
							required: true,
						},
					},
					{
						name: 'loginLabel',
						initialValue: this.adConfig.loginLabel,
						properties: {
							label: 'LDAP LOGIN',
							required: true,
							placeholder: 'E.g.: LDAP Username or Email',
							infoText: 'The placeholder text that appears in the login field on the login page.',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'serverAddress',
						initialValue: this.adConfig.connectionUrl,
						properties: {
							label: 'LDAP Server Address',
							required: true,
							capitalize: true,
							placeholder: '123.123.123.123',
							infoText: 'IP or domain of the LDAP server.',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'port',
						initialValue: this.adConfig.connectionPort,
						properties: {
							label: 'LDAP Server Port',
							capitalize: true,
							infoText: 'Port used to connect to the LDAP server',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'connectionSecurity',
						initialValue: this.adConfig.connectionSecurity,
						properties: {
							type: 'select',
							label: 'Connection Security',
							options: [
								{
									label: 'None',
									value: 'none',
								},
								{
									label: 'TLS',
									value: 'tls',
								},
								{
									label: 'STARTTLS',
									value: 'startTls',
								},
							],
							required: true,
							capitalize: true,
							infoText: 'Type of connection security',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'allowUnauthorizedCerts',
						initialValue: this.adConfig.allowUnauthorizedCerts,
						properties: {
							type: 'toggle',
							label: 'Ignore SSL/TLS Issues',
							required: false,
						},
						shouldDisplay(values): boolean {
							return values['connectionSecurity'] !== 'none' && values['loginEnabled'] === true;
						},
					},
					{
						name: 'baseDn',
						initialValue: this.adConfig.baseDn,
						properties: {
							label: 'Base DN',
							required: true,
							capitalize: true,
							placeholder: 'o=acme,dc=example,dc=com',
							infoText:
								'Distinguished Name of the location where n8n should start its search for user in the AD/LDAP tree',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'bindingType',
						initialValue: 'admin',
						properties: {
							type: 'select',
							label: 'Binding as',
							infoText: 'Type of binding used to connection to the LDAP server',
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
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'adminDn',
						initialValue: this.adConfig.bindingAdminDn,
						properties: {
							label: 'Binding DN',
							placeholder: 'uid=2da2de69435c,ou=Users,o=Acme,dc=com',
							capitalize: true,
							infoText: 'Distinguished Name of the user to perform the search',
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin' && values['loginEnabled'] === true;
						},
					},
					{
						name: 'adminPassword',
						initialValue: this.adConfig.bindingAdminPassword,
						properties: {
							label: 'Binding Password',
							type: 'password',
							capitalize: true,
							infoText: 'Password of the user provided in the Binding DN field above',
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin' && values['loginEnabled'] === true;
						},
					},
					{
						name: 'userFilter',
						initialValue: this.adConfig.userFilter,
						properties: {
							label: 'User Filter',
							type: 'text',
							required: false,
							capitalize: true,
							placeholder: '(ObjectClass=user)',
							infoText:
								'LDAP query to use when searching for user. Only users returned by this filter will be allowed to sign-in in n8n',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'attributeMappingInfo',
						properties: {
							label: 'Attribute mapping',
							type: 'info',
							labelSize: 'large',
							labelAlignment: 'left',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'ldapId',
						initialValue: this.adConfig.ldapIdAttribute,
						properties: {
							label: 'ID',
							type: 'text',
							required: true,
							capitalize: true,
							placeholder: 'uid',
							infoText:
								'The attribute in the LDAP server used as a unique identifier in n8n. It should be an unique LDAP attribute like uid.',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'loginId',
						initialValue: this.adConfig.loginIdAttribute,
						properties: {
							label: 'Login ID',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: 'mail',
							infoText: 'The attribute in the LDAP server used to log-in in n8n',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'email',
						initialValue: this.adConfig.emailAttribute,
						properties: {
							label: 'Email',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: 'mail',
							infoText: 'The attribute in the LDAP server used to populate the email in n8n',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'firstName',
						initialValue: this.adConfig.firstNameAttribute,
						properties: {
							label: 'First Name',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: 'givenName',
							infoText: 'The attribute in the LDAP server used to populate the first name in n8n',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'lastName',
						initialValue: this.adConfig.lastNameAttribute,
						properties: {
							label: 'Last Name',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: 'sn',
							infoText: 'The attribute in the LDAP server used to populate the last name in n8n',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'synchronizationInfo',
						properties: {
							label: 'Synchronization',
							type: 'info',
							labelSize: 'large',
							labelAlignment: 'left',
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'syncronizationEnabled',
						initialValue: this.adConfig.syncronizationEnabled,
						properties: {
							type: 'toggle',
							label: 'Enable LDAP Synchronization',
							tooltipText: 'Enable users to be synchronized periodically',
							required: true,
						},
						shouldDisplay(values): boolean {
							return values['loginEnabled'] === true;
						},
					},
					{
						name: 'syncronizationInterval',
						initialValue: this.adConfig.syncronizationInterval,
						properties: {
							label: 'Synchronization Interval (Minutes)',
							type: 'text',
							infoText: 'How often the synchronization should run',
						},
						shouldDisplay(values): boolean {
							return (
								values['syncronizationEnabled'] === true && values['loginEnabled'] === true
							);
						},
					},
					{
						name: 'pageSize',
						initialValue: this.adConfig.searchPageSize,
						properties: {
							label: 'Page Size',
							type: 'text',
							infoText: 'Max number of records to return per page during synchronization. 0 for unlimited',
						},
						shouldDisplay(values): boolean {
							return (
								values['syncronizationEnabled'] === true && values['loginEnabled'] === true
							);
						},
					},
					{
						name: 'searchTimeout',
						initialValue: this.adConfig.searchTimeout,
						properties: {
							label: 'Search Timeout (Seconds)',
							type: 'text',
							infoText:
								'The timeout value for queries to the AD/LDAP server. Increase if you are getting timeout errors caused by a slow AD/LDAP server',
						},
						shouldDisplay(values): boolean {
							return (
								values['syncronizationEnabled'] === true && values['loginEnabled'] === true
							);
						},
					},
				];
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.configurationError'));
			}
		},
		async getLdapSynchronizations(state: any) {
			try {
				this.loadingTable = true;
				const data = await this.settingsStore.getLdapSynchronizations({
					page: this.page,
				});

				if (data.length !== 0) {
					this.dataTable.push(...data.map(this.syncDataMapper));
					this.page += 1;
					state.loaded();
				} else {
					state.complete();
				}
				this.loadingTable = false;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.synchronizationError'));
			}
		},
		async reloadLdapSyncronizations() {
			try {
				this.page = 0;
				this.tableKey += 1;
				this.dataTable = [];
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.synchronizationError'));
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
	margin-top: var(--spacing-3xl);
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
</style>

