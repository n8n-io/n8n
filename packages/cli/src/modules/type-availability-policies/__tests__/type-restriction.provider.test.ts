import type { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from '../constants';
import type {
	ComposedTypeVerdict,
	TypeAvailabilityPolicyService,
} from '../type-availability-policy.service';
import { TypeAvailabilityRestrictionProvider } from '../type-restriction.provider';

const verdict = (
	name: string,
	action: 'allow' | 'deny',
	scope: 'instance' | 'project' = 'instance',
): ComposedTypeVerdict => ({
	name,
	action,
	scope,
	matchedRuleId: null,
	optInAvailable: false,
});

describe('TypeAvailabilityRestrictionProvider', () => {
	const service = mock<TypeAvailabilityPolicyService>();
	const licenseState = mock<LicenseState>();
	const provider = new TypeAvailabilityRestrictionProvider(service, licenseState);

	beforeEach(() => {
		vi.resetAllMocks();
		licenseState.isLicensed.mockReturnValue(true);
	});

	it('returns only the denied types, with the scope that denied them', async () => {
		service.evaluateComposedTypesFor.mockResolvedValue({
			verdicts: [
				verdict('n8n-nodes-base.gmailTrigger', 'deny', 'instance'),
				verdict('n8n-nodes-base.slack', 'deny', 'project'),
				verdict('n8n-nodes-base.set', 'allow'),
			],
			versions: [],
		});

		const result = await provider.findRestrictedTypes('node', 'p1', [
			'n8n-nodes-base.gmailTrigger',
			'n8n-nodes-base.slack',
			'n8n-nodes-base.set',
		]);

		expect(result).toEqual(
			new Map([
				['n8n-nodes-base.gmailTrigger', { scope: 'instance' }],
				['n8n-nodes-base.slack', { scope: 'project' }],
			]),
		);
	});

	it.each([
		['node', NODE_TYPES_KIND],
		['credential', CREDENTIAL_TYPES_KIND],
	] as const)('evaluates the %s policy kind for the given project', async (kind, policyKind) => {
		service.evaluateComposedTypesFor.mockResolvedValue({ verdicts: [], versions: [] });

		await provider.findRestrictedTypes(kind, 'p1', ['a']);

		expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(policyKind, 'p1', ['a']);
	});

	it('lets the instance policy decide when there is no project', async () => {
		service.evaluateComposedTypesFor.mockResolvedValue({ verdicts: [], versions: [] });

		await provider.findRestrictedTypes('node', null, ['a']);

		expect(service.evaluateComposedTypesFor).toHaveBeenCalledWith(NODE_TYPES_KIND, null, ['a']);
	});

	it('restricts nothing once the license is gone', async () => {
		licenseState.isLicensed.mockReturnValue(false);

		const result = await provider.findRestrictedTypes('node', 'p1', ['a']);

		expect(licenseState.isLicensed).toHaveBeenCalledWith(
			LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES,
		);
		expect(result.size).toBe(0);
		expect(service.evaluateComposedTypesFor).not.toHaveBeenCalled();
	});
});
