import { promotionMissingDependencySchema } from '@n8n/api-types';

import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';

import {
	checkPromoteDependencies,
	confirmedMissingRows,
	markRequirementRows,
	type DependencyOwner,
	type PromoteDependencyFacts,
} from '../promote-dependency-check';

const ALPHA = { id: 'A', name: 'Alpha', target: 'projects/alpha-A' };
const BETA = { id: 'B', name: 'Beta', target: 'projects/beta-B' };
const BETA_OWNER: DependencyOwner = { id: 'B', type: 'team', name: 'Beta' };
const PERSONAL_OWNER: DependencyOwner = { id: 'U', type: 'personal' };

const usedBy = (...ids: string[]) => ids.map((id) => ({ kind: 'workflow' as const, id }));
const CONSUMERS = [
	{ project: { id: 'A', name: 'Alpha' }, workflows: [{ id: 'wf', name: 'Sync' }] },
];

function manifestOf(over: Partial<PackageManifest> = {}): PackageManifest {
	return {
		packageFormatVersion: FORMAT_VERSION,
		sourceN8nVersion: '2.0.0',
		sourceId: 'source',
		...over,
	};
}

/** The export of Alpha, with one workflow that holds the given references. */
function exportOf(requirements: PackageRequirements): PackageManifest {
	return manifestOf({
		projects: [ALPHA],
		workflows: [
			{ id: 'wf', name: 'Sync', target: `${ALPHA.target}/workflows/sync-wf`, isArchived: false },
		],
		requirements,
	});
}

const credentialRow = { id: 'C', name: 'CRM key', type: 'httpHeaderAuth', usedBy: usedBy('wf') };
const workflowRow = { id: 'sub', name: 'Notify', usedBy: usedBy('wf') };

function check(over: Partial<PromoteDependencyFacts>) {
	return checkPromoteDependencies({
		manifest: exportOf({}),
		promotedProjectIds: new Set(['A']),
		branchManifest: null,
		existingCredentialIds: new Set(['C']),
		credentialOwners: new Map(),
		workflowOwners: new Map(),
		readableProjectIds: new Set(),
		readableCredentialIds: new Set(),
		readableWorkflowIds: new Set(),
		variables: [],
		...over,
	});
}

