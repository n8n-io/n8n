import type { PolicyAction, TypeUsage } from '@n8n/api-types';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

import {
	RESTRICT_REVIEW_STORE_ID,
	type RestrictedTypeKind,
} from '../../type-availability-policies.constants';
import { useInstancePolicyStore } from '../instance-policy.store';

export type RestrictReviewRequest = {
	kind: RestrictedTypeKind;
	name: string;
	label: string;
	/** `null` when the usage counts did not load. */
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
	// The latest change of each type. A review applies only while its change is the latest one.
	const latestChange = new Map<string, symbol>();

	function resolve(confirmed: boolean) {
		const open = answer;
		answer = undefined;
		request.value = null;
		open?.resolve(confirmed);
	}

	/** Cancels the open review and each review that still loads its counts. */
	function cancelAll() {
		latestChange.clear();
		resolve(false);
	}

	/**
	 * Starts a change of the access of a type. Returns `true` at once when the change can apply
	 * with no review: it does not restrict, or no workflow uses the type. Otherwise returns a
	 * promise that resolves `true` when the admin confirms the review. A later change of the same
	 * type, for example to Allowed while the counts load, makes this review resolve `false`.
	 */
	function reviewChange(
		kind: RestrictedTypeKind,
		name: string,
		access: PolicyAction,
		label: string,
	): true | Promise<boolean> {
		const key = `${kind}:${name}`;
		const change = Symbol(key);
		latestChange.set(key, change);
		if (access !== 'deny') return true;
		// An unused type applies at once, so its row does not wait for a review.
		if (instancePolicy.usageOf(kind, name)?.uses === 0) return true;
		return confirmRestrict(kind, name, label, () => latestChange.get(key) === change);
	}

	async function confirmRestrict(
		kind: RestrictedTypeKind,
		name: string,
		label: string,
		isLatest: () => boolean,
	): Promise<boolean> {
		// A related type of the other kind can have no counts yet.
		await instancePolicy.loadMissingUsage([kind]);
		if (!isLatest()) return false;
		const usage = instancePolicy.usageOf(kind, name);
		if (usage?.uses === 0) return true;

		// Only one review shows at a time, so a new one cancels the open one.
		resolve(false);
		request.value = { kind, name, label, usage };
		answer = createDeferredPromise<boolean>();
		const confirmed = await answer.promise;
		return confirmed && isLatest();
	}

	return { request, reviewChange, resolve, cancelAll };
});
