<script lang="ts" setup>
import { ROLE, type ServiceAccount } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nEmptyState,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
	type UserAction,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import { useRolesStore } from '@n8n/stores/roles.store';
import { computed, onMounted, ref } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUIStore } from '@/app/stores/ui.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

import ActAsServiceAccountDialog from '../components/ActAsServiceAccountDialog.vue';
import CreateServiceAccountCredentialModal from '../components/CreateServiceAccountCredentialModal.vue';
import CreateServiceAccountModal from '../components/CreateServiceAccountModal.vue';
import DeleteServiceAccountDialog from '../components/DeleteServiceAccountDialog.vue';
import ServiceAccountsTable from '../components/ServiceAccountsTable.vue';
import { useImpersonationStore } from '../impersonation.store';
import {
	CREATE_SERVICE_ACCOUNT_MODAL_KEY,
	SERVICE_ACCOUNT_ACTIONS,
} from '../serviceAccounts.constants';
import { useServiceAccountsStore } from '../serviceAccounts.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const uiStore = useUIStore();
const rolesStore = useRolesStore();
const serviceAccountsStore = useServiceAccountsStore();
const impersonationStore = useImpersonationStore();

const tableOptions = ref<TableOptions>({ page: 0, itemsPerPage: 10, sortBy: [] });
const creating = ref(false);
const submitting = ref(false);
const updatingRoleId = ref<string | null>(null);
const actAsTarget = ref<ServiceAccount | null>(null);
const deleteTarget = ref<ServiceAccount | null>(null);
const credentialTarget = ref<ServiceAccount | null>(null);

// `state`/`isLoading` are already unwrapped — pinia's `reactive()` on the store's
// return value deep-unwraps the refs `useAsyncState` hands back.
const list = computed(() => serviceAccountsStore.serviceAccountsList.state);
const loading = computed(() => serviceAccountsStore.serviceAccountsList.isLoading);
const hasAny = computed(() => list.value.count > 0);

const canCreate = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'serviceAccount:create' } }),
);
const canDelete = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'serviceAccount:delete' } }),
);
const canUpdate = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'serviceAccount:update' } }),
);
const canImpersonate = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'serviceAccount:impersonate' } }),
);
const canManageCredentials = computed(() =>
	hasPermission(['role'], { role: [ROLE.Owner, ROLE.Admin] }),
);

const actions = computed<Array<UserAction<ServiceAccount>>>(() => [
	{
		label: i18n.baseText('settings.serviceAccounts.actions.actAs'),
		value: SERVICE_ACCOUNT_ACTIONS.IMPERSONATE,
		// Belt and braces beyond the route's `rbac` middleware: an admin-roled
		// service account would otherwise be offered nested impersonation here.
		guard: (row) => canImpersonate.value && !impersonationStore.isImpersonating && !row.disabled,
	},
	{
		label: i18n.baseText('settings.serviceAccounts.actions.disable'),
		value: SERVICE_ACCOUNT_ACTIONS.DISABLE,
		guard: (row) => canUpdate.value && !row.disabled,
	},
	{
		label: i18n.baseText('settings.serviceAccounts.actions.enable'),
		value: SERVICE_ACCOUNT_ACTIONS.ENABLE,
		guard: (row) => canUpdate.value && Boolean(row.disabled),
	},
	{
		label: i18n.baseText('settings.serviceAccounts.actions.createCredential'),
		value: SERVICE_ACCOUNT_ACTIONS.CREATE_CREDENTIAL,
		guard: () => canManageCredentials.value,
	},
	{
		label: i18n.baseText('settings.serviceAccounts.actions.delete'),
		value: SERVICE_ACCOUNT_ACTIONS.DELETE,
		guard: () => canDelete.value,
	},
]);

const fetch = async () => {
	const { page = 0, itemsPerPage = 10, sortBy = [] } = tableOptions.value;
	try {
		await serviceAccountsStore.serviceAccountsList.execute(0, {
			skip: page * itemsPerPage,
			take: itemsPerPage,
			sortBy: sortBy.map(({ id, desc }) => `${id}:${desc ? 'desc' : 'asc'}`),
		} as never);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts'));
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.serviceAccounts'));
	await Promise.all([fetch(), rolesStore.fetchRoles()]);
});

const findById = (id: string) => list.value.items.find((item) => item.id === id) ?? null;

const onTableOptionsUpdate = async (options: TableOptions) => {
	tableOptions.value = options;
	await fetch();
};

const onCreate = async ({ name, role }: { name: string; role: string }) => {
	submitting.value = true;
	try {
		await serviceAccountsStore.create({ name, role });
		uiStore.closeModal(CREATE_SERVICE_ACCOUNT_MODAL_KEY);
		toast.showMessage({
			title: i18n.baseText('settings.serviceAccounts.createModal.success'),
			type: 'success',
		});
		await fetch();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.createModal.title'));
	} finally {
		submitting.value = false;
	}
};

const onRoleChange = async ({ role, userId }: { role: string; userId: string }) => {
	updatingRoleId.value = userId;
	try {
		await serviceAccountsStore.changeRole(userId, role);
		toast.showMessage({
			title: i18n.baseText('settings.serviceAccounts.role.success'),
			type: 'success',
		});
		await fetch();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.table.header.role'));
	} finally {
		updatingRoleId.value = null;
	}
};

