import type { SharedCredentials } from '@n8n/db';

import {
	credentialConflicts,
	credentialDiffers,
	credentialUpdateScope,
	divergentCredentials,
	differingCredentials,
	forbiddenCredentialUpdates,
	isUpdateCandidate,
	resolveCredentialConflictPolicy,
	type UpdatableCredential,
} from '../credential-conflict-policy';
import type {
	CredentialMatch,
	CredentialUpdateCandidate,
	CredentialUpdateScope,
} from '../credential.types';

const EXPRESSION = '={{ $vars.token }}';
const OTHER_EXPRESSION = '={{ $vars.otherToken }}';

const owned = (projectId: string): SharedCredentials[] => [
	{ role: 'credential:owner', projectId } as SharedCredentials,
	{ role: 'credential:user', projectId: 'project-shared' } as SharedCredentials,
];

// `isGlobal` is not read, so a test can show that it does not change the scope.
type StoredCredential = UpdatableCredential & { isGlobal: boolean };

const credential = (overrides: Partial<StoredCredential> = {}): StoredCredential => ({
	isManaged: false,
	isResolvable: false,
	isGlobal: false,
	usageScope: 'project',
	shared: owned('project-a'),
	...overrides,
});

const scope: CredentialUpdateScope = { projectIds: new Set(['project-a', 'project-b']) };

const candidate = (
	overrides: Partial<CredentialUpdateCandidate> = {},
): CredentialUpdateCandidate => ({
	sourceId: 'source-1',
	targetId: 'target-1',
	targetName: 'Destination',
	name: 'Package',
	data: { token: EXPRESSION },
	usedBy: [{ kind: 'workflow', id: 'wf-1' }],
	...overrides,
});

describe('resolveCredentialConflictPolicy', () => {
	it('defaults to keep-existing', () => {
		expect(resolveCredentialConflictPolicy(undefined)).toBe('keep-existing');
		expect(resolveCredentialConflictPolicy('fail')).toBe('fail');
	});
});

describe('credentialUpdateScope', () => {
	it('includes every destination project', () => {
		expect(credentialUpdateScope(['project-a', 'project-b'])).toEqual(scope);
	});
});

describe('isUpdateCandidate', () => {
	it('accepts a credential owned by a project of the import', () => {
		expect(isUpdateCandidate(credential(), scope)).toBe(true);
		expect(isUpdateCandidate(credential({ shared: owned('project-b') }), scope)).toBe(true);
	});

	it('rejects a credential owned by a project outside the import', () => {
		expect(isUpdateCandidate(credential({ shared: owned('project-other') }), scope)).toBe(false);
	});

	it('does not count a project the credential is only shared with', () => {
		const sharedOnly = credential({
			shared: [{ role: 'credential:user', projectId: 'project-a' } as SharedCredentials],
		});

		expect(isUpdateCandidate(sharedOnly, scope)).toBe(false);
	});

	it('rejects a global credential owned outside the import', () => {
		const global = credential({ isGlobal: true, shared: owned('personal-project-of-someone') });

		expect(isUpdateCandidate(global, scope)).toBe(false);
	});

	it('accepts a global credential owned by a project of the import', () => {
		expect(isUpdateCandidate(credential({ isGlobal: true }), scope)).toBe(true);
	});

	it.each<[string, Partial<StoredCredential>]>([
		['managed', { isManaged: true }],
		['resolvable', { isResolvable: true }],
		['instance-scoped', { usageScope: 'instance', shared: [] }],
		['managed and global', { isManaged: true, isGlobal: true }],
	])('rejects a %s credential', (_label, overrides) => {
		expect(isUpdateCandidate(credential(overrides), scope)).toBe(false);
	});
});

