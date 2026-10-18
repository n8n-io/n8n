import type {
	GitHubSkillCandidate,
	SkillGitCheckLevel,
	SkillGitSourceInfo,
	SkillListItem,
} from '@n8n/api-types';

/** The state chip a synced skill shows in the list. Null for a skill that needs no chip. */
export type SkillGitState = 'update' | 'blocked' | 'unavailable' | 'delayed' | 'fixed';

export function skillGitState(source: SkillGitSourceInfo | null): SkillGitState | null {
	if (!source) return null;
	if (source.update?.status === 'pending') return 'update';
	if (source.update?.status === 'blocked') return 'blocked';
	if (source.status === 'unavailable') return 'unavailable';
	if (source.status === 'rate_limited') return 'delayed';
	if (source.refType !== 'branch') return 'fixed';
	return null;
}

/** The skills of a page that have an update that waits for a decision. */
export function skillsWithPendingUpdate(skills: SkillListItem[]): SkillListItem[] {
	return skills.filter((skill) => skill.gitSource?.update?.status === 'pending');
}

/** The first 7 characters, as GitHub shows a commit. */
export function shortSha(sha: string): string {
	return sha.slice(0, 7);
}

/** True when the folder is already synced into the place the user picked. */
export function isImportedTo(candidate: GitHubSkillCandidate, projectId: string | null): boolean {
	return candidate.importedTo.some((target) => target.projectId === projectId);
}

/** A folder can be imported unless it failed the check or is already synced there. */
export function canPickCandidate(candidate: GitHubSkillCandidate, projectId: string | null) {
	return candidate.check.result !== 'blocked' && !isImportedTo(candidate, projectId);
}

/** Everything that can be imported starts selected. */
export function initialPicks(candidates: GitHubSkillCandidate[], projectId: string | null) {
	return candidates
		.filter((candidate) => canPickCandidate(candidate, projectId))
		.map((candidate) => candidate.path);
}

/** Keeps only the picks that can still be imported, for example after a scope change. */
export function validPicks(
	picks: string[],
	candidates: GitHubSkillCandidate[],
	projectId: string | null,
): string[] {
	return picks.filter((path) => {
		const candidate = candidates.find((entry) => entry.path === path);
		return candidate !== undefined && canPickCandidate(candidate, projectId);
	});
}

/** A picked skill with warnings needs the user to confirm before the import. */
export function picksNeedAcknowledgement(
	picks: string[],
	candidates: GitHubSkillCandidate[],
): boolean {
	return candidates.some(
		(candidate) => picks.includes(candidate.path) && candidate.check.result === 'review',
	);
}

export function checkBadgeVariant(result: SkillGitCheckLevel): 'success' | 'warning' | 'danger' {
	if (result === 'passed') return 'success';
	if (result === 'review') return 'warning';
	return 'danger';
}
