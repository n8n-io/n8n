import type { LicenseState } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import type { RestrictedWorkflowRepository } from '../database/repositories/restricted-workflow.repository';
import { NodeTypePolicyRestrictedTypesProvider } from '../restricted-node-types.provider';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

const SLACK = 'n8n-nodes-base.slack';
const SET = 'n8n-nodes-base.set';
const CODE = 'n8n-nodes-base.code';
const IN_USE = [SLACK, SET, CODE];

const QUERY = { query: 'SELECT 1', parameters: {} };

const verdicts = (denied: string[]): ComposedTypeVerdict[] =>
	IN_USE.map((name) => ({
		name,
		action: denied.includes(name) ? 'deny' : 'allow',
		scope: 'instance',
		matchedRuleId: null,
		optInAvailable: false,
	}));

describe('NodeTypePolicyRestrictedTypesProvider', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const licenseState = mock<LicenseState>();
	const restrictedWorkflowRepository = mock<RestrictedWorkflowRepository>();
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const provider = new NodeTypePolicyRestrictedTypesProvider(
		service,
		licenseState,
		restrictedWorkflowRepository,
		policyEnforcementService,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		restrictedWorkflowRepository.findRunningNodeTypes.mockResolvedValue(IN_USE);
		restrictedWorkflowRepository.restrictedWorkflowIdsQuery.mockReturnValue(QUERY);
		service.evaluateComposedTypesForAllProjects.mockResolvedValue({
			withoutProjectPolicy: verdicts([CODE]),
			byProject: [],
		});
	});

	it('names only the projects whose policy changes the shared outcome, grouped by outcome', async () => {
		service.evaluateComposedTypesForAllProjects.mockResolvedValue({
			withoutProjectPolicy: verdicts([CODE]),
			byProject: [
				{ projectId: 'same-as-shared', verdicts: verdicts([CODE]) },
				{ projectId: 'denies-set-1', verdicts: verdicts([CODE, SET]) },
				{ projectId: 'denies-set-2', verdicts: verdicts([SET, CODE]) },
				{ projectId: 'denies-nothing', verdicts: verdicts([]) },
			],
		});

		await expect(provider.findRestrictedWorkflowIds()).resolves.toBe(QUERY);

		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledWith('node-types', IN_USE);
		expect(restrictedWorkflowRepository.restrictedWorkflowIdsQuery).toHaveBeenCalledWith({
			shared: [CODE],
			byProjects: [
				{ projectIds: ['denies-set-1', 'denies-set-2'], nodeTypes: [SET, CODE] },
				{ projectIds: ['denies-nothing'], nodeTypes: [] },
			],
			nodeTypesInUse: IN_USE,
		});
	});

	it('reports nothing when the license has lapsed, as enforcement stops too', async () => {
		licenseState.isLicensed.mockReturnValue(false);

		await expect(provider.findRestrictedWorkflowIds()).resolves.toBeNull();
		expect(restrictedWorkflowRepository.findRunningNodeTypes).not.toHaveBeenCalled();
	});

	it('reports nothing when no policy check runs at workflow start', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		await expect(provider.findRestrictedWorkflowIds()).resolves.toBeNull();
		expect(policyEnforcementService.hasChecksFor).toHaveBeenCalledWith('workflowStart');
		expect(restrictedWorkflowRepository.findRunningNodeTypes).not.toHaveBeenCalled();
	});

	it('reports nothing when no policy denies a node type in use', async () => {
		service.evaluateComposedTypesForAllProjects.mockResolvedValue({
			withoutProjectPolicy: verdicts([]),
			byProject: [{ projectId: 'denies-nothing', verdicts: verdicts([]) }],
		});

		await expect(provider.findRestrictedWorkflowIds()).resolves.toBeNull();
		expect(restrictedWorkflowRepository.restrictedWorkflowIdsQuery).not.toHaveBeenCalled();
	});

	it('shares one evaluation between concurrent requests', async () => {
		await Promise.all([provider.findRestrictedWorkflowIds(), provider.findRestrictedWorkflowIds()]);
		await provider.findRestrictedWorkflowIds();

		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledTimes(2);
	});
});
