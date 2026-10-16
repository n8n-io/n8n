import type { SkillVersionDetail, SkillVersionSummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getSkillVersion, getSkillVersions } from '@/features/settings/context/skills.api';

/**
 * Loads skill versions for the agent builder and keeps them for the life of the
 * caller, so the badge menu and the diff dialog do not fetch the same data twice.
 * The store is read on first load: hosts without version state never need it.
 */
export function useSkillVersionLoader() {
	const lists = new Map<string, Promise<SkillVersionSummary[]>>();
	const details = new Map<string, Promise<SkillVersionDetail>>();

	function remember<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>) {
		const cached = cache.get(key);
		if (cached) return cached;
		const pending = load();
		cache.set(key, pending);
		// A failed load must not stick: the next open tries again.
		pending.catch(() => cache.delete(key));
		return pending;
	}

	/** Every version of the skill, newest first. `latest` keys the cache, so a new save reloads the list. */
	async function loadVersions(skillId: string, latest: number): Promise<SkillVersionSummary[]> {
		return await remember(
			lists,
			`${skillId}@${latest}`,
			async () => await getSkillVersions(useRootStore().restApiContext, skillId),
		);
	}

	async function loadVersion(skillId: string, version: number): Promise<SkillVersionDetail> {
		return await remember(
			details,
			`${skillId}:${version}`,
			async () => await getSkillVersion(useRootStore().restApiContext, skillId, version),
		);
	}

	return { loadVersions, loadVersion };
}

export type SkillVersionLoader = ReturnType<typeof useSkillVersionLoader>;
