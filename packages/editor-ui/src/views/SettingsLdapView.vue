<template>
	<div v-if="!isLDAPFeatureEnabled">
		<div :class="[$style.header, 'mb-2xl']">
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('settings.ldap') }}
			</n8n-heading>
		</div>

		<n8n-info-tip type="note" theme="info-light" tooltipPlacement="right">
			<div>
				LDAP allows users to authenticate with their centralized account. It's compatible with
				services that provide an LDAP interface like Active Directory, Okta and Jumpcloud.
			</div>
			<br />
		</n8n-info-tip>
		<n8n-action-box
			:description="$locale.baseText('settings.ldap.disabled.description')"
			:buttonText="$locale.baseText('settings.ldap.disabled.buttonText')"
			@click="onContactUsClick"
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
			<div :class="$style.docsInfoTip">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText('settings.ldap.infoTip')"></span>
					</template>
				</n8n-info-tip>
			</div>
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
		<div v-if="loginEnabled">
			<n8n-heading tag="h1" class="mb-xl mt-3xl" size="medium">{{
				$locale.baseText('settings.ldap.section.synchronization.title')
			}}</n8n-heading>
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
					<template #empty>{{
						$locale.baseText('settings.ldap.synchronizationTable.empty.message')
					}}</template>
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
import { convertToDisplayDate } from '@/utils';
import { showMessage } from '@/mixins/showMessage';
import {
	ILdapConfig,
	ILdapSyncData,
	ILdapSyncTable,
	IFormInput,
	IFormInputs,
	IUser,
} from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import humanizeDuration from 'humanize-duration';
import type { rowCallbackParams, cellCallbackParams } from 'element-ui/types/table';
import { capitalizeFirstLetter } from '@/utils';
import InfiniteLoading from 'vue-infinite-loading';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';
import { getLdapSynchronizations } from '@/api/ldap';
import { N8N_CONTACT_EMAIL, N8N_SALES_EMAIL } from '@/constants';
import { createEventBus } from '@/event-bus';
import { N8nFormInputs } from 'n8n-design-system';