const setDisabled = async (id: string, disabled: boolean) => {
	try {
		await serviceAccountsStore.update(id, { disabled });
		toast.showMessage({
			title: i18n.baseText(
				disabled
					? 'settings.serviceAccounts.disable.success'
					: 'settings.serviceAccounts.enable.success',
			),
			type: 'success',
		});
		await fetch();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts'));
	}
};

const onAction = async ({ action, userId }: { action: string; userId: string }) => {
	const serviceAccount = findById(userId);
	if (!serviceAccount) return;

	switch (action) {
		case SERVICE_ACCOUNT_ACTIONS.IMPERSONATE:
			// The transition discards the SPA, so unsaved work would be lost.
			if (uiStore.stateIsDirty) {
				toast.showMessage({
					title: i18n.baseText('settings.serviceAccounts.actAs.unsavedChanges'),
					type: 'warning',
				});
				return;
			}
			actAsTarget.value = serviceAccount;
			break;
		case SERVICE_ACCOUNT_ACTIONS.DISABLE:
			await setDisabled(userId, true);
			break;
		case SERVICE_ACCOUNT_ACTIONS.ENABLE:
			await setDisabled(userId, false);
			break;
		case SERVICE_ACCOUNT_ACTIONS.DELETE:
			deleteTarget.value = serviceAccount;
			break;
		case SERVICE_ACCOUNT_ACTIONS.CREATE_CREDENTIAL:
			credentialTarget.value = serviceAccount;
			break;
	}
};

const onConfirmActAs = async () => {
	if (!actAsTarget.value) return;
	creating.value = true;
	try {
		await impersonationStore.start(actAsTarget.value.id);
	} catch (error) {
		creating.value = false;
		actAsTarget.value = null;
		toast.showError(error, i18n.baseText('settings.serviceAccounts.actions.actAs'));
	}
};

const onConfirmDelete = async () => {
	if (!deleteTarget.value) return;
	const { id } = deleteTarget.value;
	submitting.value = true;
	try {
		await serviceAccountsStore.remove(id);
		toast.showMessage({
			title: i18n.baseText('settings.serviceAccounts.delete.success'),
			type: 'success',
		});
		await fetch();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.serviceAccounts.delete.confirm'));
	} finally {
		submitting.value = false;
		deleteTarget.value = null;
	}
};

const openCreateModal = () => uiStore.openModal(CREATE_SERVICE_ACCOUNT_MODAL_KEY);
</script>

<template>
	<N8nSettingsLayout full-width>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.serviceAccounts')"
			:show-docs-link="false"
			data-test-id="service-accounts-header"
		>
			<template #description>
				<N8nText size="medium" color="text-base">
					{{ i18n.baseText('settings.serviceAccounts.description') }}
				</N8nText>
			</template>
		</N8nSettingsPageHeader>

		<!--
			The create action sits above the table, as on the API keys page. It cannot live
			in the header: N8nSettingsPageHeader has no `actions` slot, so a button passed
			there renders nowhere and the only way to create one would be the empty state.
		-->
		<div v-if="hasAny && canCreate" :class="$style.toolbar">
			<N8nButton
				:label="i18n.baseText('settings.serviceAccounts.create')"
				size="medium"
				data-test-id="create-service-account-button"
				@click="openCreateModal"
			/>
		</div>

		<ServiceAccountsTable
			v-if="hasAny"
			v-model:table-options="tableOptions"
			:data="list"
			:actions="actions"
			:loading="loading"
			:updating-role-id="updatingRoleId"
			@update:options="onTableOptionsUpdate"
			@update:role="onRoleChange"
			@action="onAction"
		/>
		<div v-else data-test-id="service-accounts-empty-state">
			<N8nEmptyState
				:heading="i18n.baseText('settings.serviceAccounts.empty.title')"
				:description="i18n.baseText('settings.serviceAccounts.empty.description')"
				:icon="{ type: 'icon', value: 'user-round-key' }"
				:button-text="canCreate ? i18n.baseText('settings.serviceAccounts.create') : undefined"
				@click:button="openCreateModal"
			/>
		</div>

		<CreateServiceAccountModal
			:modal-name="CREATE_SERVICE_ACCOUNT_MODAL_KEY"
			:loading="submitting"
			@submit="onCreate"
		/>
		<ActAsServiceAccountDialog
			:service-account="actAsTarget"
			:open="actAsTarget !== null"
			:loading="creating"
			@confirm="onConfirmActAs"
			@cancel="actAsTarget = null"
			@update:open="!$event && (actAsTarget = null)"
		/>
		<DeleteServiceAccountDialog
			:service-account="deleteTarget"
			:open="deleteTarget !== null"
			:loading="submitting"
			@confirm="onConfirmDelete"
			@cancel="deleteTarget = null"
			@update:open="!$event && (deleteTarget = null)"
		/>
		<CreateServiceAccountCredentialModal
			:service-account="credentialTarget"
			:open="credentialTarget !== null"
			@update:open="!$event && (credentialTarget = null)"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.toolbar {
	display: flex;
	justify-content: flex-end;
	width: 100%;
	margin-bottom: var(--spacing--sm);
}
</style>
