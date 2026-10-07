import { onBeforeUnmount, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { acquireSkillEditLock, releaseSkillEditLock } from '@/features/settings/context/skills.api';

/** Renews well inside the server's two-minute lock TTL. */
const RENEW_INTERVAL_MS = 30_000;

/**
 * Holds a skill's edit lock while the editor is open. `lockedBy` is set when
 * another user holds it, so the editor can turn read-only and say who.
 */
export function useSkillEditLock() {
	const rootStore = useRootStore();
	const lockedBy = ref<{ firstName: string; lastName: string } | null>(null);
	let skillId: string | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;

	async function acquire() {
		if (!skillId) return;
		try {
			const result = await acquireSkillEditLock(rootStore.restApiContext, skillId);
			if (result.acquired) return;
			lockedBy.value = result.holder ?? { firstName: '', lastName: '' };
			// The editor's copy may be older than the holder's save, so it stays
			// read-only until it is reopened, even after the lock frees up.
			clearInterval(timer);
		} catch {
			// The server still rejects writes under someone else's lock; a failed
			// lock request must not block editing on its own.
		}
	}

	async function start(id: string) {
		skillId = id;
		await acquire();
		timer = setInterval(() => void acquire(), RENEW_INTERVAL_MS);
	}

	async function release(id: string) {
		try {
			await releaseSkillEditLock(rootStore.restApiContext, id);
		} catch {
			// The lock expires on its own after its TTL.
		}
	}

	function stop() {
		if (timer) clearInterval(timer);
		timer = undefined;
		if (skillId && !lockedBy.value) void release(skillId);
		skillId = null;
	}

	onBeforeUnmount(stop);

	return { lockedBy, start, stop };
}
