import { requiredSourceScope } from '../services/skill-source.policy';

describe('requiredSourceScope', () => {
	it.each([
		// Every user sees Global sources, as every user reads instance skills.
		{ action: 'view', kind: 'global', scope: null },
		{ action: 'view', kind: 'project', scope: 'projectSkill:list' },
		// The credential name is for users who can change the source.
		{ action: 'viewCredential', kind: 'global', scope: 'skill:update' },
		{ action: 'viewCredential', kind: 'project', scope: 'projectSkill:update' },
		{ action: 'connect', kind: 'global', scope: 'skill:create' },
		{ action: 'connect', kind: 'project', scope: 'projectSkill:create' },
		{ action: 'addSkills', kind: 'global', scope: 'skill:create' },
		{ action: 'addSkills', kind: 'project', scope: 'projectSkill:create' },
		{ action: 'review', kind: 'global', scope: 'skill:update' },
		{ action: 'review', kind: 'project', scope: 'projectSkill:update' },
		{ action: 'checkNow', kind: 'global', scope: 'skill:update' },
		{ action: 'checkNow', kind: 'project', scope: 'projectSkill:update' },
		{ action: 'stopSyncing', kind: 'global', scope: 'skill:update' },
		{ action: 'stopSyncing', kind: 'project', scope: 'projectSkill:update' },
		{ action: 'replaceCredential', kind: 'global', scope: 'skill:update' },
		{ action: 'replaceCredential', kind: 'project', scope: 'projectSkill:update' },
		{ action: 'disconnect', kind: 'global', scope: 'skill:delete' },
		{ action: 'disconnect', kind: 'project', scope: 'projectSkill:delete' },
		{ action: 'deleteSkill', kind: 'global', scope: 'skill:delete' },
		{ action: 'deleteSkill', kind: 'project', scope: 'projectSkill:delete' },
	] as const)('$action on a $kind source needs $scope', ({ action, kind, scope }) => {
		expect(requiredSourceScope(action, kind)).toBe(scope);
	});
});
