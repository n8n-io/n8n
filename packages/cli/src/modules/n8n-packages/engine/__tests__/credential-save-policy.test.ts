import type { PolicyViolation } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { PolicyCleared } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import type {
	CredentialBindingRequest,
	CredentialResolution,
	CredentialResolutionFailure,
	CredentialUpdateCandidate,
} from '../../entities/credential/credential.types';
import type { CredentialMissingMode } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import { CredentialSavePolicyGate } from '../credential-save-policy';

const violation: PolicyViolation = {
	kind: 'credential-type-unavailable',
	checkId: 'test.check',
	message: 'Credential type is not available here',
};

const cleared = mock<PolicyCleared<'credentialSave'>>();

const notFound = (
	sourceId: string,
	overrides: Partial<CredentialResolutionFailure> = {},
): CredentialResolutionFailure => ({
	kind: 'not_found',
	sourceId,
	name: `Credential ${sourceId}`,
	type: 'githubApi',
	...overrides,
});

const requirement = (id: string, workflowIds: string[]): PackageCredentialRequirement => ({
	id,
	name: `Credential ${id}`,
	type: 'githubApi',
	usedBy: workflowIds.map((workflowId) => ({ kind: 'workflow', id: workflowId })),
});

const request = (
	missingMode: CredentialMissingMode = 'create-stub',
	requirements: PackageCredentialRequirement[] = [],
): CredentialBindingRequest => ({
	requirements,
	matchingMode: 'id-only',
	missingMode,
	conflictPolicy: 'keep-existing',
	updateScope: { projectIds: new Set() },
});

const resolution = (...failures: CredentialResolutionFailure[]): CredentialResolution => ({
	successes: new Map(),
	failures,
});

