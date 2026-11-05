import { describe, it, expect } from 'vitest';

import { ApiError } from '../client';
import { toPackagesError } from '../commands/package/package-error';

describe('toPackagesError', () => {
	it('explains Agent blockers and retains their structured details', () => {
		const details = {
			issues: [
				{
					type: 'agent-conflict',
					kind: 'task-id',
					sourceAgentId: 'agent',
					sourceTaskId: 'task',
					projectId: 'project',
					targetIds: ['first', 'second'],
				},
				{
					type: 'agent-invalid',
					sourceAgentId: 'agent',
					path: 'config.model',
					message: 'Invalid model',
				},
				{
					type: 'agent-dependency-unresolved',
					sourceAgentId: 'agent',
					projectId: 'project',
					dependencyType: 'workflow',
					referenceId: 'tool',
					path: 'config.workflows[0]',
					reason: 'inaccessible',
				},
				{
					type: 'agent-policy-violation',
					sourceAgentId: 'agent',
					name: 'Reviewer',
					violations: [{ message: 'Model is not allowed' }],
				},
				{
					type: 'credential-unresolved',
					kind: 'missing',
					sourceId: 'credential',
					usedBy: [
						{ kind: 'agent', id: 'agent' },
						{ kind: 'workflow', id: 'workflow' },
					],
				},
				{ type: 'future-issue', reason: 'Retain this detail' },
			],
		};
		const error = toPackagesError(new ApiError(422, 'Import blocked', undefined, details));
		expect(error).toBeInstanceOf(ApiError);
		if (!(error instanceof ApiError)) throw new Error('Expected an API error');
		expect(error.details).toBe(details);
		expect(error.hint).toContain(
			'Agent agent, task task conflicts in project project (task-id; targets: first, second)',
		);
		expect(error.hint).toContain('Agent agent at config.model: Invalid model');
		expect(error.hint).toContain('workflow tool is inaccessible at config.workflows[0]');
		expect(error.hint).toContain(
			'Agent "Reviewer" (agent) refused by policy: Model is not allowed',
		);
		expect(error.hint).toContain('used by agent agent, workflow workflow');
		expect(error.hint).toContain('{"type":"future-issue","reason":"Retain this detail"}');
	});

	it('explains a conflict between import and deletion', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'workflow-removal-conflict',
						sourceWorkflowId: 'source',
						workflowId: 'target',
						projectId: 'P1',
					},
				],
			}),
		);

		expect(result).toBeInstanceOf(ApiError);
		expect((result as ApiError).hint).toContain(
			'Workflow target (source source) in project P1 is selected for both import and deletion. Remove it from one selection.',
		);
	});

	it('explains a forbidden workflow removal', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'workflow-removal-forbidden',
						workflowId: 'w1',
						name: 'Flow',
						projectId: 'P1',
					},
				],
			}),
		);

		expect((result as ApiError).hint ?? '').toContain(
			'workflow "Flow" (w1) in project P1 could not be removed — not in the package or selected for deletion, and you lack permission',
		);
	});

	it('explains a data table schema mismatch and what overwrite would change', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'data-table-unresolved',
						kind: 'schema-incompatible',
						sourceId: 'dt1',
						name: 'First',
						missingColumns: ['BaaId'],
						typeMismatches: [],
						overwriteChanges: [
							{ kind: 'remove-column', column: 'note', type: 'string', destructive: true },
							{ kind: 'rename-column', from: 'mail', to: 'email', destructive: false },
							{ kind: 'add-column', column: 'BaaId', type: 'string', destructive: false },
						],
						usedBy: [{ kind: 'workflow', id: 'wf1' }],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain(
			'data table "First" (dt1) does not match the package schema (missing columns: BaaId), used by workflow wf1',
		);
		expect(hint).toContain(
			'--data-table-schema-conflict-policy=overwrite would: remove column note (values removed), rename column mail to email, add column BaaId',
		);
	});

	it('explains a data table rename to a name another table has', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'data-table-unresolved',
						kind: 'name-conflict',
						sourceId: 'orders1',
						name: 'Sales',
						currentName: 'Orders',
						conflictingTableId: 'sales1',
						usedBy: [{ kind: 'workflow', id: 'wf1' }],
					},
				],
			}),
		);

		expect((result as ApiError).hint ?? '').toContain(
			'data table "Orders" (orders1) cannot be renamed to "Sales": the name is also used by table sales1, used by workflow wf1',
		);
	});

	it('returns non-ApiError values unchanged', () => {
		const error = new Error('boom');
		expect(toPackagesError(error)).toBe(error);
	});

	it('lists workflow-conflict issues for a 409', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'workflow-conflict',
						name: 'Flow',
						sourceWorkflowId: 's1',
						existingWorkflowId: 'e1',
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('Blocking issues:');
		expect(hint).toContain('workflow "Flow"');
		expect(hint).toContain('e1');
	});

	it('lists project-conflict issues for a 409', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{ type: 'project-conflict', kind: 'fail-policy', sourceProjectId: 'P1', name: 'brie' },
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('project "brie" (source P1) already exists on this instance');
	});

	it('lists credential-unresolved issues for a 422', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-unresolved',
						kind: 'not_found',
						sourceId: 'c1',
						usedBy: [
							{ kind: 'workflow', id: 'w1' },
							{ kind: 'workflow', id: 'w2' },
						],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('credential c1 unresolved (not_found)');
		expect(hint).toContain('workflow w1, workflow w2');
	});

	it('lists credential-policy-violation issues with every violation', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-policy-violation',
						sourceId: 'c1',
						name: 'Prod GitHub',
						credentialType: 'githubApi',
						usedBy: [
							{ kind: 'workflow', id: 'w1' },
							{ kind: 'agent', id: 'a1' },
						],
						violations: [
							{ kind: 'k', checkId: 'a', message: 'GitHub API is not allowed' },
							{ kind: 'k', checkId: 'b', message: 'Second reason' },
						],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain(
			'credential "Prod GitHub" (c1, githubApi) refused by policy: GitHub API is not allowed; Second reason, used by workflow w1, agent a1',
		);
	});

	it('names a refused credential by its source id when it has no name', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-policy-violation',
						sourceId: 'c1',
						credentialType: 'githubApi',
						usedBy: [{ kind: 'workflow', id: 'w1' }],
						violations: [{ kind: 'k', checkId: 'a', message: 'Not allowed' }],
					},
				],
			}),
		);

		expect((result as ApiError).hint ?? '').toContain(
			'credential "c1" (c1, githubApi) refused by policy: Not allowed',
		);
	});

	it('names the matched credential when policy refused its update', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-policy-violation',
						sourceId: 'c1',
						targetId: 't1',
						name: 'Prod GitHub',
						credentialType: 'githubApi',
						usedBy: [{ kind: 'workflow', id: 'w1' }],
						violations: [{ kind: 'k', checkId: 'a', message: 'Not allowed' }],
					},
				],
			}),
		);

		expect((result as ApiError).hint ?? '').toContain(
			'update of credential t1 (githubApi) from package credential "Prod GitHub" (c1) refused by policy: Not allowed, used by workflow w1',
		);
	});

	it.each([
		{
			usedBy: [{ kind: 'workflow', id: 'w1' }],
			expected: 'workflow w1',
		},
		{
			usedBy: [{ kind: 'agent', id: 'a1' }],
			expected: 'agent a1',
		},
		{
			usedBy: [
				{ kind: 'workflow', id: 'shared' },
				{ kind: 'agent', id: 'shared' },
			],
			expected: 'workflow shared, agent shared',
		},
	])('lists variable-unresolved issues for $expected', ({ usedBy, expected }) => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'variable-unresolved',
						name: 'var1',
						usedBy,
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('variable "var1" unresolved');
		expect(hint).toContain(`used by ${expected}`);
	});

	it('lists variable-conflict issues for a 409, naming the scope', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'variable-conflict',
						name: 'API_URL',
						projectId: 'p1',
						usedBy: [{ kind: 'workflow', id: 'w1' }],
					},
					{ type: 'variable-conflict', name: 'DB_URL', usedBy: [{ kind: 'workflow', id: 'w2' }] },
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('variable "API_URL" in project p1 holds a different value');
		expect(hint).toContain('w1');
		expect(hint).toContain('variable "DB_URL" in the global scope holds a different value');
		expect(hint).toContain('w2');
	});

	it('lists credential-conflict issues for a 409, by kind', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-conflict',
						kind: 'differs',
						targetId: 'c1',
						sourceIds: ['s1'],
						name: 'GitHub',
						usedBy: [{ kind: 'workflow', id: 'w1' }],
					},
					{
						type: 'credential-conflict',
						kind: 'divergent',
						targetId: 'c2',
						sourceIds: ['s2', 's3'],
						name: 'Slack',
						usedBy: [
							{ kind: 'workflow', id: 'w2' },
							{ kind: 'agent', id: 'a1' },
						],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain(
			'credential "GitHub" (c1) differs from package credential s1, used by workflow w1',
		);
		expect(hint).toContain(
			'credential "Slack" (c2) receives different values from package credentials s2, s3, used by workflow w2, agent a1',
		);
	});

	it('lists credential-update-forbidden issues for a 422', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'credential-update-forbidden',
						targetId: 'c1',
						sourceIds: ['s1'],
						name: 'GitHub',
						usedBy: [{ kind: 'workflow', id: 'w1' }],
					},
				],
			}),
		);

		expect((result as ApiError).hint).toContain(
			'credential "GitHub" (c1) matches package credential s1, but you lack permission to update it. Use keep-existing or ask its owner. Used by workflow w1',
		);
	});

	it('lists variable-limit-exceeded issues for a 422', () => {
		const result = toPackagesError(
			new ApiError(422, 'Import blocked', undefined, {
				issues: [
					{
						type: 'variable-limit-exceeded',
						limit: 5,
						remaining: 1,
						requested: 3,
						names: ['API_URL', 'DB_URL', 'TOKEN'],
						usedBy: [
							{ kind: 'workflow', id: 'w1' },
							{ kind: 'workflow', id: 'w2' },
						],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('variable limit reached: 3 new variable(s)');
		expect(hint).toContain('API_URL, DB_URL, TOKEN');
		expect(hint).toContain('1 of 5 remaining');
		expect(hint).toContain('workflow w1, workflow w2');
	});

	it('lists tag-unresolved issues for a 409', () => {
		const result = toPackagesError(
			new ApiError(409, 'Import blocked', undefined, {
				issues: [
					{
						type: 'tag-unresolved',
						kind: 'rename-drift',
						sourceId: 't1',
						name: 'prod',
						existingName: 'production',
						usedBy: [{ kind: 'workflow', id: 'w1' }],
					},
					{
						type: 'tag-unresolved',
						kind: 'permission-denied',
						missingScope: 'tag:create',
						usedBy: [{ kind: 'workflow', id: 'w2' }],
					},
				],
			}),
		);

		const hint = (result as ApiError).hint ?? '';
		expect(hint).toContain('tag "prod" (t1) unresolved (rename-drift)');
		expect(hint).toContain('w1');
		expect(hint).toContain('requires the tag:create scope');
		expect(hint).toContain('w2');
	});

	it('leaves other ApiErrors without issue details unchanged', () => {
		const error = new ApiError(400, 'Bad request');
		expect(toPackagesError(error)).toBe(error);
	});
});
