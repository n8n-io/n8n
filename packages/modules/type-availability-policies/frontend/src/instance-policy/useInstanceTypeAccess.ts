import type { PolicyAction } from '@n8n/api-types';
import { computed, onMounted, ref, shallowReactive, watch } from 'vue';

import { useRestrictReviewStore } from './restrict-review/restrict-review.store';
import { isTypeAccessEditable } from './typeAccessRule';
import type { InstancePolicySaveResult } from './instance-policy.store';
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
		settle([[typeName, change]], result);
	}

	/**
	 * Gives the selected types the same access in one save. Types that cannot change here, or that
	 * already have the access, are left out. A restriction asks once for all the types in use.
	 * Returns `true` when the save went through.
	 */
	async function changeAccessMany(
		selected: ReadonlyArray<{ name: string; label: string }>,
		access: PolicyAction,
	): Promise<boolean> {
		const byName = new Map(types.value.map((type) => [type.name, type]));
		const editable = selected.flatMap((item) => {
			const type = byName.get(item.name);
			return type?.editable ? [{ item, type }] : [];
		});
		if (access !== 'deny') {
			restrictReview.supersede(
				kind,
				editable.map(({ item }) => item.name),
			);
		}

		const toChange = editable
			.filter(({ item, type }) => {
				// A save that still runs can fail, so its access does not count as the current access.
				const change = pending.get(item.name);
				return (
					type.access !== access || (change !== undefined && change.savedVersion === undefined)
				);
			})
			.map(({ item }) => item);
		if (toChange.length === 0) return false;
		const names = toChange.map(({ name }) => name);

		if (access === 'deny' && !(await restrictReview.reviewBulkRestrict(kind, toChange))) {
			return false;
		}

		const changes = names.map((name): [string, PendingChange] => {
			const change: PendingChange = { access };
			pending.set(name, change);
			return [name, change];
		});
		const result = await instancePolicy.setAccessMany(kind, names, access);
		settle(changes, result);
		return result.status === 'saved';
	}

	/** Keeps a saved change until its version arrives, or drops it so the row shows the server value. */
	function settle(changes: Array<[string, PendingChange]>, result: InstancePolicySaveResult) {
		const savedVersion = instancePolicy.policies[kind]?.version;
		const accessVersion = instancePolicy.typeAccess[kind]?.version ?? -1;
		const keep =
			result.status === 'saved' && savedVersion !== undefined && accessVersion < savedVersion;
		for (const [name, change] of changes) {
			// A later pick on the same row owns the entry now.
			if (pending.get(name) !== change) continue;
			if (keep) change.savedVersion = savedVersion;
			else pending.delete(name);
		}
	}

	// One selection for each use of the composable, so a selection stays in its tab.
	const selection = ref<string[]>([]);
	const bulkBusy = ref(false);

	/** Runs a bulk change of the selected rows and takes the saved ones out of the selection. */
	async function bulkChange(
		selected: ReadonlyArray<{ name: string; label: string }>,
		access: PolicyAction,
	): Promise<void> {
		bulkBusy.value = true;
		try {
			// When nothing saved, the selection stays so the admin can try again.
			if (!(await changeAccessMany(selected, access))) return;
			// Rows that the admin picked while the save ran stay selected.
			const saved = new Set(selected.map(({ name }) => name));
			selection.value = selection.value.filter((name) => !saved.has(name));
		} finally {
			bulkBusy.value = false;
		}
	}

	return { types, loading, changeAccess, changeAccessMany, selection, bulkBusy, bulkChange };
}