describe('CredentialSavePolicyGate', () => {
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const gate = new CredentialSavePolicyGate(policyEnforcementService, mock<Logger>());
	const actor: PolicyActor = { kind: 'user', user: { id: 'user-1' } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('admits nothing when no check is registered', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		expect(
			await gate.refusedStubs(request(), resolution(notFound('C1')), 'project-1', actor),
		).toEqual([]);
		expect(policyEnforcementService.hasChecksFor).toHaveBeenCalledWith('credentialSave');
		expect(policyEnforcementService.enforceCredentialSave).not.toHaveBeenCalled();
	});

	it('checks each stub as a new credential of its type in the target project', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceCredentialSave.mockResolvedValue(cleared);

		expect(
			await gate.refusedStubs(
				request(),
				resolution(notFound('C1'), notFound('C2', { type: 'slackApi' })),
				'project-1',
				actor,
			),
		).toEqual([]);

		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenNthCalledWith(
			1,
			{
				credential: { id: null, type: 'githubApi' },
				storedCredential: null,
				projectId: 'project-1',
			},
			actor,
		);
		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenNthCalledWith(
			2,
			{
				credential: { id: null, type: 'slackApi' },
				storedCredential: null,
				projectId: 'project-1',
			},
			actor,
		);
	});

	it('checks nothing under must-preexist, which never creates a stub', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);

		expect(
			await gate.refusedStubs(
				request('must-preexist'),
				resolution(notFound('C1')),
				'project-1',
				actor,
			),
		).toEqual([]);
		expect(policyEnforcementService.enforceCredentialSave).not.toHaveBeenCalled();
	});

	it('checks only the failures the import stubs', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceCredentialSave.mockResolvedValue(cleared);

		await gate.refusedStubs(
			request(),
			resolution(
				notFound('C1', { type: 'stubbedApi' }),
				notFound('C2', { targetId: 'bound-target' }),
				notFound('C3', { kind: 'unknown_type' }),
				notFound('C4', { kind: 'source_not_found' }),
				notFound('C5', { kind: 'type_mismatch' }),
			),
			'project-1',
			actor,
		);

		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledTimes(1);
		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledWith(
			expect.objectContaining({ credential: { id: null, type: 'stubbedApi' } }),
			actor,
		);
	});

	it('checks a source id referenced twice once', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceCredentialSave.mockResolvedValue(cleared);

		await gate.refusedStubs(
			request(),
			resolution(notFound('C1'), notFound('C1')),
			'project-1',
			actor,
		);

		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledTimes(1);
	});

	it('skips a stub without a type, which apply rejects on its own', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);

		expect(
			await gate.refusedStubs(
				request(),
				resolution(notFound('C1', { type: undefined })),
				'project-1',
				actor,
			),
		).toEqual([]);
		expect(policyEnforcementService.enforceCredentialSave).not.toHaveBeenCalled();
	});

	it('reports every refusal with its violations, not just the first', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceCredentialSave.mockRejectedValue(
			new PolicyViolationError([violation]),
		);

		const refused = await gate.refusedStubs(
			request('create-stub', [
				requirement('C1', ['wf-2', 'wf-1', 'wf-2']),
				requirement('C2', ['wf-1']),
			]),
			resolution(notFound('C1'), notFound('C2', { name: undefined })),
			'project-1',
			actor,
		);

		expect(refused).toEqual([
			{
				type: 'credential-policy-violation',
				sourceId: 'C1',
				name: 'Credential C1',
				credentialType: 'githubApi',
				usedBy: [
					{ kind: 'workflow', id: 'wf-1' },
					{ kind: 'workflow', id: 'wf-2' },
				],
				violations: [violation],
			},
			{
				type: 'credential-policy-violation',
				sourceId: 'C2',
				credentialType: 'githubApi',
				usedBy: [{ kind: 'workflow', id: 'wf-1' }],
				violations: [violation],
			},
		]);
	});

	it('carries on past a refusal to admit the rest', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceCredentialSave
			.mockRejectedValueOnce(new PolicyViolationError([violation]))
			.mockResolvedValue(cleared);

		const refused = await gate.refusedStubs(
			request(),
			resolution(notFound('C1'), notFound('C2')),
			'project-1',
			actor,
		);

		expect(refused).toHaveLength(1);
		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledTimes(2);
	});

	it('fails the import when a check breaks, rather than reading as a refusal', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		const checkFailure = new Error('check exploded');
		policyEnforcementService.enforceCredentialSave.mockRejectedValue(checkFailure);

		await expect(
			gate.refusedStubs(request(), resolution(notFound('C1')), 'project-1', actor),
		).rejects.toBe(checkFailure);
	});
});

