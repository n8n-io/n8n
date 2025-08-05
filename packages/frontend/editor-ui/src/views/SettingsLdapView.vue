<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { computed, onMounted, ref } from 'vue';
import { capitalizeFirstLetter } from '@/utils/htmlUtils';
import { convertToDisplayDate } from '@/utils/typesUtils';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import type { IFormInput, IFormInputs } from '@/Interface';
import type { LdapConfig, LdapSyncData, LdapSyncTable } from '@n8n/rest-api-client/api/ldap';
import { MODAL_CONFIRM } from '@/constants';

import humanizeDuration from 'humanize-duration';
import { ElTable, ElTableColumn } from 'element-plus';
import type { Events } from 'v3-infinite-loading';
import InfiniteLoading from 'v3-infinite-loading';
import { useSettingsStore } from '@/stores/settings.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import type { TableColumnCtx } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useSSOStore } from '@/stores/sso.store';

type TableRow = {
	status: string;
	startAt: string;
	endedAt: string;
	error: string;
	runMode: string;
};

type LDAPConfigForm = {
	loginEnabled: boolean;
	loginLabel: string;
	serverAddress: string;
	allowUnauthorizedCerts: boolean;
	port: number;
	connectionSecurity: string;
	baseDn: string;
	bindingType: 'admin' | 'anonymous';
	adminDn: string;
	adminPassword: string;
	email: string;
	firstName: string;
	lastName: string;
	loginId: string;
	ldapId: string;
	userFilter: string;
	synchronizationEnabled: boolean;
	synchronizationInterval: string;
	pageSize: string;
	searchTimeout: string;
};

type CellClassStyleMethodParams<T> = {
	row: T;
	rowIndex: number;
	column: TableColumnCtx<T>;
	columnIndex: number;
};

const toast = useToast();
const i18n = useI18n();
const message = useMessage();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();

const dataTable = ref<LdapSyncTable[]>([]);
const tableKey = ref(0);
const adConfig = ref<LdapConfig>();
const loadingTestConnection = ref(false);
const loadingDryRun = ref(false);
const loadingLiveRun = ref(false);
const loadingTable = ref(false);
const hasAnyChanges = ref(false);
const formInputs = ref<IFormInputs | null>(null);
const formBus = createFormEventBus();
const readyToSubmit = ref(false);
const page = ref(0);
const loginEnabled = ref(false);
const syncEnabled = ref(false);
const ldapConfigFormRef = ref<{ getValues: () => LDAPConfigForm }>();

const isLDAPFeatureEnabled = computed(() => settingsStore.settings.enterprise.ldap);

const goToUpgrade = async () => await pageRedirectionHelper.goToUpgrade('ldap', 'upgrade-ldap');

const cellClassStyle = ({ row, column }: CellClassStyleMethodParams<TableRow>): CSSProperties => {
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
};

const onInput = (input: { name: string; value: string | number | boolean | null | undefined }) => {
	if (input.name === 'loginEnabled' && typeof input.value === 'boolean') {
		loginEnabled.value = input.value;
	}
	if (input.name === 'synchronizationEnabled' && typeof input.value === 'boolean') {
		syncEnabled.value = input.value;
	}
	hasAnyChanges.value = true;
};

const onReadyToSubmit = (ready: boolean) => {
	readyToSubmit.value = ready;
};

const syncDataMapper = (sync: LdapSyncData): LdapSyncTable => {
	const startedAt = new Date(sync.startedAt);
	const endedAt = new Date(sync.endedAt);
	const runTimeInMinutes = endedAt.getTime() - startedAt.getTime();
	return {
		runTime: humanizeDuration(runTimeInMinutes),
		runMode: capitalizeFirstLetter(sync.runMode),
		status: capitalizeFirstLetter(sync.status),
		endedAt: convertToDisplayDate(endedAt.getTime()),
		details: i18n.baseText('settings.ldap.usersScanned', {
			interpolate: {
				scanned: sync.scanned.toString(),
			},
		}),
	};
};

