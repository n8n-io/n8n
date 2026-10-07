import { onBeforeUnmount, ref } from 'vue';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

import { acquireSkillEditLock, releaseSkillEditLock } from '@/features/settings/context/skills.api';

/** Renews well inside the server's two-minute lock TTL. */
const RENEW_INTERVAL_MS = 30_000;
/** How often a read-only editor checks whether the other user is done. */
const WAIT_INTERVAL_MS = 10_000;

/**
 * `pending` until the first lock request answers, `held` while this tab may edit,
 * `locked` when another user holds the lock, `forbidden` when the user may not edit
 * the skill, `failed` when the first request failed for another reason.
 */
export type SkillEditLockStatus = 'idle' | 'pending' | 'held' | 'locked' | 'forbidden' | 'failed';

/**
 * Holds a skill's edit lock while the editor is open. A tab that finds the skill
 * locked keeps checking. When it gets the lock, `onFreed` reloads the skill first,
 * because the other user may have saved changes since this tab opened it.
 */
export function useSkillEditLock() {
	const rootStore = useRootStore();
	const status = ref<SkillEditLockStatus>('idle');
	const lockedBy = ref<{ firstName: string; lastName: string } | null>(null);
	let skillId: string | null = null;
	let onFreed: (() => Promise<void>) | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// A function, so callers read the status `acquire` set, not a narrowed one.
	function isHeld() {
		return status.value === 'held';
	}

	function schedule() {
		if (timer) clearTimeout(timer);
		timer = undefined;
		if (!skillId || (status.value !== 'held' && status.value !== 'locked')) return;
		timer = setTimeout(
			() => void acquire().then(schedule),
			isHeld() ? RENEW_INTERVAL_MS : WAIT_INTERVAL_MS,
		);
	}

	async function acquire(): Promise<void> {
		const id = skillId;
		if (!id) return;
		try {
			const result = await acquireSkillEditLock(rootStore.restApiContext, id);
			if (!result.acquired) {
				lockedBy.value = result.holder ?? null;
				status.value = 'locked';
				return;
			}
			if (status.value === 'locked') await onFreed?.();
			lockedBy.value = null;
			status.value = 'held';
		} catch (error) {
			if (status.value === 'pending') {
				status.value =
					error instanceof ResponseError && error.httpStatusCode === 403 ? 'forbidden' : 'failed';
			} else if (status.value === 'locked') {
				// The reload after the lock freed up failed: give the lock back and stay read-only.
				void release(id);
				status.value = 'failed';
			}
			// A failed renewal keeps the lock until its TTL.
		}
	}

	async function start(id: string, options: { onFreed?: () => Promise<void> } = {}) {
		skillId = id;
		onFreed = options.onFreed;
		status.value = 'pending';
		await acquire();
		schedule();
	}

	async function release(id: string) {
		try {
			await releaseSkillEditLock(rootStore.restApiContext, id);
		} catch {
			// The lock expires on its own after its TTL.
		}
	}

	function stop() {
		if (timer) clearTimeout(timer);
		timer = undefined;
		if (skillId && isHeld()) void release(skillId);
		skillId = null;
	}

	onBeforeUnmount(stop);

	return { status, lockedBy, start, stop };
}