describe('checkPromoteDependencies', () => {
	describe('credentials', () => {
		const manifest = exportOf({ credentials: [credentialRow] });

		it('warns about a credential that this instance does not hold', () => {
			expect(check({ manifest, existingCredentialIds: new Set() })).toEqual({
				missingDependencies: [],
				warnings: [
					{
						kind: 'credential',
						code: 'missing-on-source',
						id: 'C',
						name: 'CRM key',
						consumers: CONSUMERS,
					},
				],
			});
		});

		it('does not list a credential that no project owns', () => {
			expect(check({ manifest })).toEqual({ missingDependencies: [], warnings: [] });
		});

		it('does not list a credential of the promoted project', () => {
			const credentialOwners = new Map([['C', { id: 'A', type: 'team', name: 'Alpha' } as const]]);

			expect(check({ manifest, credentialOwners }).missingDependencies).toEqual([]);
		});

		it.each([
			{ readable: true, readableCredentialIds: new Set(['C']) },
			{ readable: false, readableCredentialIds: new Set<string>() },
		])(
			'lists a credential of a personal project, readable: $readable',
			({ readable, readableCredentialIds }) => {
				const result = check({
					manifest,
					credentialOwners: new Map([['C', PERSONAL_OWNER]]),
					readableCredentialIds,
				});

				expect(result.missingDependencies).toEqual([
					{
						kind: 'credential',
						id: 'C',
						name: 'CRM key',
						credentialType: 'httpHeaderAuth',
						group: 'personal',
						reason: 'personal-project',
						accessible: readable,
						blocking: false,
						consumers: CONSUMERS,
					},
				]);
			},
		);

		it('does not list a credential that the branch holds under a project folder', () => {
			const branchManifest = manifestOf({
				projects: [BETA],
				credentials: [{ id: 'C', name: 'CRM key', target: `${BETA.target}/credentials/crm-key-C` }],
			});

			const result = check({
				manifest,
				branchManifest,
				credentialOwners: new Map([['C', BETA_OWNER]]),
			});

			expect(result.missingDependencies).toEqual([]);
		});

		it('lists a credential that the branch holds only as a top-level file', () => {
			const branchManifest = manifestOf({
				credentials: [{ id: 'C', name: 'CRM key', target: 'credentials/crm-key-C' }],
			});

			const result = check({
				manifest,
				branchManifest,
				credentialOwners: new Map([['C', BETA_OWNER]]),
			});

			expect(result.missingDependencies).toMatchObject([{ id: 'C', reason: 'not-on-branch' }]);
		});

		it('lists a credential of another project that the user can read', () => {
			const result = check({
				manifest,
				credentialOwners: new Map([['C', BETA_OWNER]]),
				readableProjectIds: new Set(['B']),
			});

			expect(result.missingDependencies).toEqual([
				{
					kind: 'credential',
					id: 'C',
					name: 'CRM key',
					credentialType: 'httpHeaderAuth',
					group: 'other-project',
					reason: 'not-on-branch',
					accessible: true,
					project: { id: 'B', name: 'Beta' },
					blocking: false,
					consumers: CONSUMERS,
				},
			]);
		});

		it('lists a credential of a project that the user cannot read as outside access', () => {
			const result = check({ manifest, credentialOwners: new Map([['C', BETA_OWNER]]) });

			expect(result.missingDependencies).toMatchObject([
				{ id: 'C', group: 'outside-access', reason: 'not-on-branch', accessible: false },
			]);
		});

		it.each([
			{
				owner: BETA_OWNER,
				readable: true,
				group: 'other-project',
				project: { id: 'B', name: 'Beta' },
			},
			{ owner: BETA_OWNER, readable: false, group: 'outside-access', project: undefined },
			{ owner: PERSONAL_OWNER, readable: true, group: 'personal', project: undefined },
			{ owner: PERSONAL_OWNER, readable: false, group: 'personal', project: undefined },
		])(
			'gives the project of a credential only for a team project that the user can read, owner: $owner.type, readable: $readable',
			({ owner, readable, group, project }) => {
				const result = check({
					manifest,
					credentialOwners: new Map([['C', owner]]),
					readableProjectIds: new Set(readable ? [owner.id] : []),
					readableCredentialIds: new Set(readable ? ['C'] : []),
				});

				expect(result.missingDependencies).toHaveLength(1);
				const [entry] = result.missingDependencies;
				expect(entry).toMatchObject({ group, accessible: readable });
				expect(entry.project).toEqual(project);
				expect('project' in entry).toBe(project !== undefined);
				expect(promotionMissingDependencySchema.parse(entry)).toEqual(entry);
			},
		);
	});

	describe('workflows', () => {
		const manifest = exportOf({ workflows: [workflowRow] });

		it('warns about a workflow that this instance does not hold', () => {
			expect(check({ manifest })).toEqual({
				missingDependencies: [],
				warnings: [
					{
						kind: 'workflow',
						code: 'missing-on-source',
						id: 'sub',
						name: 'Notify',
						consumers: CONSUMERS,
					},
				],
			});
		});

		it('does not list a workflow of the export', () => {
			const selfReference = exportOf({ workflows: [{ id: 'wf', usedBy: usedBy('wf') }] });

			expect(check({ manifest: selfReference })).toEqual({ missingDependencies: [], warnings: [] });
		});

		it('does not list a workflow of the promoted project', () => {
			const workflowOwners = new Map([['sub', { id: 'A', type: 'team', name: 'Alpha' } as const]]);

			expect(check({ manifest, workflowOwners })).toEqual({
				missingDependencies: [],
				warnings: [],
			});
		});

		it('lists a workflow of a personal project', () => {
			const result = check({
				manifest,
				workflowOwners: new Map([['sub', PERSONAL_OWNER]]),
				readableWorkflowIds: new Set(['sub']),
			});

			expect(result.missingDependencies).toEqual([
				{
					kind: 'workflow',
					id: 'sub',
					name: 'Notify',
					group: 'personal',
					reason: 'personal-project',
					accessible: true,
					blocking: false,
					consumers: CONSUMERS,
				},
			]);
		});

		it('does not list a workflow of another project that the branch holds', () => {
			const branchManifest = manifestOf({
				projects: [BETA],
				workflows: [
					{
						id: 'sub',
						name: 'Notify',
						target: `${BETA.target}/workflows/notify-sub`,
						isArchived: false,
					},
				],
			});

			const result = check({
				manifest,
				branchManifest,
				workflowOwners: new Map([['sub', BETA_OWNER]]),
			});

			expect(result.missingDependencies).toEqual([]);
		});

		it.each([
			{ group: 'other-project', readableProjectIds: new Set(['B']) },
			{ group: 'outside-access', readableProjectIds: new Set<string>() },
		])('lists a workflow of another project as $group', ({ group, readableProjectIds }) => {
			const result = check({
				manifest,
				workflowOwners: new Map([['sub', BETA_OWNER]]),
				readableProjectIds,
			});

			expect(result.missingDependencies).toMatchObject([
				{
					kind: 'workflow',
					id: 'sub',
					group,
					reason: 'not-on-branch',
					accessible: group === 'other-project',
				},
			]);
			// Only a user who can read the project gets its name.
			expect(result.missingDependencies[0].project).toEqual(
				group === 'other-project' ? { id: 'B', name: 'Beta' } : undefined,
			);
		});

		it('shows the id of a workflow that has no name', () => {
			const result = check({
				manifest: exportOf({ workflows: [{ id: 'sub', usedBy: usedBy('wf') }] }),
				workflowOwners: new Map([['sub', BETA_OWNER]]),
			});

			expect(result.missingDependencies).toMatchObject([{ id: 'sub', name: 'sub' }]);
		});
	});

	describe('variables', () => {
		const manifest = exportOf({ variables: [{ name: 'region', usedBy: usedBy('wf') }] });

		it('warns about a variable that no scope defines', () => {
			// A variable of another project does not resolve for this workflow.
			const result = check({ manifest, variables: [{ name: 'region', projectId: 'B' }] });

			expect(result).toEqual({
				missingDependencies: [],
				warnings: [
					{
						kind: 'variable',
						code: 'missing-on-source',
						name: 'region',
						consumers: CONSUMERS,
					},
				],
			});
		});

		it.each([{ projectId: 'A' }, { projectId: null }])(
			'does not warn about a variable that the scope $projectId defines',
			({ projectId }) => {
				const result = check({ manifest, variables: [{ name: 'region', projectId }] });

				expect(result).toEqual({ missingDependencies: [], warnings: [] });
			},
		);

		it('keeps only the workflows that cannot resolve the variable', () => {
			const twoProjects = manifestOf({
				projects: [ALPHA, BETA],
				workflows: [
					{
						id: 'wfA',
						name: 'In Alpha',
						target: `${ALPHA.target}/workflows/a-wfA`,
						isArchived: false,
					},
					{
						id: 'wfB',
						name: 'In Beta',
						target: `${BETA.target}/workflows/b-wfB`,
						isArchived: false,
					},
				],
				requirements: { variables: [{ name: 'region', usedBy: usedBy('wfA', 'wfB') }] },
			});

			const result = check({
				manifest: twoProjects,
				promotedProjectIds: new Set(['A', 'B']),
				variables: [{ name: 'region', projectId: 'A' }],
			});

			expect(result.warnings).toMatchObject([
				{
					name: 'region',
					consumers: [
						{ project: { id: 'B', name: 'Beta' }, workflows: [{ id: 'wfB', name: 'In Beta' }] },
					],
				},
			]);
		});
	});

	it('never stops the Promote on an entry, and gives a warning no `blocking`', () => {
		const result = check({
			manifest: exportOf({
				credentials: [credentialRow],
				workflows: [workflowRow, { id: 'gone', usedBy: usedBy('wf') }],
				variables: [{ name: 'region', usedBy: usedBy('wf') }],
			}),
			credentialOwners: new Map([['C', PERSONAL_OWNER]]),
			workflowOwners: new Map([['sub', PERSONAL_OWNER]]),
		});

		expect(
			result.missingDependencies.map(({ kind, id, blocking }) => ({ kind, id, blocking })),
		).toEqual([
			{ kind: 'credential', id: 'C', blocking: false },
			{ kind: 'workflow', id: 'sub', blocking: false },
		]);
		expect(result.warnings.map(({ kind, name }) => ({ kind, name }))).toEqual([
			{ kind: 'variable', name: 'region' },
			{ kind: 'workflow', name: 'gone' },
		]);
		for (const warning of result.warnings) expect(warning).not.toHaveProperty('blocking');
	});

	it('groups the consumers by project, and sorts the workflows by id', () => {
		const manifest = manifestOf({
			projects: [BETA, ALPHA],
			workflows: [
				{ id: 'w3', name: 'Three', target: `${BETA.target}/workflows/three-w3`, isArchived: false },
				{ id: 'w2', name: 'Two', target: `${ALPHA.target}/workflows/two-w2`, isArchived: false },
				{ id: 'w1', name: 'One', target: `${ALPHA.target}/workflows/one-w1`, isArchived: false },
			],
			requirements: { credentials: [{ ...credentialRow, usedBy: usedBy('w3', 'w2', 'w1') }] },
		});

		const result = check({
			manifest,
			promotedProjectIds: new Set(['A', 'B']),
			credentialOwners: new Map([['C', PERSONAL_OWNER]]),
		});

		expect(result.missingDependencies[0].consumers).toEqual([
			{
				project: { id: 'A', name: 'Alpha' },
				workflows: [
					{ id: 'w1', name: 'One' },
					{ id: 'w2', name: 'Two' },
				],
			},
			{ project: { id: 'B', name: 'Beta' }, workflows: [{ id: 'w3', name: 'Three' }] },
		]);
	});

	it('returns the same lists for any order of the requirement rows', () => {
		const credentials = [
			{ ...credentialRow, id: 'C2' },
			{ ...credentialRow, id: 'C1' },
			{ ...credentialRow, id: 'gone2' },
			{ ...credentialRow, id: 'gone1' },
		];
		const workflows = [
			{ id: 'sub2', usedBy: usedBy('wf') },
			{ id: 'sub1', usedBy: usedBy('wf') },
		];
		const facts = {
			existingCredentialIds: new Set(['C1', 'C2']),
			credentialOwners: new Map([
				['C1', BETA_OWNER],
				['C2', BETA_OWNER],
			]),
			workflowOwners: new Map([
				['sub1', BETA_OWNER],
				['sub2', BETA_OWNER],
			]),
		};

		const result = check({ ...facts, manifest: exportOf({ credentials, workflows }) });
		const reversed = check({
			...facts,
			manifest: exportOf({
				credentials: [...credentials].reverse(),
				workflows: [...workflows].reverse(),
			}),
		});

		expect(result.missingDependencies.map(({ id }) => id)).toEqual(['C1', 'C2', 'sub1', 'sub2']);
		expect(result.warnings.map(({ id }) => id)).toEqual(['gone1', 'gone2']);
		expect(reversed).toEqual(result);
	});
});

