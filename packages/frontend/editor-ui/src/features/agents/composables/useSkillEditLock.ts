import { onBeforeUnmount, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { acquireSkillEditLock, releaseSkillEditLock } from '@/features/settings/context/skills.api';

/** Renews well inside the server's two-minute lock TTL. */
const RENEW_INTERVAL_MS = 30_000;

/**
 * `pending` until the first lock request answers, `held` while this tab may edit,
 * `locked` when another user holds the lock, `failed` when the first request failed.
 */
export type SkillEditLockStatus = 'idle' | 'pending' | 'held' | 'locked' | 'failed';

/**
 * Holds a skill's edit lock while the editor is open. Only `held` allows edits:
 * the editor's copy may be older than another user's save, so a tab that did not
 * get the lock stays read-only until it is reopened.
 */
export function useSkillEditLock() {
	const rootStore = useRootStore();
	const status = ref<SkillEditLockStatus>('idle');
	const lockedBy = ref<{ firstName: string; lastName: string } | null>(null);
	let skillId: string | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;

	// A function, so the check reads the status `acquire` set, not the narrowed one.
	function isHeld() {
		return status.value === 'held';
	}

	function stopRenewing() {
		if (timer) clearInterval(timer);
		timer = undefined;
	}

	async function acquire(): Promise<void> {
		if (!skillId) return;
		try {
			const result = await acquireSkillEditLock(rootStore.restApiContext, skillId);
			if (result.acquired) {
				status.value = 'held';
				return;
			}
			lockedBy.value = result.holder ?? null;
			status.value = 'locked';
			stopRenewing();
		} catch {
			// A failed renewal keeps the lock until its TTL; only a failed first request blocks editing.
			if (status.value === 'pending') status.value = 'failed';
		}
	}

	async function start(id: string) {
		skillId = id;
		status.value = 'pending';
		await acquire();
		if (isHeld()) timer = setInterval(() => void acquire(), RENEW_INTERVAL_MS);
	}

	async function release(id: string) {
		try {
			await releaseSkillEditLock(rootStore.restApiContext, id);
		} catch {
			// The lock expires on its own after its TTL.
		}
	}

	function stop() {
		stopRenewing();
		if (skillId && isHeld()) void release(skillId);
		skillId = null;
	}

	onBeforeUnmount(stop);

	return { status, lockedBy, start, stop };
}
