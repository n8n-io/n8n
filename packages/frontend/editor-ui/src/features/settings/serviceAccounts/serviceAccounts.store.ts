import type { ServiceAccountsList, UsersListFilterDto } from '@n8n/api-types';
import * as serviceAccountsApi from '@n8n/rest-api-client/api/service-accounts';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAsyncState } from '@vueuse/core';
import { defineStore } from 'pinia';

const EMPTY_LIST: ServiceAccountsList = { count: 0, items: [] };

/**
 * Separate from the users store on purpose: that store lives in the published
 * `@n8n/stores` package and its `usersList` `useAsyncState` is single-instance,
 * so sharing it would leave service-account rows in the Users table after
 * navigating away.
 */
export const useServiceAccountsStore = defineStore(STORES.SERVICE_ACCOUNTS, () => {
	const rootStore = useRootStore();

	const serviceAccountsList = useAsyncState(
		async (filter?: UsersListFilterDto) =>
			await serviceAccountsApi.getServiceAccounts(rootStore.restApiContext, filter),
		EMPTY_LIST,
		{ immediate: false, resetOnExecute: false },
	);

	const create = async (payload: { name: string; role?: string }) =>
		await serviceAccountsApi.createServiceAccount(rootStore.restApiContext, payload);

	const update = async (id: string, payload: { name?: string; disabled?: boolean }) =>
		await serviceAccountsApi.updateServiceAccount(rootStore.restApiContext, id, payload);

	const changeRole = async (id: string, newRoleName: string) =>
		await serviceAccountsApi.changeServiceAccountRole(rootStore.restApiContext, id, newRoleName);

	const remove = async (id: string) =>
		await serviceAccountsApi.deleteServiceAccount(rootStore.restApiContext, id);

	return {
		serviceAccountsList,
		create,
		update,
		changeRole,
		remove,
	};
});
