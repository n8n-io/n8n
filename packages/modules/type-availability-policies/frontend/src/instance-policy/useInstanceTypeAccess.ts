import type { PolicyAction } from '@n8n/api-types';
import { computed, onMounted, shallowReactive, watch } from 'vue';

import { useRestrictReviewStore } from './restrict-review/restrict-review.store';
import { isTypeAccessEditable } from './typeAccessRule';
import { useInstancePolicy } from './useInstancePolicy';
import type { RestrictedTypeKind } from '../type-availability-policies.constants';

export type InstanceTypeAccessRow = {
	name: string;
	access: PolicyAction;
	/** The rule that decides the access, or `null` when the default action decides it. */
	matchedRuleId: string | null;
	/** See `isTypeAccessEditable`. */
	editable: boolean;
	/** A restriction of the type waits for its usage counts before it applies or asks. */
	checking: boolean;
};

type PendingChange = { access: PolicyAction; savedVersion?: number };

/** The access of every type of one kind under the instance policy, for a tab of the admin page. */
export function useInstanceTypeAccess(kind: RestrictedTypeKind) {
	const instancePolicy = useInstancePolicy();
	const restrictReview = useRestrictReviewStore();

	// A save that does not apply drops its entry, so the row goes back to the server value.
	const pending = shallowReactive(new Map<string, PendingChange>());

	const types = computed<InstanceTypeAccessRow[]>(() =>
		Array.from(instancePolicy.typeAccess[kind]?.types.values() ?? [], (type) => ({
			name: type.name,
			access: pending.get(type.name)?.access ?? type.access,
			matchedRuleId: type.matchedRuleId,
			editable: isTypeAccessEditable(type),
			checking: restrictReview.isChecking(kind, type.name),
		})),
	);

	const loading = computed(
		() => instancePolicy.accessLoading[kind] || instancePolicy.loadStates[kind] === 'loading',
	);

	// A saved change shows until the access of the version that it saved arrives.
	watch(
		() => instancePolicy.typeAccess[kind]?.version,
		(version) => {
			if (version === undefined) return;
			for (const [name, change] of pending) {
				if (change.savedVersion !== undefined && version >= change.savedVersion) {
					pending.delete(name);
				}
			}
		},
	);

	// A read that failed before the tab opened gets another try.
	onMounted(() => {
		void instancePolicy.loadAccess();
	});

	/** `label` names the type in the review that asks before a type in use is restricted. */
	async function changeAccess(typeName: string, access: PolicyAction, label: string) {
		// A refused review leaves no pending entry, so the row keeps its access.
		const approved = restrictReview.reviewChange(kind, typeName, access, label);
		if (approved !== true && !(await approved)) return;

		const change: PendingChange = { access };
		pending.set(typeName, change);
		const result = await instancePolicy.setAccess(kind, typeName, access);

		// A later pick on the same row owns the entry now.
		if (pending.get(typeName) !== change) return;
		const savedVersion = instancePolicy.policies[kind]?.version;
		const accessVersion = instancePolicy.typeAccess[kind]?.version ?? -1;
		if (result.status === 'saved' && savedVersion !== undefined && accessVersion < savedVersion) {
			change.savedVersion = savedVersion;
		} else {
			pending.delete(typeName);
		}
	}

	return { types, loading, changeAccess };
}