describe('credentialDiffers', () => {
	it('detects a name change only', () => {
		expect(
			credentialDiffers(
				{ name: 'Old', data: { token: EXPRESSION } },
				{ name: 'New', data: { token: EXPRESSION } },
			),
		).toBe(true);
	});

	it('detects an expression change', () => {
		expect(
			credentialDiffers(
				{ name: 'Same', data: { token: EXPRESSION } },
				{ name: 'Same', data: { token: OTHER_EXPRESSION } },
			),
		).toBe(true);
	});

	it('detects a package expression that replaces a stored plain value', () => {
		expect(
			credentialDiffers(
				{ name: 'Same', data: { token: 'stored-secret' } },
				{ name: 'Same', data: { token: EXPRESSION } },
			),
		).toBe(true);
	});

	it('ignores destination-only keys, including oauthTokenData', () => {
		expect(
			credentialDiffers(
				{
					name: 'Same',
					data: {
						token: EXPRESSION,
						clientSecret: 'secret',
						oauthTokenData: { access_token: 'token' },
					},
				},
				{ name: 'Same', data: { token: EXPRESSION } },
			),
		).toBe(false);
	});

	it('ignores array changes', () => {
		expect(
			credentialDiffers(
				{ name: 'Same', data: { headers: [{ name: 'X-Key', value: 'secret' }] } },
				{ name: 'Same', data: { headers: [{ value: EXPRESSION }, { value: OTHER_EXPRESSION }] } },
			),
		).toBe(false);
	});

	it('ignores an object that holds only arrays when the destination has no such object', () => {
		expect(
			credentialDiffers(
				{ name: 'Same', data: { token: 'stored-secret' } },
				{ name: 'Same', data: { config: { headers: [EXPRESSION] } } },
			),
		).toBe(false);
	});

	it('compares only the name for a file without data', () => {
		const stored = { name: 'Same', data: { token: 'stored-secret' } };

		expect(credentialDiffers(stored, { name: 'Same' })).toBe(false);
		expect(credentialDiffers(stored, { name: 'Other' })).toBe(true);
	});
});

describe('differingCredentials', () => {
	it('gives one conflict for each destination, with merged workflows', () => {
		expect(
			differingCredentials([
				candidate({ usedBy: [{ kind: 'workflow', id: 'wf-2' }] }),
				candidate({
					usedBy: [
						{ kind: 'workflow', id: 'wf-2' },
						{ kind: 'workflow', id: 'wf-1' },
					],
				}),
				candidate({ targetId: 'target-2', targetName: 'Second' }),
			]),
		).toEqual([
			{
				kind: 'differs',
				targetId: 'target-1',
				sourceIds: ['source-1'],
				name: 'Destination',
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'workflow', id: 'wf-2' },
				],
			},
			{
				kind: 'differs',
				targetId: 'target-2',
				sourceIds: ['source-1'],
				name: 'Second',
				usedBy: [{ kind: 'workflow', id: 'wf-1' }],
			},
		]);
	});
});

