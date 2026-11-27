import type { PolicyAction, TypeUsage } from '@n8n/api-types';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { runSerially } from '@n8n/utils/run-serially';
import { defineStore } from 'pinia';
import { shallowReactive, shallowRef } from 'vue';

import {
	RESTRICT_REVIEW_STORE_ID,
	type RestrictedTypeKind,
} from '../../type-availability-policies.constants';
import { useInstancePolicyStore } from '../instance-policy.store';

export type RestrictReviewRequest = {
	kind: RestrictedTypeKind;
	name: string;
	label: string;
	usage: TypeUsage | null;
};

/** One review for a bulk restriction. `items` are the selected types that workflows may use. */
export type BulkRestrictReviewRequest = {
	kind: RestrictedTypeKind;
	items: Array<{ name: string; label: string; usage: TypeUsage | null }>;
	/** How many types the admin restricts, with the unused ones. */
	total: number;
};

/**
 * The review before an admin restricts a type that is in use. One review shows at a time on the
 * page. A store saves wiring provide/inject through the tabs and the access dialogs, so the page
 * calls `cancelAll` when it closes.
 */
export const useRestrictReviewStore = defineStore(RESTRICT_REVIEW_STORE_ID, () => {
	const instancePolicy = useInstancePolicyStore();

	const request = shallowRef<RestrictReviewRequest | null>(null);
	const bulkRequest = shallowRef<BulkRestrictReviewRequest | null>(null);
	let answer: IDeferredPromise<boolean> | undefined;
	// The latest change of each type. `checking` marks a restriction that waits for its counts or
	// its turn, so that its control shows it.
	const latestChange = shallowReactive(new Map<string, { id: symbol; checking: boolean }>());
	const turns = new Map<string, Promise<unknown>>();

	/** `true` while a restriction of the type waits and its review is not open yet. */
	const isChecking = (kind: RestrictedTypeKind, name: string) =>
		latestChange.get(`${kind}:${name}`)?.checking === true;

	function resolve(confirmed: boolean) {
		const open = answer;
		answer = undefined;
		request.value = null;
		bulkRequest.value = null;
		open?.resolve(confirmed);
	}

	function cancelAll() {
		latestChange.clear();
		resolve(false);
	}

	/**
	 * Starts a change of the access of a type. Returns `true` at once when the change does not
	 * restrict. Otherwise reads the usage again and returns a promise that resolves `true` when no
	 * workflow uses the type or the admin confirms the review. A later change of the same type, for
	 * example to Allowed while the counts load, makes this review resolve `false`.
	 */
	function reviewChange(
		kind: RestrictedTypeKind,
		name: string,
		access: PolicyAction,
		label: string,
	): true | Promise<boolean> {
		const id = startChange(kind, name, access === 'deny');
		if (access !== 'deny') return true;
		return confirmRestrict(kind, [{ name, label, id }], ([type]) => {
			request.value = { kind, ...type };
		});
	}

	/**
	 * Asks once before the admin restricts several types, with the same rules as `reviewChange`. The
	 * review lists only the types that workflows may use. A later change of one of the types makes
	 * it resolve `false`.
	 */
	async function reviewBulkRestrict(
		kind: RestrictedTypeKind,
		types: ReadonlyArray<{ name: string; label: string }>,
	): Promise<boolean> {
		const changes = types.map((type) => ({ ...type, id: startChange(kind, type.name, true) }));
		return await confirmRestrict(kind, changes, (items) => {
			bulkRequest.value = { kind, items, total: types.length };
		});
	}

	/** Ends a restriction of each type that still waits for its review, because a newer change replaces it. */
	function supersede(kind: RestrictedTypeKind, names: readonly string[]): void {
		for (const name of names) {
			if (latestChange.has(`${kind}:${name}`)) startChange(kind, name, false);
		}
	}

	function startChange(kind: RestrictedTypeKind, name: string, checking: boolean): symbol {
		const id = Symbol(`${kind}:${name}`);
		latestChange.set(`${kind}:${name}`, { id, checking });
		return id;
	}

	async function confirmRestrict(
		kind: RestrictedTypeKind,
		changes: Array<{ name: string; label: string; id: symbol }>,
		open: (inUse: Array<{ name: string; label: string; usage: TypeUsage | null }>) => void,
	): Promise<boolean> {
		const isLatestChange = ({ name, id }: { name: string; id: symbol }) =>
			latestChange.get(`${kind}:${name}`)?.id === id;
		const isLatest = () => changes.every(isLatestChange);
		const stopChecking = () => {
			for (const change of changes) {
				if (isLatestChange(change)) {
					latestChange.set(`${kind}:${change.name}`, { id: change.id, checking: false });
				}
			}
		};

		// The counts loaded with the page can be old: another tab can add the type to a workflow.
		await instancePolicy.loadUsage(kind);
		// A type whose counts did not load may be in use.
		const inUse = changes
			.map(({ name, label }) => ({ name, label, usage: instancePolicy.usageOf(kind, name) }))
			.filter(({ usage }) => usage === null || usage.uses > 0);
		if (!isLatest() || inUse.length === 0) {
			stopChecking();
			return isLatest();
		}

		const confirmed = await runSerially(turns, 'review', async () => {
			stopChecking();
			if (!isLatest()) return false;
			open(inUse);
			answer = createDeferredPromise<boolean>();
			return await answer.promise;
		});
		return confirmed && isLatest();
	}

	return {
		request,
		bulkRequest,
		isChecking,
		reviewChange,
		reviewBulkRestrict,
		supersede,
		resolve,
		cancelAll,
	};
});
