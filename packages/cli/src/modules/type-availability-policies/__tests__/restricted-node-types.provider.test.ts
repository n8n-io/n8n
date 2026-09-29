import type { LicenseState } from '@n8n/backend-common';
import type { WorkflowDependencyRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { NodeTypePolicyRestrictedTypesProvider } from '../restricted-node-types.provider';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';

const SLACK = 'n8n-nodes-base.slack';
const SET = 'n8n-nodes-base.set';
const CODE = 'n8n-nodes-base.code';
const IN_USE = [SLACK, SET, CODE];

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
	const workflowDependencyRepository = mock<WorkflowDependencyRepository>();
	const provider = new NodeTypePolicyRestrictedTypesProvider(
		service,
		licenseState,
		workflowDependencyRepository,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
		workflowDependencyRepository.findRunningNodeTypes.mockResolvedValue(IN_USE);
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

		const restricted = await provider.findRestrictedNodeTypesInUse();

		expect(service.evaluateComposedTypesForAllProjects).toHaveBeenCalledWith('node-types', IN_USE);
		expect(restricted).toEqual({
			shared: [CODE],
			exceptProjectIds: ['denies-set-1', 'denies-set-2', 'denies-nothing'],
			byProjects: [{ projectIds: ['denies-set-1', 'denies-set-2'], nodeTypes: [SET, CODE] }],
			nodeTypesInUse: IN_USE,
		});
	});

	it('reports nothing when the license has lapsed, as enforcement stops too', async () => {
		licenseState.isLicensed.mockReturnValue(false);

		const restricted = await provider.findRestrictedNodeTypesInUse();

		expect(restricted).toEqual({
			shared: [],
			exceptProjectIds: [],
			byProjects: [],
			nodeTypesInUse: [],
		});
		expect(workflowDependencyRepository.findRunningNodeTypes).not.toHaveBeenCalled();
	});
});
