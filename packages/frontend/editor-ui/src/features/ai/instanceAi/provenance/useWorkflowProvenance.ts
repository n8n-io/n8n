import { readonly, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { InstanceAiWorkflowProvenance } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { fetchWorkflowProvenance } from './provenance.api';

type Provenance = InstanceAiWorkflowProvenance;

// A found record never changes (one record for each workflow), so it stays for
// the session. "Not built by the Assistant" is not kept: the Assistant records
// a workflow only when its build is kept, which can happen later in the session.
const foundRecords = new Map<string, Provenance>();

// Shares one request between headers that ask for the same workflow together.
const inFlightRequests = new Map<string, Promise<Provenance | null>>();

/** Clears the session cache. Tests call this between cases. */
export function clearWorkflowProvenanceCache() {
	foundRecords.clear();
	inFlightRequests.clear();
}

// `canOpenThread` depends on the viewer, and a new sign-in does not reload the page.
function cacheKey(userId: string | null, workflowId: string) {
	return `${userId ?? ''}:${workflowId}`;
}

async function requestProvenance(
	key: string,
	load: () => Promise<Provenance | null>,
): Promise<Provenance | null> {
	const pending = inFlightRequests.get(key);
	if (pending) return await pending;

	const request = load()
		.then((record) => {
			// A cache clear during the request makes this result out of date.
			if (record && inFlightRequests.get(key) === request) foundRecords.set(key, record);
			return record;
		})
		.finally(() => {
			if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
		});
	inFlightRequests.set(key, request);
	return await request;
}

/**
 * Tells which Assistant chat built a workflow. `provenance` is null while the
 * request runs, when the Assistant did not build the workflow, when `enabled`
 * is false, and when the request fails. A failure shows nothing to the user,
 * because the information is optional.
 */
export function useWorkflowProvenance(
	workflowId: MaybeRefOrGetter<string>,
	enabled: MaybeRefOrGetter<boolean>,
) {
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const provenance = ref<Provenance | null>(null);

	// Increments on each load, so a slow answer for an earlier workflow is ignored.
	let generation = 0;

	async function load() {
		generation++;
		const current = generation;
		provenance.value = null;

		const id = toValue(workflowId);
		if (!toValue(enabled) || !id) return;

		const key = cacheKey(usersStore.currentUserId, id);
		const cached = foundRecords.get(key);
		if (cached) {
			provenance.value = cached;
			return;
		}

		try {
			const record = await requestProvenance(
				key,
				async () => await fetchWorkflowProvenance(rootStore.restApiContext, id),
			);
			if (current === generation) provenance.value = record;
		} catch {
			// Not found, no access, Assistant off or offline: all mean "no badge".
		}
	}

	watch([() => toValue(workflowId), () => toValue(enabled)], load, { immediate: true });

	return { provenance: readonly(provenance) };
}
