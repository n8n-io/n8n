import type { InstanceTypeAccessResponse } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { shallowReactive } from 'vue';

import { useTypeUsage } from './useTypeUsage';
import {
	fetchCredentialTypeUsage,
	fetchInstancePolicy,
	fetchInstanceAccess,
	fetchNodeTypeUsage,
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
	/** `accessError` is set when the policy saved but the access of its types could not be read. */
	| { status: 'saved'; warnings: PolicyRuleWarnings; accessError?: unknown }
	/**
	 * The store now holds the newer policy, and nothing was saved. `accessError` is set when the
	 * access of its types could not be read.
	 */
	| { status: 'changed'; accessError?: unknown }
	/** Queued before a `changed` save of the same kind, so it was not sent. */
	| { status: 'dropped' }
	/**
	 * The server edits a policy in place only when it has one document of its own. `sent` is false
	 * when the store already knew this and did not send the save.
	 */
	| { status: 'notEditable'; sent: boolean }
	| { status: 'failed'; error: unknown };

export type InstancePolicyLoadResult = { errors: unknown[]; accessErrors: unknown[] };

type LoadKindResult = { error: unknown; accessError: unknown };

type PolicyByKind = { [K in RestrictedTypeKind]: InstancePolicy<K> | null };

type TypeAccessEntry = InstanceTypeAccessResponse['types'][number];

/** The access of each type, read from the server for one policy version. */
type TypeAccessSnapshot = { version: number; types: ReadonlyMap<string, TypeAccessEntry> };

function toTypeAccess(response: InstanceTypeAccessResponse): TypeAccessSnapshot {
	return {
		version: response.version,
		types: new Map(response.types.map((type) => [type.name, type])),
	};
}

const isConflict = (error: unknown) =>
	error instanceof ResponseError && error.httpStatusCode === 409;

export const useInstancePolicyStore = defineStore(INSTANCE_POLICY_STORE_ID, () => {
	const rootStore = useRootStore();
	const typeAvailabilityStore = useTypeAvailabilityPoliciesStore();

	// Typed as the plain map, so that `policies[kind]` resolves to `InstancePolicy<K>` for a generic kind.
	const policies: PolicyByKind = shallowReactive({ node: null, credential: null });
	const loadStates = shallowReactive<Record<RestrictedTypeKind, InstancePolicyLoadState>>({
		node: 'idle',
		credential: 'idle',
	});
	const notEditable = shallowReactive<Record<RestrictedTypeKind, boolean>>({
		node: false,
		credential: false,
	});

	// Saves of one kind run one at a time, so each sends the version that the previous save returned.
	const saveQueues: Record<RestrictedTypeKind, Promise<unknown>> = {
		node: Promise.resolve(),
		credential: Promise.resolve(),
	};
	// A conflict increments it, so a save queued before the conflict does not apply a change that
	// the admin made on the old policy.
	const generations: Record<RestrictedTypeKind, number> = { node: 0, credential: 0 };
	const loadRequests: Record<RestrictedTypeKind, number> = { node: 0, credential: 0 };
	// The installed types can change while the policy version stays, so only the order of the reads
	// tells which answer is current.
	const accessReads = { node: useLatestFetch(), credential: useLatestFetch() };

	// After a failed read the snapshot can be older than the policy. A reader that must not show a
	// saved change as lost compares the two versions.
	const typeAccess = shallowReactive<Record<RestrictedTypeKind, TypeAccessSnapshot | null>>({
		node: null,
		credential: null,
	});
	const accessLoading = shallowReactive<Record<RestrictedTypeKind, boolean>>({
		node: false,
		credential: false,
	});
	// A failed read can leave a snapshot of the current version that misses the types installed since.
	const accessReadFailed: Record<RestrictedTypeKind, boolean> = { node: false, credential: false };

	// Held here and not in each tab, because an access dialog shows the usage of both kinds.
	const usage = {
		node: useTypeUsage(async () => await fetchNodeTypeUsage(rootStore.restApiContext)),
		credential: useTypeUsage(async () => await fetchCredentialTypeUsage(rootStore.restApiContext)),
	};

	const loadUsage = async (kind: RestrictedTypeKind) => await usage[kind].load();

	/** Reads the usage counts of each kind that has none yet, for example after a failed read. */
	async function loadMissingUsage(kinds: readonly RestrictedTypeKind[]): Promise<void> {
		await Promise.all(
			kinds.filter((kind) => !usage[kind].isLoaded()).map(async (kind) => await loadUsage(kind)),
		);
	}

	const usageOf = (kind: RestrictedTypeKind, typeName: string) => usage[kind].usageOf(typeName);

	/**
	 * Reads the access of the types. Only the latest read of a kind stores its answer or returns its
	 * error, so a late answer to an older read changes nothing. Returns the read error, or `null`.
	 */
	async function loadTypeAccess(kind: RestrictedTypeKind): Promise<unknown> {
		const isLatest = accessReads[kind].next();
		accessLoading[kind] = true;
		try {
			const access = toTypeAccess(await fetchInstanceAccess(rootStore.restApiContext, kind));
			if (isLatest()) {
				typeAccess[kind] = access;
				accessReadFailed[kind] = false;
			}
			return null;
		} catch (error) {
			if (!isLatest()) return null;
			accessReadFailed[kind] = true;
			return error;
		} finally {
			if (isLatest()) accessLoading[kind] = false;
		}
	}

	function accept<K extends RestrictedTypeKind>(kind: K, policy: InstancePolicy<K>): void {
		const current = policies[kind];
		// Versions only increase, so a late answer to an older request does not replace a newer policy.
		if (current && policy.version < current.version) return;

		policies[kind] = policy;
		if (current && policy.version > current.version) {
			// A new version may come from a fix to the policy documents, so the next save tries again.
			notEditable[kind] = false;
			void typeAvailabilityStore.reload();
		}
	}

	/**
	 * Reads the access of the types again when it is older than the policy, because the server
	 * evaluates the rules, or when the last read failed. Returns the read error, or `null`.
	 */
	async function syncTypeAccess(kind: RestrictedTypeKind): Promise<unknown> {
		const current = policies[kind];
		if (!current) return null;
		if (typeAccess[kind]?.version === current.version && !accessReadFailed[kind]) return null;
		return await loadTypeAccess(kind);
	}

	async function loadKind<K extends RestrictedTypeKind>(kind: K): Promise<LoadKindResult> {
		// Only the latest load of a kind sets its state and reports errors, so an older load that ends
		// late does not mark a newer loaded policy as failed or show an outdated error.
		const request = ++loadRequests[kind];
		loadStates[kind] = 'loading';
		try {
			const policy = await fetchInstancePolicy(rootStore.restApiContext, kind);
			accept(kind, policy);
			const accessError = await loadTypeAccess(kind);
			if (request !== loadRequests[kind]) return { error: null, accessError: null };

			loadStates[kind] = 'loaded';
			return { error: null, accessError };
		} catch (error) {
			if (request !== loadRequests[kind]) return { error: null, accessError: null };

			loadStates[kind] = 'failed';
			return { error, accessError: null };
		}
	}

	/**
	 * Loads the policy of each kind. Returns the errors of the kinds that failed to load, and the
	 * errors of the access reads of the kinds that loaded.
	 */
	async function load(kinds: readonly RestrictedTypeKind[]): Promise<InstancePolicyLoadResult> {
		const results = await Promise.all(kinds.map(async (kind) => await loadKind(kind)));
		return {
			errors: results.flatMap(({ error }) => (error === null ? [] : [error])),
			accessErrors: results.flatMap(({ accessError }) =>
				accessError === null ? [] : [accessError],
			),
		};
	}

	/** Reads the access of each kind again when it is missing, older than the policy, or its last read failed. Returns the read errors. */
	async function loadAccess(kinds: readonly RestrictedTypeKind[]): Promise<unknown[]> {
		const errors = await Promise.all(kinds.map(async (kind) => await syncTypeAccess(kind)));
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
		// A rejected save must not block the saves after it.
		saveQueues[kind] = run.catch(() => undefined);
		const result = await run;
		if (result.status !== 'saved' && result.status !== 'changed') return result;

		// Outside the queue, so the next save does not wait for a read that its own result replaces.
		const accessError = await syncTypeAccess(kind);
		return accessError === null ? result : { ...result, accessError };
	}

	async function runSave<K extends RestrictedTypeKind>(
		kind: K,
		update: (policy: InstancePolicy<K>) => InstancePolicyContent<K>,
		generation: number,
	): Promise<InstancePolicySaveResult> {
		if (generation !== generations[kind]) return { status: 'dropped' };
		if (notEditable[kind]) return { status: 'notEditable', sent: false };

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

		// Only a new version means that the policy changed. A 409 at the same version is the server
		// refusing the in-place edit, which a load does not fix.
		if (latest.version === sentVersion) {
			notEditable[kind] = true;
			return { status: 'notEditable', sent: true };
		}

		generations[kind]++;
		accept(kind, latest);
		return { status: 'changed' };
	}

	return {
		policies,
		loadStates,
		notEditable,
		typeAccess,
		accessLoading,
		load,
		loadAccess,
		loadUsage,
		loadMissingUsage,
		usageOf,
		save,
	};
});
