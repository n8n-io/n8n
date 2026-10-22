import type { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import { NODE_TYPES_KIND } from '../constants';
import {
	NodeTypePolicyInstalledTypeRestrictionsProvider,
	toRestrictedTypes,
} from '../installed-type-restrictions.provider';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

const ALPHA = 'n8n-nodes-example.alpha';
const BETA = 'n8n-nodes-example.beta';
const GAMMA = 'n8n-nodes-example.gamma';
const PACKAGE_NODES = [ALPHA, BETA, GAMMA];

const verdicts = (
	denied: string[],
	{ optInAvailable = false }: { optInAvailable?: boolean } = {},
): ComposedTypeVerdict[] =>
	PACKAGE_NODES.map((name) => ({
		name,
		action: denied.includes(name) ? 'deny' : 'allow',
		scope: 'instance',
		matchedRuleId: null,
		optInAvailable: denied.includes(name) && optInAvailable,
	}));

describe('toRestrictedTypes', () => {
	it('returns nothing when no scope denies a type', () => {
		expect(toRestrictedTypes(verdicts([]), [{ projectId: 'p1', verdicts: verdicts([]) }])).toEqual(
			[],
		);
	});

	it('reports a final instance deny as blocked on the instance', () => {
		expect(toRestrictedTypes(verdicts([ALPHA]), [])).toEqual([
			{ type: ALPHA, blockedOn: 'instance', optInAvailable: false },
		]);
	});

	it('reports an unsatisfied delegation as blocked on the instance with opt-in available', () => {
		expect(toRestrictedTypes(verdicts([ALPHA], { optInAvailable: true }), [])).toEqual([
			{ type: ALPHA, blockedOn: 'instance', optInAvailable: true },
		]);
	});

	it('keeps a delegated type on the instance even when a project opts in', () => {
		expect(
			toRestrictedTypes(verdicts([ALPHA], { optInAvailable: true }), [
				{ projectId: 'opts-in', verdicts: verdicts([]) },
			]),
		).toEqual([{ type: ALPHA, blockedOn: 'instance', optInAvailable: true }]);
	});

	it('reports a type the instance allows but some projects deny', () => {
		expect(
			toRestrictedTypes(verdicts([]), [
				{ projectId: 'p1', verdicts: verdicts([BETA]) },
				{ projectId: 'p2', verdicts: verdicts([BETA, GAMMA]) },
				{ projectId: 'p3', verdicts: verdicts([]) },
			]),
		).toEqual([
			{ type: BETA, blockedOn: 'projects', optInAvailable: false },
			{ type: GAMMA, blockedOn: 'projects', optInAvailable: false },
		]);
	});

	it('reports instance and project blocks side by side', () => {
		expect(
			toRestrictedTypes(verdicts([ALPHA]), [
				{ projectId: 'p1', verdicts: verdicts([ALPHA, BETA]) },
			]),
		).toEqual([
			{ type: ALPHA, blockedOn: 'instance', optInAvailable: false },
			{ type: BETA, blockedOn: 'projects', optInAvailable: false },
		]);
	});
});

describe('NodeTypePolicyInstalledTypeRestrictionsProvider', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const licenseState = mock<LicenseState>();
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const provider = new NodeTypePolicyInstalledTypeRestrictionsProvider(
		service,
		licenseState,
		policyEnforcementService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		service.evaluateComposedTypesForAllProjects.mockResolvedValue({
			withoutProjectPolicy: verdicts([ALPHA]),
			byProject: [],
		});
	});

	it('evaluates the package node types against the node type policies', async () => {
		await expect(provider.describeRestrictions({ nodeTypes: PACKAGE_NODES })).resolves.toEqual({
			nodeTypes: [{ type: ALPHA, blockedOn: 'instance', optInAvailable: false }],
		});
		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledWith(
			NODE_TYPES_KIND,
			PACKAGE_NODES,
		);
	});

	it('returns an empty list when the policies block nothing', async () => {
		service.evaluateComposedTypesForAllProjects.mockResolvedValue({
			withoutProjectPolicy: verdicts([]),
			byProject: [],
		});

		await expect(provider.describeRestrictions({ nodeTypes: PACKAGE_NODES })).resolves.toEqual({
			nodeTypes: [],
		});
	});

	it('returns null when the instance is not licensed for type policies', async () => {
		licenseState.isLicensed.mockReturnValue(false);

		await expect(provider.describeRestrictions({ nodeTypes: PACKAGE_NODES })).resolves.toBeNull();
		expect(licenseState.isLicensed).toHaveBeenCalledWith(
			LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES,
		);
		expect(service.evaluateComposedTypesForAllProjects).not.toHaveBeenCalled();
	});

	it('evaluates when only the save point has policy checks', async () => {
		policyEnforcementService.hasChecksFor.mockImplementation((point) => point === 'workflowSave');

		await expect(provider.describeRestrictions({ nodeTypes: PACKAGE_NODES })).resolves.toEqual({
			nodeTypes: [{ type: ALPHA, blockedOn: 'instance', optInAvailable: false }],
		});
	});

	it('returns null when neither the start nor the save point has policy checks', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		await expect(provider.describeRestrictions({ nodeTypes: PACKAGE_NODES })).resolves.toBeNull();
		expect(service.evaluateComposedTypesForAllProjects).not.toHaveBeenCalled();
	});

	it('skips the evaluation for a package without nodes', async () => {
		await expect(provider.describeRestrictions({ nodeTypes: [] })).resolves.toEqual({
			nodeTypes: [],
		});
		expect(service.evaluateComposedTypesForAllProjects).not.toHaveBeenCalled();
	});
});
