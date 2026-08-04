import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ImpersonationActor } from '@n8n/api-types';
import * as serviceAccountsApi from '@n8n/rest-api-client/api/service-accounts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Whether this browser session is currently acting as a service account, and if
 * so, who the human behind it is.
 *
 * Populated from `GET /rest/login` via a login hook, so it survives a page
 * refresh — without that the operator has no way to find the exit.
 */
export const useImpersonationStore = defineStore(STORES.IMPERSONATION, () => {
	const rootStore = useRootStore();

	const actor = ref<ImpersonationActor | null>(null);
	/** The service account being acted as. Mirrors `usersStore.currentUser`. */
	const serviceAccountName = ref<string | null>(null);

	const isImpersonating = computed(() => actor.value !== null);

	const actorName = computed(() => {
		if (!actor.value) return '';
		const fullName = [actor.value.firstName, actor.value.lastName].filter(Boolean).join(' ');
		return fullName || actor.value.email || '';
	});

	const setState = (state: { actor?: ImpersonationActor | null; serviceAccountName?: string }) => {
		actor.value = state.actor ?? null;
		serviceAccountName.value = state.actor ? (state.serviceAccountName ?? null) : null;
	};

	const reset = () => setState({});

	/**
	 * Start acting as a service account.
	 *
	 * Hard-navigates rather than swapping stores in place.
	 * `initializeAuthenticatedFeatures` is guarded by a module-scoped flag nothing
	 * resets, and it calls non-idempotent `registerModule*()` registries: skip it
	 * and the service account sees the human's projects and favourites; force it
	 * and the registries double-register. A hard navigation is the same code path
	 * as a cold login, so it is correct by construction.
	 */
	const start = async (serviceAccountId: string, redirectTo = '/home/workflows') => {
		await serviceAccountsApi.startImpersonation(rootStore.restApiContext, serviceAccountId);
		window.location.assign(redirectTo);
	};

	/**
	 * Stop acting as a service account.
	 *
	 * Never route this through `usersStore.logout()`: that ends the session
	 * server-side and clears the browser-id key, which would invalidate the
	 * browser-id binding on the restored session.
	 */
	const stop = async (redirectTo = '/settings/service-accounts') => {
		await serviceAccountsApi.stopImpersonation(rootStore.restApiContext);
		window.location.assign(redirectTo);
	};

	return {
		actor,
		actorName,
		serviceAccountName,
		isImpersonating,
		setState,
		reset,
		start,
		stop,
	};
});