describe('CredentialSavePolicyGate.refusedUpdates', () => {
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const gate = new CredentialSavePolicyGate(policyEnforcementService, mock<Logger>());
	const actor: PolicyActor = { kind: 'user', user: { id: 'user-1' } };
	const importCleared = mock<PolicyCleared<'contentImport'>>();

	const update = (
		overrides: Partial<CredentialUpdateCandidate> = {},
	): CredentialUpdateCandidate => ({
		sourceId: 'S1',
		targetId: 'T1',
		targetName: 'GitHub',
		targetType: 'githubApi',
		ownerProjectId: 'owner-project',
		name: 'Package GitHub',
		usedBy: [{ kind: 'workflow', id: 'wf-1' }],
		...overrides,
	});

	const byTarget = (...updates: CredentialUpdateCandidate[]) => {
		const map = new Map<string, CredentialUpdateCandidate[]>();
		for (const candidate of updates) {
			map.set(candidate.targetId, [...(map.get(candidate.targetId) ?? []), candidate]);
		}
		return map;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		policyEnforcementService.enforceCredentialSave.mockResolvedValue(cleared);
		policyEnforcementService.enforceContentImport.mockResolvedValue(importCleared);
	});

	it('checks nothing when no check is registered', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		expect(await gate.refusedUpdates(byTarget(update()), 'package', actor)).toEqual([]);
		expect(policyEnforcementService.enforceCredentialSave).not.toHaveBeenCalled();
		expect(policyEnforcementService.enforceContentImport).not.toHaveBeenCalled();
	});

	it('checks an update like the write-time save, and as imported content', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);

		expect(await gate.refusedUpdates(byTarget(update()), 'git-connection', actor)).toEqual([]);

		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledWith(
			{
				credential: { id: 'T1', type: 'githubApi' },
				storedCredential: { id: 'T1', type: 'githubApi' },
				projectId: 'owner-project',
			},
			actor,
		);
		expect(policyEnforcementService.enforceContentImport).toHaveBeenCalledWith(
			{
				credential: { id: 'T1', type: 'githubApi' },
				projectId: 'owner-project',
				transport: 'git-connection',
			},
			actor,
		);
	});

	it('asks only the points that have checks', async () => {
		policyEnforcementService.hasChecksFor.mockImplementation((point) => point === 'contentImport');

		await gate.refusedUpdates(byTarget(update()), 'package', actor);

		expect(policyEnforcementService.enforceCredentialSave).not.toHaveBeenCalled();
		expect(policyEnforcementService.enforceContentImport).toHaveBeenCalledTimes(1);
	});

	it('checks a destination once, and reports each package credential that resolves to it', async () => {
		policyEnforcementService.hasChecksFor.mockImplementation((point) => point === 'credentialSave');
		policyEnforcementService.enforceCredentialSave.mockRejectedValue(
			new PolicyViolationError([violation]),
		);

		const refused = await gate.refusedUpdates(
			byTarget(
				update({ usedBy: [{ kind: 'workflow', id: 'wf-2' }] }),
				update({ sourceId: 'S2', name: 'Other', usedBy: [{ kind: 'workflow', id: 'wf-3' }] }),
			),
			'package',
			actor,
		);

		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledTimes(1);
		expect(refused).toEqual([
			{
				type: 'credential-policy-violation',
				sourceId: 'S1',
				targetId: 'T1',
				name: 'Package GitHub',
				credentialType: 'githubApi',
				usedBy: [{ kind: 'workflow', id: 'wf-2' }],
				violations: [violation],
			},
			{
				type: 'credential-policy-violation',
				sourceId: 'S2',
				targetId: 'T1',
				name: 'Other',
				credentialType: 'githubApi',
				usedBy: [{ kind: 'workflow', id: 'wf-3' }],
				violations: [violation],
			},
		]);
	});

	it('reports the violations of both points together', async () => {
		const importViolation: PolicyViolation = { ...violation, checkId: 'test.import' };
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.enforceCredentialSave.mockRejectedValue(
			new PolicyViolationError([violation]),
		);
		policyEnforcementService.enforceContentImport.mockRejectedValue(
			new PolicyViolationError([importViolation]),
		);

		const [refused] = await gate.refusedUpdates(byTarget(update()), 'package', actor);

		expect(refused).toEqual(expect.objectContaining({ violations: [violation, importViolation] }));
	});

	it('carries on past a refusal to check the other destinations', async () => {
		policyEnforcementService.hasChecksFor.mockImplementation((point) => point === 'credentialSave');
		policyEnforcementService.enforceCredentialSave
			.mockRejectedValueOnce(new PolicyViolationError([violation]))
			.mockResolvedValue(cleared);

		const refused = await gate.refusedUpdates(
			byTarget(update(), update({ sourceId: 'S2', targetId: 'T2' })),
			'package',
			actor,
		);

		expect(refused).toEqual([expect.objectContaining({ sourceId: 'S1', targetId: 'T1' })]);
		expect(policyEnforcementService.enforceCredentialSave).toHaveBeenCalledTimes(2);
	});

	it('fails the import when a check breaks, rather than reading as a refusal', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		const checkFailure = new Error('check exploded');
		policyEnforcementService.enforceContentImport.mockRejectedValue(checkFailure);

		await expect(gate.refusedUpdates(byTarget(update()), 'package', actor)).rejects.toBe(
			checkFailure,
		);
	});
});
