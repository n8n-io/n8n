import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { shallowReactive } from 'vue';

import {
	fetchInstancePolicy,
	saveInstancePolicy,
	type InstancePolicy,
	type InstancePolicyContent,
	type PolicyRuleWarnings,
} from '../type-availability-policies.api';
import {
	INSTANCE_POLICY_STORE_ID,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

export type InstancePolicyLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

export type InstancePolicySaveResult =
	| { status: 'saved'; warnings: PolicyRuleWarnings }
	/** The policy changed after it was loaded. The store now holds the new policy, and nothing was saved. */
	| { status: 'changed' }
	/** Queued before a `changed` save of the same kind, so it was not sent. */
	| { status: 'dropped' }
	| { status: 'failed'; error: unknown };

type PolicyByKind = { [K in RestrictedTypeKind]: InstancePolicy<K> | null };

const isConflict = (error: unknown) =>
	error instanceof ResponseError && error.httpStatusCode === 409;

/**
 * The instance policy for each kind, for the admin pages. The kinds are independent: each has its
 * own version, load state and save queue.
 */
export const useInstancePolicyStore = defineStore(INSTANCE_POLICY_STORE_ID, () => {
	const rootStore = useRootStore();
	const typeAvailabilityStore = useTypeAvailabilityPoliciesStore();

	// Typed as the plain map, so that `policies[kind]` resolves to `InstancePolicy<K>` for a generic kind.
	const policies: PolicyByKind = shallowReactive({ node: null, credential: null });
	const loadStates = shallowReactive<Record<RestrictedTypeKind, InstancePolicyLoadState>>({
		node: 'idle',
		credential: 'idle',
	});

	// Saves of one kind run one at a time, so each sends the version that the previous save returned.
	const saveQueues: Record<RestrictedTypeKind, Promise<unknown>> = {
		node: Promise.resolve(),
		credential: Promise.resolve(),
	};
	// A conflict increments it, so a save queued before the conflict does not apply a change that
	// the admin made on the old policy.
	const generations: Record<RestrictedTypeKind, number> = { node: 0, credential: 0 };

	function accept<K extends RestrictedTypeKind>(kind: K, policy: InstancePolicy<K>): void {
		const current = policies[kind];
		// Versions only increase, so a late answer to an older request does not replace a newer policy.
		if (current && policy.version < current.version) return;

		policies[kind] = policy;
	}

	async function loadKind<K extends RestrictedTypeKind>(kind: K): Promise<unknown> {
		loadStates[kind] = 'loading';
		try {
			accept(kind, await fetchInstancePolicy(rootStore.restApiContext, kind));
			loadStates[kind] = 'loaded';
			return null;
		} catch (error) {
			loadStates[kind] = 'failed';
			return error;
		}
	}

	/** Loads the policy of each kind. Returns the errors of the kinds that failed to load. */
	async function load(kinds: readonly RestrictedTypeKind[]): Promise<unknown[]> {
		const errors = await Promise.all(kinds.map(async (kind) => await loadKind(kind)));
		return errors.filter((error) => error !== null);
	}

	/**
	 * Saves the policy that `update` makes from the current policy. `update` runs when the save
	 * starts, after the earlier saves of the same kind, so that it builds on their result.
	 */
	async function save<K extends RestrictedTypeKind>(
		kind: K,
		update: (policy: InstancePolicy<K>) => InstancePolicyContent<K>,
	): Promise<InstancePolicySaveResult> {
		const generation = generations[kind];
		const run = saveQueues[kind].then(async () => await runSave(kind, update, generation));
		saveQueues[kind] = run;
		return await run;
	}

	async function runSave<K extends RestrictedTypeKind>(
		kind: K,
		update: (policy: InstancePolicy<K>) => InstancePolicyContent<K>,
		generation: number,
	): Promise<InstancePolicySaveResult> {
		if (generation !== generations[kind]) return { status: 'dropped' };

		const current = policies[kind];
		if (!current) {
			return { status: 'failed', error: new Error(`The ${kind} policy is not loaded`) };
		}

		try {
			const result = await saveInstancePolicy(rootStore.restApiContext, kind, {
				...update(current),
				version: current.version,
			});
			accept(kind, result);
			// The builder surfaces in this tab show the restrictions of the instance policy too.
			void typeAvailabilityStore.reload();
			return { status: 'saved', warnings: result.warnings };
		} catch (error) {
			if (!isConflict(error)) return { status: 'failed', error };

			return await resolveConflict(kind, current.version, error);
		}
	}

	async function resolveConflict<K extends RestrictedTypeKind>(
		kind: K,
		sentVersion: number,
		error: unknown,
	): Promise<InstancePolicySaveResult> {
		let latest: InstancePolicy<K>;
		try {
			latest = await fetchInstancePolicy(rootStore.restApiContext, kind);
		} catch {
			return { status: 'failed', error };
		}

		// The server also answers 409 for a policy with several attached documents. A load does not
		// fix that, so only a new version means that another admin saved.
		if (latest.version === sentVersion) return { status: 'failed', error };

		generations[kind]++;
		accept(kind, latest);
		return { status: 'changed' };
	}

	return { policies, loadStates, load, save };
});