describe('markRequirementRows', () => {
	const otherCredentialRow = { ...credentialRow, id: 'C2', name: 'Own key' };
	const brokenRow = { id: 'gone', usedBy: usedBy('wf') };
	const variableRow = { name: 'region', usedBy: usedBy('wf') };
	const manifest = exportOf({
		credentials: [credentialRow, otherCredentialRow, { ...credentialRow, id: 'deleted' }],
		workflows: [workflowRow, brokenRow],
		variables: [variableRow],
	});
	const lists = check({
		manifest,
		existingCredentialIds: new Set(['C', 'C2']),
		credentialOwners: new Map([
			['C', BETA_OWNER],
			['C2', { id: 'A', type: 'team', name: 'Alpha' }],
		]),
		workflowOwners: new Map([['sub', PERSONAL_OWNER]]),
	});

	it('marks the row of each confirmed entry and of each credential or workflow warning', () => {
		const { requirements } = markRequirementRows(manifest, lists);

		expect(requirements?.credentials).toEqual([
			{ ...credentialRow, reason: 'confirmed-missing' },
			otherCredentialRow,
			{ ...credentialRow, id: 'deleted', reason: 'missing-on-source' },
		]);
		expect(requirements?.workflows).toEqual([
			{ ...workflowRow, reason: 'confirmed-missing' },
			{ ...brokenRow, reason: 'missing-on-source' },
		]);
	});

	it('gives no reason to the row of a variable warning', () => {
		expect(lists.warnings.map(({ kind }) => kind)).toContain('variable');

		expect(markRequirementRows(manifest, lists).requirements?.variables).toEqual([variableRow]);
	});

	it('returns the same manifest when the lists are empty', () => {
		expect(markRequirementRows(manifest, { missingDependencies: [], warnings: [] })).toBe(manifest);
	});

	it('does not mark a credential row with the id of a workflow entry', () => {
		const sameId = exportOf({
			credentials: [{ ...credentialRow, id: 'sub' }],
			workflows: [workflowRow],
		});
		const result = check({
			manifest: sameId,
			existingCredentialIds: new Set(['sub']),
			workflowOwners: new Map([['sub', PERSONAL_OWNER]]),
		});

		const { requirements } = markRequirementRows(sameId, result);

		expect(requirements?.credentials).toEqual([{ ...credentialRow, id: 'sub' }]);
		expect(requirements?.workflows).toEqual([{ ...workflowRow, reason: 'confirmed-missing' }]);
	});
});

describe('confirmedMissingRows', () => {
	it('keeps only the credential and workflow rows that a Promote confirmed', () => {
		const confirmedCredential = { ...credentialRow, reason: 'confirmed-missing' as const };
		const confirmedWorkflow = { ...workflowRow, reason: 'confirmed-missing' as const };
		const manifest = exportOf({
			credentials: [confirmedCredential, { ...credentialRow, id: 'C2' }],
			workflows: [
				confirmedWorkflow,
				{ id: 'gone', reason: 'missing-on-source', usedBy: usedBy('wf') },
			],
			variables: [{ name: 'region', usedBy: usedBy('wf') }],
		});

		const kept = confirmedMissingRows(manifest);

		expect(kept.requirements).toEqual({
			credentials: [confirmedCredential],
			workflows: [confirmedWorkflow],
		});
		expect(kept.workflows).toEqual(manifest.workflows);
	});

	it('keeps no row of a manifest without requirements', () => {
		expect(confirmedMissingRows(exportOf({})).requirements).toEqual({
			credentials: [],
			workflows: [],
		});
	});
});
