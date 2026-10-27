// Who may do what with a skill source, as pure functions. A source reuses the skill scopes of
// its scope: the global `skill:*` for Global, `projectSkill:*` for a team or personal project.
// Test them with decision tables, without mocks.
import type { Scope } from '@n8n/permissions';

export type SkillSourceAction =
	/** See the source and its health. */
	| 'view'
	/** See which credential the source uses. */
	| 'viewCredential'
	| 'connect'
	| 'addSkills'
	/** Accept, skip or update all. */
	| 'review'
	| 'checkNow'
	| 'stopSyncing'
	| 'replaceCredential'
	| 'disconnect'
	/** Delete one synced skill. */
	| 'deleteSkill';

/** Global, or a team or personal project. */
export type SkillSourceScopeKind = 'global' | 'project';

const OPERATION: Record<SkillSourceAction, 'list' | 'create' | 'update' | 'delete'> = {
	view: 'list',
	viewCredential: 'update',
	connect: 'create',
	addSkills: 'create',
	review: 'update',
	checkNow: 'update',
	stopSyncing: 'update',
	replaceCredential: 'update',
	disconnect: 'delete',
	deleteSkill: 'delete',
};

/**
 * The scope that an action on a source needs, or null when every user may do it. Every user
 * sees a Global source, as every user reads instance skills. A user who cannot change a
 * source sees its health, but not its credential.
 */
export function requiredSourceScope(
	action: SkillSourceAction,
	kind: SkillSourceScopeKind,
): Scope | null {
	if (kind === 'global') return action === 'view' ? null : `skill:${OPERATION[action]}`;
	return `projectSkill:${OPERATION[action]}`;
}
