import type { AgentSkillVersionInfo } from '@n8n/api-types';

/**
 * What the agent builder tells the user about an attached hub skill:
 * - `latest`: nothing to do. The published agent runs the draft version, or another
 *   version number with the same content (for example after a restore).
 * - `notLive`: only the draft uses the skill. No published version uses it.
 * - `liveBehind`: the draft uses a newer version than the published agent.
 * - `pinned`: the draft ref is pinned to a version older than the latest one.
 */
export type SkillVersionStateKind = 'latest' | 'notLive' | 'liveBehind' | 'pinned';

/** A version pair to compare, `from` the older side. */
export type SkillVersionRange = { from: number; to: number };

export type SkillVersionState = {
	kind: SkillVersionStateKind;
	draft: number;
	live: number | null;
	latest: number;
	/** The versions "See what changed" compares. Undefined when nothing waits for the user. */
	changes?: SkillVersionRange;
};

export function skillVersionState(info: AgentSkillVersionInfo): SkillVersionState {
	const { draft, live, latest } = info;
	const base = { draft, live, latest };

	// A pin behind the latest version wins over the live state: the user must act on it first.
	if (isPinnedBehindLatest(info)) {
		return { ...base, kind: 'pinned', changes: { from: draft, to: latest } };
	}
	if (live === null) return { ...base, kind: 'notLive' };
	if (draftMatchesPublished(info)) return { ...base, kind: 'latest' };
	return { ...base, kind: 'liveBehind', changes: { from: live, to: draft } };
}

/** True when the draft is pinned to a version older than the latest one. */
export function isPinnedBehindLatest(info: AgentSkillVersionInfo | undefined): boolean {
	return !!info?.pinned && info.draft < info.latest;
}

/** True when the published agent runs the draft version, or a version with the same content. */
export function draftMatchesPublished(info: AgentSkillVersionInfo): boolean {
	return info.live !== null && (info.live === info.draft || info.liveHasSameContent);
}
