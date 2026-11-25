import type { PolicyAction } from '@n8n/api-types';
import { shallowReactive } from 'vue';

import { usePolicyAdminAccess } from '../../composables/usePolicyAdminAccess';
import type { RestrictedTypeKind } from '../../type-availability-policies.constants';
import { isTypeAccessEditable } from '../typeAccessRule';
import { useRestrictReviewStore } from '../restrict-review/restrict-review.store';
import { useInstancePolicy } from '../useInstancePolicy';

/** Reads and changes the access of single types for the access dialogs. */
export function useTypeAccessEdits() {
	const { manageableKinds } = usePolicyAdminAccess();
	const instancePolicy = useInstancePolicy();
	const restrictReview = useRestrictReviewStore();

	// Shows the chosen access while its save runs. The store holds the access that the server read.
	// Each change owns its entry, so an earlier save that ends does not clear a later choice.
	const pending = shallowReactive(new Map<string, { action: PolicyAction }>());
	const keyOf = (kind: RestrictedTypeKind, name: string) => `${kind}:${name}`;

	// See `typeAccess` in the instance policy store: only access of the current version is shown.
	function currentTypeAccess(kind: RestrictedTypeKind) {
		const access = instancePolicy.typeAccess[kind];
		return access?.version === instancePolicy.policies[kind]?.version ? access : undefined;
	}

	function accessOf(kind: RestrictedTypeKind, name: string): PolicyAction | undefined {
		return (
			pending.get(keyOf(kind, name))?.action ?? currentTypeAccess(kind)?.types.get(name)?.access
		);
	}

	function isLocked(kind: RestrictedTypeKind, name: string): boolean {
		const type = currentTypeAccess(kind)?.types.get(name);
		return type !== undefined && !isTypeAccessEditable(type);
	}

	const canManage = (kind: RestrictedTypeKind) => manageableKinds.value.includes(kind);

	/** See `usageOf` in the instance policy store: `null` while the counts are not loaded. */
	const usageOf = (kind: RestrictedTypeKind, name: string) => instancePolicy.usageOf(kind, name);

	/** `label` names the type in the review that asks before a type in use is restricted. */
	async function setAccess(
		kind: RestrictedTypeKind,
		name: string,
		action: PolicyAction,
		label: string,
	) {
		const approved = restrictReview.reviewChange(kind, name, action, label);
		if (approved !== true && !(await approved)) return;

		const key = keyOf(kind, name);
		const change = { action };
		pending.set(key, change);
		try {
			await instancePolicy.setAccess(kind, name, action);
		} finally {
			if (pending.get(key) === change) pending.delete(key);
		}
	}

	return {
		accessOf,
		isLocked,
		isChecking: restrictReview.isChecking,
		canManage,
		usageOf,
		setAccess,
	};
}