type N8nFormInputsRef = InstanceType<typeof N8nFormInputs>;

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
	synchronizationEnabled: boolean;
	allowUnauthorizedCerts: boolean;
	synchronizationInterval: number;
	userFilter: string;
	pageSize: number;
	searchTimeout: number;
	port: number;
	connectionSecurity: string;
};

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
			formBus: createEventBus(),
			readyToSubmit: false,
			page: 0,
			loginEnabled: false,
			syncEnabled: false,
		};
	},
	async mounted() {
		if (!this.isLDAPFeatureEnabled) return;
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
		onContactUsClick(event: MouseEvent): void {
			const email = this.settingsStore.isCloudDeployment ? N8N_CONTACT_EMAIL : N8N_SALES_EMAIL;
			location.href = `mailto:${email}`;
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
		onInput(input: { name: string; value: string | number | boolean }) {
			if (input.name === 'loginEnabled' && typeof input.value === 'boolean') {
				this.loginEnabled = input.value;
			}
			if (input.name === 'synchronizationEnabled' && typeof input.value === 'boolean') {
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
			const formInputsRef = this.$refs.ldapConfigForm as N8nFormInputsRef | undefined;
			if (!this.hasAnyChanges || !formInputsRef) {
				return;
			}

			const newConfiguration: ILdapConfig = {
				loginEnabled: formInputsRef.values.loginEnabled,
				loginLabel: formInputsRef.values.loginLabel,
				connectionUrl: formInputsRef.values.serverAddress,
				allowUnauthorizedCerts: formInputsRef.values.allowUnauthorizedCerts,
				connectionPort: +formInputsRef.values.port,
				connectionSecurity: formInputsRef.values.connectionSecurity,
				baseDn: formInputsRef.values.baseDn,
				bindingAdminDn:
					formInputsRef.values.bindingType === 'admin' ? formInputsRef.values.adminDn : '',
				bindingAdminPassword:
					formInputsRef.values.bindingType === 'admin' ? formInputsRef.values.adminPassword : '',
				emailAttribute: formInputsRef.values.email,
				firstNameAttribute: formInputsRef.values.firstName,
				lastNameAttribute: formInputsRef.values.lastName,
				loginIdAttribute: formInputsRef.values.loginId,
				ldapIdAttribute: formInputsRef.values.ldapId,
				userFilter: formInputsRef.values.userFilter,
				synchronizationEnabled: formInputsRef.values.synchronizationEnabled,
				synchronizationInterval: +formInputsRef.values.synchronizationInterval,
				searchPageSize: +formInputsRef.values.pageSize,
				searchTimeout: +formInputsRef.values.searchTimeout,
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
			this.formBus.emit('submit');
		},
		async onTestConnectionClick() {
			this.loadingTestConnection = true;
			try {
				await this.settingsStore.testLdapConnection();
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.connectionTest'),
					message: this.$locale.baseText('settings.ldap.toast.connection.success'),
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
					message: this.$locale.baseText('settings.ldap.toast.sync.success'),
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.synchronizationError'));
			} finally {
				this.loadingDryRun = false;
				await this.reloadLdapSynchronizations();
			}
		},
		async onLiveRunClick() {
			this.loadingLiveRun = true;
			try {
				await this.settingsStore.runLdapSync({ type: 'live' });
				this.$showToast({
					title: this.$locale.baseText('settings.ldap.runSync.title'),
					message: this.$locale.baseText('settings.ldap.toast.sync.success'),
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.ldap.synchronizationError'));
			} finally {
				this.loadingLiveRun = false;
				await this.reloadLdapSynchronizations();
			}
		},
		async getLdapConfig() {
			try {
				this.adConfig = await this.settingsStore.getLdapConfig();
				this.loginEnabled = this.adConfig.loginEnabled;
				this.syncEnabled = this.adConfig.synchronizationEnabled;
				const whenLoginEnabled: IFormInput['shouldDisplay'] = (values) =>
					values['loginEnabled'] === true;
				const whenSyncAndLoginEnabled: IFormInput['shouldDisplay'] = (values) =>
					values['synchronizationEnabled'] === true && values['loginEnabled'] === true;
				const whenAdminBindingAndLoginEnabled: IFormInput['shouldDisplay'] = (values) =>
					values['bindingType'] === 'admin' && values['loginEnabled'] === true;
				this.formInputs = [
					{
						name: 'loginEnabled',
						initialValue: this.adConfig.loginEnabled,
						properties: {
							type: 'toggle',
							label: this.$locale.baseText('settings.ldap.form.loginEnabled.label'),
							tooltipText: this.$locale.baseText('settings.ldap.form.loginEnabled.tooltip'),
							required: true,
						},
					},
					{
						name: 'loginLabel',
						initialValue: this.adConfig.loginLabel,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.loginLabel.label'),
							required: true,
							placeholder: this.$locale.baseText('settings.ldap.form.loginLabel.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.loginLabel.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'serverAddress',
						initialValue: this.adConfig.connectionUrl,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.serverAddress.label'),
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.serverAddress.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.serverAddress.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'port',
						initialValue: this.adConfig.connectionPort,
						properties: {
							type: 'number',
							label: this.$locale.baseText('settings.ldap.form.port.label'),
							capitalize: true,
							infoText: this.$locale.baseText('settings.ldap.form.port.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'connectionSecurity',
						initialValue: this.adConfig.connectionSecurity,
						properties: {
							type: 'select',
							label: this.$locale.baseText('settings.ldap.form.connectionSecurity.label'),
							infoText: this.$locale.baseText('settings.ldap.form.connectionSecurity.infoText'),
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
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'allowUnauthorizedCerts',
						initialValue: this.adConfig.allowUnauthorizedCerts,
						properties: {
							type: 'toggle',
							label: this.$locale.baseText('settings.ldap.form.allowUnauthorizedCerts.label'),
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
							label: this.$locale.baseText('settings.ldap.form.baseDn.label'),
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.baseDn.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.baseDn.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'bindingType',
						initialValue: 'admin',
						properties: {
							type: 'select',
							label: this.$locale.baseText('settings.ldap.form.bindingType.label'),
							infoText: this.$locale.baseText('settings.ldap.form.bindingType.infoText'),
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
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'adminDn',
						initialValue: this.adConfig.bindingAdminDn,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.adminDn.label'),
							placeholder: this.$locale.baseText('settings.ldap.form.adminDn.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.adminDn.infoText'),
							capitalize: true,
						},
						shouldDisplay: whenAdminBindingAndLoginEnabled,
					},
					{
						name: 'adminPassword',
						initialValue: this.adConfig.bindingAdminPassword,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.adminPassword.label'),
							type: 'password',
							capitalize: true,
							infoText: this.$locale.baseText('settings.ldap.form.adminPassword.infoText'),
						},
						shouldDisplay: whenAdminBindingAndLoginEnabled,
					},
					{
						name: 'userFilter',
						initialValue: this.adConfig.userFilter,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.userFilter.label'),
							type: 'text',
							required: false,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.userFilter.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.userFilter.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'attributeMappingInfo',
						properties: {
							label: this.$locale.baseText('settings.ldap.form.attributeMappingInfo.label'),
							type: 'info',
							labelSize: 'large',
							labelAlignment: 'left',
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'ldapId',
						initialValue: this.adConfig.ldapIdAttribute,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.ldapId.label'),
							type: 'text',
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.ldapId.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.ldapId.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'loginId',
						initialValue: this.adConfig.loginIdAttribute,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.loginId.label'),
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.loginId.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.loginId.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'email',
						initialValue: this.adConfig.emailAttribute,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.email.label'),
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.email.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.email.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'firstName',
						initialValue: this.adConfig.firstNameAttribute,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.firstName.label'),
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.firstName.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.firstName.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'lastName',
						initialValue: this.adConfig.lastNameAttribute,
						properties: {
							label: this.$locale.baseText('settings.ldap.form.lastName.label'),
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
							placeholder: this.$locale.baseText('settings.ldap.form.lastName.placeholder'),
							infoText: this.$locale.baseText('settings.ldap.form.lastName.infoText'),
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'synchronizationEnabled',
						initialValue: this.adConfig.synchronizationEnabled,
						properties: {
							type: 'toggle',
							label: this.$locale.baseText('settings.ldap.form.synchronizationEnabled.label'),
							tooltipText: this.$locale.baseText(
								'settings.ldap.form.synchronizationEnabled.tooltip',
							),
							required: true,
						},
						shouldDisplay: whenLoginEnabled,
					},
					{
						name: 'synchronizationInterval',
						initialValue: this.adConfig.synchronizationInterval,
						properties: {
							type: 'number',
							label: this.$locale.baseText('settings.ldap.form.synchronizationInterval.label'),
							infoText: this.$locale.baseText(
								'settings.ldap.form.synchronizationInterval.infoText',
							),
						},
						shouldDisplay: whenSyncAndLoginEnabled,
					},
					{
						name: 'pageSize',
						initialValue: this.adConfig.searchPageSize,
						properties: {
							type: 'number',
							label: this.$locale.baseText('settings.ldap.form.pageSize.label'),
							infoText: this.$locale.baseText('settings.ldap.form.pageSize.infoText'),
						},
						shouldDisplay: whenSyncAndLoginEnabled,
					},
					{
						name: 'searchTimeout',
						initialValue: this.adConfig.searchTimeout,
						properties: {
							type: 'number',
							label: this.$locale.baseText('settings.ldap.form.searchTimeout.label'),
							infoText: this.$locale.baseText('settings.ldap.form.searchTimeout.infoText'),
						},
						shouldDisplay: whenSyncAndLoginEnabled,
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
		async reloadLdapSynchronizations() {
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