const onSubmit = async () => {
	// We want to save all form values (incl. the hidden onces), so we are using
	// `values` data prop of the `FormInputs` child component since they are all preserved there
	if (!hasAnyChanges.value || !ldapConfigFormRef.value) {
		return;
	}

	const formValues = ldapConfigFormRef.value.getValues();

	const newConfiguration: LdapConfig = {
		loginEnabled: formValues.loginEnabled,
		loginLabel: formValues.loginLabel,
		connectionUrl: formValues.serverAddress,
		allowUnauthorizedCerts: formValues.allowUnauthorizedCerts,
		connectionPort: +formValues.port,
		connectionSecurity: formValues.connectionSecurity,
		baseDn: formValues.baseDn,
		bindingAdminDn: formValues.bindingType === 'admin' ? formValues.adminDn : '',
		bindingAdminPassword: formValues.bindingType === 'admin' ? formValues.adminPassword : '',
		emailAttribute: formValues.email,
		firstNameAttribute: formValues.firstName,
		lastNameAttribute: formValues.lastName,
		loginIdAttribute: formValues.loginId,
		ldapIdAttribute: formValues.ldapId,
		userFilter: formValues.userFilter,
		synchronizationEnabled: formValues.synchronizationEnabled,
		synchronizationInterval: +formValues.synchronizationInterval,
		searchPageSize: +formValues.pageSize,
		searchTimeout: +formValues.searchTimeout,
	};

	let saveForm = true;

	if (!adConfig.value) return;

	try {
		if (adConfig.value.loginEnabled && !newConfiguration.loginEnabled) {
			const confirmAction = await message.confirm(
				i18n.baseText('settings.ldap.confirmMessage.beforeSaveForm.message'),
				i18n.baseText('settings.ldap.confirmMessage.beforeSaveForm.headline'),
				{
					cancelButtonText: i18n.baseText(
						'settings.ldap.confirmMessage.beforeSaveForm.cancelButtonText',
					),
					confirmButtonText: i18n.baseText(
						'settings.ldap.confirmMessage.beforeSaveForm.confirmButtonText',
					),
				},
			);

			saveForm = confirmAction === MODAL_CONFIRM;
		}

		if (!saveForm) {
			hasAnyChanges.value = true;
		}

		adConfig.value = await ssoStore.updateLdapConfig(newConfiguration);
		toast.showToast({
			title: i18n.baseText('settings.ldap.updateConfiguration'),
			message: '',
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ldap.configurationError'));
	} finally {
		if (saveForm) {
			hasAnyChanges.value = false;
		}
	}
};

const onSaveClick = () => {
	formBus.emit('submit');
};

const onTestConnectionClick = async () => {
	loadingTestConnection.value = true;
	try {
		await ssoStore.testLdapConnection();
		toast.showToast({
			title: i18n.baseText('settings.ldap.connectionTest'),
			message: i18n.baseText('settings.ldap.toast.connection.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showToast({
			title: i18n.baseText('settings.ldap.connectionTestError'),
			message: error.message,
			type: 'error',
		});
	} finally {
		loadingTestConnection.value = false;
	}
};

const onDryRunClick = async () => {
	loadingDryRun.value = true;
	try {
		await ssoStore.runLdapSync({ type: 'dry' });
		toast.showToast({
			title: i18n.baseText('settings.ldap.runSync.title'),
			message: i18n.baseText('settings.ldap.toast.sync.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ldap.synchronizationError'));
	} finally {
		loadingDryRun.value = false;
		await reloadLdapSynchronizations();
	}
};

const onLiveRunClick = async () => {
	loadingLiveRun.value = true;
	try {
		await ssoStore.runLdapSync({ type: 'live' });
		toast.showToast({
			title: i18n.baseText('settings.ldap.runSync.title'),
			message: i18n.baseText('settings.ldap.toast.sync.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ldap.synchronizationError'));
	} finally {
		loadingLiveRun.value = false;
		await reloadLdapSynchronizations();
	}
};

const getLdapConfig = async () => {
	try {
		adConfig.value = await ssoStore.getLdapConfig();
		loginEnabled.value = adConfig.value.loginEnabled;
		syncEnabled.value = adConfig.value.synchronizationEnabled;
		const whenLoginEnabled: IFormInput['shouldDisplay'] = (values) => values.loginEnabled === true;
		const whenSyncAndLoginEnabled: IFormInput['shouldDisplay'] = (values) =>
			values.synchronizationEnabled === true && values.loginEnabled === true;
		const whenAdminBindingAndLoginEnabled: IFormInput['shouldDisplay'] = (values) =>
			values.bindingType === 'admin' && values.loginEnabled === true;
		formInputs.value = [
			{
				name: 'loginEnabled',
				initialValue: adConfig.value.loginEnabled,
				properties: {
					type: 'toggle',
					label: i18n.baseText('settings.ldap.form.loginEnabled.label'),
					tooltipText: i18n.baseText('settings.ldap.form.loginEnabled.tooltip'),
					required: true,
				},
			},
			{
				name: 'loginLabel',
				initialValue: adConfig.value.loginLabel,
				properties: {
					label: i18n.baseText('settings.ldap.form.loginLabel.label'),
					required: true,
					placeholder: i18n.baseText('settings.ldap.form.loginLabel.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.loginLabel.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'serverAddress',
				initialValue: adConfig.value.connectionUrl,
				properties: {
					label: i18n.baseText('settings.ldap.form.serverAddress.label'),
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.serverAddress.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.serverAddress.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'port',
				initialValue: adConfig.value.connectionPort,
				properties: {
					type: 'number',
					label: i18n.baseText('settings.ldap.form.port.label'),
					capitalize: true,
					infoText: i18n.baseText('settings.ldap.form.port.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'connectionSecurity',
				initialValue: adConfig.value.connectionSecurity,
				properties: {
					type: 'select',
					label: i18n.baseText('settings.ldap.form.connectionSecurity.label'),
					infoText: i18n.baseText('settings.ldap.form.connectionSecurity.infoText'),
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
				initialValue: adConfig.value.allowUnauthorizedCerts,
				properties: {
					type: 'toggle',
					label: i18n.baseText('settings.ldap.form.allowUnauthorizedCerts.label'),
					required: false,
				},
				shouldDisplay(values): boolean {
					return values.connectionSecurity !== 'none' && values.loginEnabled === true;
				},
			},
			{
				name: 'baseDn',
				initialValue: adConfig.value.baseDn,
				properties: {
					label: i18n.baseText('settings.ldap.form.baseDn.label'),
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.baseDn.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.baseDn.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'bindingType',
				initialValue: 'admin',
				properties: {
					type: 'select',
					label: i18n.baseText('settings.ldap.form.bindingType.label'),
					infoText: i18n.baseText('settings.ldap.form.bindingType.infoText'),
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
				initialValue: adConfig.value.bindingAdminDn,
				properties: {
					label: i18n.baseText('settings.ldap.form.adminDn.label'),
					placeholder: i18n.baseText('settings.ldap.form.adminDn.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.adminDn.infoText'),
					capitalize: true,
				},
				shouldDisplay: whenAdminBindingAndLoginEnabled,
			},
			{
				name: 'adminPassword',
				initialValue: adConfig.value.bindingAdminPassword,
				properties: {
					label: i18n.baseText('settings.ldap.form.adminPassword.label'),
					type: 'password',
					capitalize: true,
					infoText: i18n.baseText('settings.ldap.form.adminPassword.infoText'),
				},
				shouldDisplay: whenAdminBindingAndLoginEnabled,
			},
			{
				name: 'userFilter',
				initialValue: adConfig.value.userFilter,
				properties: {
					label: i18n.baseText('settings.ldap.form.userFilter.label'),
					type: 'text',
					required: false,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.userFilter.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.userFilter.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'attributeMappingInfo',
				properties: {
					label: i18n.baseText('settings.ldap.form.attributeMappingInfo.label'),
					type: 'info',
					labelSize: 'large',
					labelAlignment: 'left',
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'ldapId',
				initialValue: adConfig.value.ldapIdAttribute,
				properties: {
					label: i18n.baseText('settings.ldap.form.ldapId.label'),
					type: 'text',
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.ldapId.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.ldapId.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'loginId',
				initialValue: adConfig.value.loginIdAttribute,
				properties: {
					label: i18n.baseText('settings.ldap.form.loginId.label'),
					type: 'text',
					autocomplete: 'email',
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.loginId.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.loginId.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'email',
				initialValue: adConfig.value.emailAttribute,
				properties: {
					label: i18n.baseText('settings.ldap.form.email.label'),
					type: 'text',
					autocomplete: 'email',
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.email.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.email.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'firstName',
				initialValue: adConfig.value.firstNameAttribute,
				properties: {
					label: i18n.baseText('settings.ldap.form.firstName.label'),
					type: 'text',
					autocomplete: 'email',
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.firstName.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.firstName.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'lastName',
				initialValue: adConfig.value.lastNameAttribute,
				properties: {
					label: i18n.baseText('settings.ldap.form.lastName.label'),
					type: 'text',
					autocomplete: 'email',
					required: true,
					capitalize: true,
					placeholder: i18n.baseText('settings.ldap.form.lastName.placeholder'),
					infoText: i18n.baseText('settings.ldap.form.lastName.infoText'),
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'synchronizationEnabled',
				initialValue: adConfig.value.synchronizationEnabled,
				properties: {
					type: 'toggle',
					label: i18n.baseText('settings.ldap.form.synchronizationEnabled.label'),
					tooltipText: i18n.baseText('settings.ldap.form.synchronizationEnabled.tooltip'),
					required: true,
				},
				shouldDisplay: whenLoginEnabled,
			},
			{
				name: 'synchronizationInterval',
				initialValue: adConfig.value.synchronizationInterval,
				properties: {
					type: 'number',
					label: i18n.baseText('settings.ldap.form.synchronizationInterval.label'),
					infoText: i18n.baseText('settings.ldap.form.synchronizationInterval.infoText'),
				},
				shouldDisplay: whenSyncAndLoginEnabled,
			},
			{
				name: 'pageSize',
				initialValue: adConfig.value.searchPageSize,
				properties: {
					type: 'number',
					label: i18n.baseText('settings.ldap.form.pageSize.label'),
					infoText: i18n.baseText('settings.ldap.form.pageSize.infoText'),
				},
				shouldDisplay: whenSyncAndLoginEnabled,
			},
			{
				name: 'searchTimeout',
				initialValue: adConfig.value.searchTimeout,
				properties: {
					type: 'number',
					label: i18n.baseText('settings.ldap.form.searchTimeout.label'),
					infoText: i18n.baseText('settings.ldap.form.searchTimeout.infoText'),
				},
				shouldDisplay: whenSyncAndLoginEnabled,
			},
		];
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ldap.configurationError'));
	}
};

const getLdapSynchronizations = async (state: Parameters<Events['infinite']>[0]) => {
	try {
		loadingTable.value = true;
		const data = await ssoStore.getLdapSynchronizations({
			page: page.value,
		});

		if (data.length !== 0) {
			dataTable.value.push(...data.map(syncDataMapper));
			page.value += 1;
			state.loaded();
		} else {
			state.complete();
		}
		loadingTable.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ldap.synchronizationError'));
	}
};

const reloadLdapSynchronizations = async () => {
	try {
		page.value = 0;
		tableKey.value += 1;
		dataTable.value = [];
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ldap.synchronizationError'));
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.ldap'));
	if (!isLDAPFeatureEnabled.value) return;
	await getLdapConfig();
});
</script>

<template>
	<div v-if="!isLDAPFeatureEnabled">
		<div :class="[$style.header, 'mb-2xl']">
			<n8n-heading size="2xlarge">
				{{ i18n.baseText('settings.ldap') }}
			</n8n-heading>
		</div>

		<n8n-info-tip type="note" theme="info" tooltip-placement="right" class="mb-l">
			{{ i18n.baseText('settings.ldap.note') }}
		</n8n-info-tip>
		<n8n-action-box
			:description="i18n.baseText('settings.ldap.disabled.description')"
			:button-text="i18n.baseText('settings.ldap.disabled.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.ldap.disabled.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
	<div v-else>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">
					{{ i18n.baseText('settings.ldap') }}
				</n8n-heading>
			</div>
			<div :class="$style.docsInfoTip">
				<n8n-info-tip theme="info" type="note">
					<span v-n8n-html="i18n.baseText('settings.ldap.infoTip')"></span>
				</n8n-info-tip>
			</div>
			<div :class="$style.settingsForm">
				<n8n-form-inputs
					v-if="formInputs"
					ref="ldapConfigFormRef"
					:inputs="formInputs"
					:event-bus="formBus"
					:column-view="true"
					vertical-spacing="l"
					@update="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
			<div>
				<n8n-button
					v-if="loginEnabled"
					:label="
						loadingTestConnection
							? i18n.baseText('settings.ldap.testingConnection')
							: i18n.baseText('settings.ldap.testConnection')
					"
					size="large"
					class="mr-s"
					:disabled="hasAnyChanges || !readyToSubmit"
					:loading="loadingTestConnection"
					@click="onTestConnectionClick"
				/>
				<n8n-button
					:label="i18n.baseText('settings.ldap.save')"
					size="large"
					:disabled="!hasAnyChanges || !readyToSubmit"
					@click="onSaveClick"
				/>
			</div>
		</div>
		<div v-if="loginEnabled">
			<n8n-heading tag="h1" class="mb-xl mt-3xl" size="medium">{{
				i18n.baseText('settings.ldap.section.synchronization.title')
			}}</n8n-heading>
			<div :class="$style.syncTable">
				<ElTable
					:key="tableKey"
					v-loading="loadingTable"
					:border="true"
					:stripe="true"
					:data="dataTable"
					:cell-style="cellClassStyle"
					style="width: 100%"
					max-height="250"
				>
					<ElTableColumn
						prop="status"
						:label="i18n.baseText('settings.ldap.synchronizationTable.column.status')"
					/>
					<ElTableColumn
						prop="endedAt"
						:label="i18n.baseText('settings.ldap.synchronizationTable.column.endedAt')"
					/>
					<ElTableColumn
						prop="runMode"
						:label="i18n.baseText('settings.ldap.synchronizationTable.column.runMode')"
					/>
					<ElTableColumn
						prop="runTime"
						:label="i18n.baseText('settings.ldap.synchronizationTable.column.runTime')"
					/>
					<ElTableColumn
						prop="details"
						:label="i18n.baseText('settings.ldap.synchronizationTable.column.details')"
					/>
					<template #empty>{{
						i18n.baseText('settings.ldap.synchronizationTable.empty.message')
					}}</template>
					<template #append>
						<InfiniteLoading target=".el-table__body-wrapper" @infinite="getLdapSynchronizations">
						</InfiniteLoading>
					</template>
				</ElTable>
			</div>
			<div class="pb-3xl">
				<n8n-button
					:label="i18n.baseText('settings.ldap.dryRun')"
					type="secondary"
					size="large"
					class="mr-s"
					:disabled="hasAnyChanges || !readyToSubmit"
					:loading="loadingDryRun"
					@click="onDryRunClick"
				/>
				<n8n-button
					:label="i18n.baseText('settings.ldap.synchronizeNow')"
					size="large"
					:disabled="hasAnyChanges || !readyToSubmit"
					:loading="loadingLiveRun"
					@click="onLiveRunClick"
				/>
			</div>
		</div>
	</div>
</template>

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

	> span {
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-bold);
		padding: 0;
	}

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
