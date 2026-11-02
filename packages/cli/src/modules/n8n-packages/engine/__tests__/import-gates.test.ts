import type { WorkflowEntity } from '@n8n/db';

import { ForbiddenError } from '@n8n/errors';

import type { CredentialUpdateCandidate } from '../../entities/credential/credential.types';
import type { WorkflowImportPlan } from '../../entities/workflow/workflow-import.types';
import {
	assertArchiveTransitionsAllowed,
	assertCredentialUpdatesAllowed,
	assertSharedSkillWritesAllowed,
	packageImportScopes,
} from '../import-gates';

it('does not require workflow:import for a project-only package', () => {
	expect(
		packageImportScopes({
			packageFormatVersion: '1',
			sourceN8nVersion: '2.0.0',
			sourceId: 'source',
			projects: [{ id: 'project-1', name: 'Project', target: 'projects/project-1' }],
		}),
	).toEqual([]);
});

function workflowPlan(archiveTransition: 'archive' | 'unarchive' | null): WorkflowImportPlan {
	const workflow = { id: 'workflow-1', name: 'Workflow' } as WorkflowEntity;
	return {
		items: [
			{
				action: 'update',
				sourceWorkflowId: 'source-1',
				entity: workflow,
				existing: workflow,
				archiveTransition,
				parentFolderId: null,
				sourcePublished: false,
				sourceArchived: false,
			},
		],
		conflicts: [],
		lineageConflicts: [],
		idConflicts: [],
		folderConflicts: [],
		archiveForbidden: [],
	};
}

describe('assertArchiveTransitionsAllowed', () => {
	it('requires workflow:delete for an API key that changes archived state', () => {
		expect(() =>
			assertArchiveTransitionsAllowed(['workflow:import'], [workflowPlan('archive')]),
		).toThrow(ForbiddenError);
	});

	it('allows an API key with workflow:delete', () => {
		expect(() =>
			assertArchiveTransitionsAllowed(
				['workflow:import', 'workflow:delete'],
				[workflowPlan('unarchive')],
			),
		).not.toThrow();
	});

	it('does not require workflow:delete when archived state stays the same', () => {
		expect(() =>
			assertArchiveTransitionsAllowed(['workflow:import'], [workflowPlan(null)]),
		).not.toThrow();
	});
});

describe('assertCredentialUpdatesAllowed', () => {
	const update: CredentialUpdateCandidate = {
		sourceId: 'source-1',
		targetId: 'credential-1',
		targetName: 'GitHub',
		targetType: 'githubApi',
		ownerProjectId: 'project-1',
		name: 'Renamed',
		usedBy: [],
	};

	it('requires no scope when no plan updates a credential', () => {
		expect(() =>
			assertCredentialUpdatesAllowed(['workflow:import'], 'overwrite', [{ updates: [] }]),
		).not.toThrow();
	});

	it('requires credential:update when a plan updates a credential under overwrite', () => {
		expect(() =>
			assertCredentialUpdatesAllowed(['workflow:import'], 'overwrite', [
				{ updates: [] },
				{ updates: [update] },
			]),
		).toThrow(ForbiddenError);
		expect(() =>
			assertCredentialUpdatesAllowed(['workflow:import', 'credential:update'], 'overwrite', [
				{ updates: [update] },
			]),
		).not.toThrow();
	});

	it('skips the check without API key scopes', () => {
		expect(() =>
			assertCredentialUpdatesAllowed(undefined, 'overwrite', [{ updates: [update] }]),
		).not.toThrow();
	});

	it.each(['fail', 'keep-existing'] as const)('requires no scope under %s', (policy) => {
		expect(() =>
			assertCredentialUpdatesAllowed(['workflow:import'], policy, [{ updates: [update] }]),
		).not.toThrow();
	});
});

describe('assertSharedSkillWritesAllowed', () => {
	const create = {
		skill: {
			id: 'skill_review',
			scope: 'instance' as const,
			skill: { name: 'Review', description: 'Review.', instructions: 'Review.' },
			frontmatter: null,
		},
		target: { projectId: null, agentId: null },
		usedBy: ['agent'],
	};
	const update = { ...create, base: { skillHash: 'hash', versionId: 'version' } };

	it.each([
		['a create without skill:create', [create], ['agent:import', 'skill:update']],
		['an update without skill:update', [update], ['agent:import', 'skill:create']],
	])('refuses %s', (_case, shared, apiKeyScopes) => {
		expect(() => assertSharedSkillWritesAllowed(apiKeyScopes, [{ shared }])).toThrow(
			ForbiddenError,
		);
	});

	it.each([
		['a user without an API key', undefined, [create, update]],
		['an API key with both skill scopes', ['skill:create', 'skill:update'], [create, update]],
		['an API key that writes no shared skill', ['agent:import'], []],
	])('allows %s', (_case, apiKeyScopes, shared) => {
		expect(() => assertSharedSkillWritesAllowed(apiKeyScopes, [{ shared }])).not.toThrow();
	});
});
