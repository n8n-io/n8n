import type { PolicyAction, TypeUsage } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
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
	// A review that still loads its counts opens only if nothing cancelled it in the meantime.
	const latest = useLatestFetch();

	function resolve(confirmed: boolean) {
		const open = answer;
		answer = undefined;
		request.value = null;
		open?.resolve(confirmed);
	}

	/** Cancels the open review and each review that still loads its counts. */
	function cancelAll() {
		latest.invalidate();
		resolve(false);
	}

	/**
	 * `true` when the change restricts a type that is in use or that has unknown usage. A type that
	 * no workflow uses applies at once, so its row does not wait for a review.
	 */
	function needsReview(kind: RestrictedTypeKind, name: string, access: PolicyAction): boolean {
		if (access !== 'deny') return false;
		const usage = instancePolicy.usageOf(kind, name);
		return usage === null || usage.uses > 0;
	}

	/**
	 * Resolves `true` when the restriction can apply. A type with no usage applies at once. A type
	 * in use, or with unknown usage, waits for the admin to confirm.
	 */
	async function confirmRestrict(
		kind: RestrictedTypeKind,
		name: string,
		label: string,
	): Promise<boolean> {
		const isCurrent = latest.next();
		// A related type of the other kind can have no counts yet.
		await instancePolicy.loadMissingUsage([kind]);
		if (!isCurrent()) return false;
		const usage = instancePolicy.usageOf(kind, name);
		if (usage?.uses === 0) return true;

		// Only one review shows at a time, so a new one cancels the open one.
		resolve(false);
		request.value = { kind, name, label, usage };
		answer = createDeferredPromise<boolean>();
		return await answer.promise;
	}

	return { request, needsReview, confirmRestrict, resolve, cancelAll };
});
