import type { AgentSkillVersionInfo } from '@n8n/api-types';

/**
 * How the agent uses an attached hub skill:
 * - `latest`: the draft follows the latest version and the live agent runs it too.
 * - `notLive`: only the draft uses the skill. No published version uses it.
 * - `liveBehind`: the draft follows the latest version. The published agent runs an older one.
 * - `pinned`: the draft ref is pinned to a version, by a user or a restore.
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

	// A pin wins over the live state: the pin is what the user must act on.
	if (info.pinned) {
		return {
			...base,
			kind: 'pinned',
			...(draft < latest ? { changes: { from: draft, to: latest } } : {}),
		};
	}
	if (live === null) return { ...base, kind: 'notLive' };
	if (live !== draft) return { ...base, kind: 'liveBehind', changes: { from: live, to: draft } };
	return { ...base, kind: 'latest' };
}

/** True when the draft is pinned to a version older than the latest one. */
export function isPinnedBehindLatest(info: AgentSkillVersionInfo | undefined): boolean {
	return !!info?.pinned && info.draft < info.latest;
}