describe('divergentCredentials', () => {
	it('reports nothing for the same payload twice', () => {
		expect(divergentCredentials([candidate(), candidate({ sourceId: 'source-2' })])).toEqual([]);
	});

	it('reports nothing for the same package credential from two scopes', () => {
		expect(divergentCredentials([candidate(), candidate()])).toEqual([]);
	});

	it('reports one conflict for two payloads on one destination', () => {
		expect(
			divergentCredentials([
				candidate({ sourceId: 'source-2', usedBy: [{ kind: 'workflow', id: 'wf-2' }] }),
				candidate({ data: { token: OTHER_EXPRESSION } }),
			]),
		).toEqual([
			{
				kind: 'divergent',
				targetId: 'target-1',
				sourceIds: ['source-1', 'source-2'],
				name: 'Destination',
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'workflow', id: 'wf-2' },
				],
			},
		]);
	});

	it('reports a name difference', () => {
		expect(
			divergentCredentials([candidate(), candidate({ sourceId: 'source-2', name: 'Other' })]),
		).toHaveLength(1);
	});

	it('ignores payloads that differ only by arrays', () => {
		expect(
			divergentCredentials([
				candidate({ data: { token: EXPRESSION, scopes: [EXPRESSION] } }),
				candidate({ sourceId: 'source-2', data: { token: EXPRESSION } }),
			]),
		).toEqual([]);
	});

	it('ignores a payload whose only difference is an object that holds only arrays', () => {
		expect(
			divergentCredentials([
				candidate({ data: { token: EXPRESSION, config: { headers: [EXPRESSION] } } }),
				candidate({ sourceId: 'source-2', data: { token: EXPRESSION } }),
			]),
		).toEqual([]);
	});

	it('counts a candidate that equals the destination', () => {
		// source-1 equals the destination and is not an update; writing source-2 would drop it.
		expect(
			divergentCredentials([
				candidate(),
				candidate({ sourceId: 'source-2', data: { token: OTHER_EXPRESSION } }),
			]),
		).toEqual([
			expect.objectContaining({ kind: 'divergent', sourceIds: ['source-1', 'source-2'] }),
		]);
	});

	it('does not compare candidates of different destinations', () => {
		expect(
			divergentCredentials([
				candidate(),
				candidate({ sourceId: 'source-2', targetId: 'target-2', name: 'Other' }),
			]),
		).toEqual([]);
	});
});

describe('credentialConflicts', () => {
	const divergingPlans = [
		{ candidates: [candidate()], updates: [candidate()] },
		{
			candidates: [candidate({ sourceId: 'source-2', name: 'Other' })],
			updates: [candidate({ sourceId: 'source-2', name: 'Other' })],
		},
	];

	it('reports nothing under keep-existing', () => {
		expect(credentialConflicts('keep-existing', divergingPlans)).toEqual([]);
	});

	it('reports differs and no divergence under fail', () => {
		expect(credentialConflicts('fail', divergingPlans)).toEqual([
			expect.objectContaining({ kind: 'differs', sourceIds: ['source-1', 'source-2'] }),
		]);
	});

	it('reports divergence and no differs under overwrite', () => {
		expect(credentialConflicts('overwrite', divergingPlans)).toEqual([
			expect.objectContaining({ kind: 'divergent', sourceIds: ['source-1', 'source-2'] }),
		]);
	});

	it('dedupes one destination reached from several scopes under fail', () => {
		const plans = [
			{ candidates: [candidate()], updates: [candidate()] },
			{ candidates: [candidate()], updates: [candidate()] },
		];

		expect(credentialConflicts('fail', plans)).toHaveLength(1);
		expect(credentialConflicts('overwrite', plans)).toEqual([]);
	});
});

describe('forbiddenCredentialUpdates', () => {
	const match = (overrides: Partial<CredentialMatch> = {}): CredentialMatch => ({
		sourceId: 'source-1',
		targetId: 'target-1',
		targetName: 'Destination',
		usedBy: [{ kind: 'workflow', id: 'wf-1' }],
		...overrides,
	});

	it('gives one issue for each destination across scopes, with merged consumers', () => {
		const plans = [
			{ forbidden: [match(), match({ targetId: 'target-2', targetName: 'Other' })] },
			{
				forbidden: [
					match({ usedBy: [{ kind: 'workflow', id: 'wf-2' }] }),
					match({ sourceId: 'source-0' }),
				],
			},
		];

		expect(forbiddenCredentialUpdates(plans)).toEqual([
			{
				targetId: 'target-1',
				sourceIds: ['source-0', 'source-1'],
				name: 'Destination',
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'workflow', id: 'wf-2' },
				],
			},
			{
				targetId: 'target-2',
				sourceIds: ['source-1'],
				name: 'Other',
				usedBy: [{ kind: 'workflow', id: 'wf-1' }],
			},
		]);
	});

	it('reports nothing without forbidden matches', () => {
		expect(forbiddenCredentialUpdates([{ forbidden: [] }])).toEqual([]);
	});
});
