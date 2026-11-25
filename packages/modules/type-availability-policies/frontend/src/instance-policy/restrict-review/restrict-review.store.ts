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

/**
 * The review before an admin restricts a type that is in use. One review shows at a time on the
 * page. A store saves wiring provide/inject through the tabs and the access dialogs, so the page
 * calls `cancelAll` when it closes.
 */
export const useRestrictReviewStore = defineStore(RESTRICT_REVIEW_STORE_ID, () => {
	const instancePolicy = useInstancePolicyStore();

	const request = shallowRef<RestrictReviewRequest | null>(null);
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
		const id = Symbol(`${kind}:${name}`);
		latestChange.set(`${kind}:${name}`, { id, checking: access === 'deny' });
		if (access !== 'deny') return true;
		return confirmRestrict(kind, name, label, id);
	}

	async function confirmRestrict(
		kind: RestrictedTypeKind,
		name: string,
		label: string,
		id: symbol,
	): Promise<boolean> {
		const key = `${kind}:${name}`;
		const isLatest = () => latestChange.get(key)?.id === id;
		const stopChecking = () => {
			if (isLatest()) latestChange.set(key, { id, checking: false });
		};

		// The counts loaded with the page can be old: another tab can add the type to a workflow.
		await instancePolicy.loadUsage(kind);
		const usage = instancePolicy.usageOf(kind, name);
		if (!isLatest() || usage?.uses === 0) {
			stopChecking();
			return isLatest();
		}

		const confirmed = await runSerially(turns, 'review', async () => {
			stopChecking();
			if (!isLatest()) return false;
			request.value = { kind, name, label, usage };
			answer = createDeferredPromise<boolean>();
			return await answer.promise;
		});
		return confirmed && isLatest();
	}

	return { request, isChecking, reviewChange, resolve, cancelAll };
});
