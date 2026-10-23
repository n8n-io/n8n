import type { PackagePolicyRestrictions, RestrictedPackageType } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Service } from '@n8n/di';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { InstalledTypeRestrictionsProvider } from '@n8n/backend-services';

import { NODE_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

/**
 * A type the scope without a project policy denies is blocked on the instance, even when some
 * projects opt in. Otherwise it is blocked in the projects whose own policy denies it.
 */
export function toRestrictedTypes(
	withoutProjectPolicy: readonly ComposedTypeVerdict[],
	byProject: ReadonlyArray<{ projectId: string; verdicts: readonly ComposedTypeVerdict[] }>,
): RestrictedPackageType[] {
	return withoutProjectPolicy.flatMap((verdict): RestrictedPackageType[] => {
		if (verdict.action === 'deny') {
			return [
				{ type: verdict.name, blockedOn: 'instance', optInAvailable: verdict.optInAvailable },
			];
		}

		const blockedInProjects = byProject.some(({ verdicts }) =>
			verdicts.some(
				(projectVerdict) =>
					projectVerdict.name === verdict.name && projectVerdict.action === 'deny',
			),
		);

		return blockedInProjects
			? [{ type: verdict.name, blockedOn: 'projects', optInAvailable: false }]
			: [];
	});
}

@Service()
export class NodeTypePolicyInstalledTypeRestrictionsProvider
	implements InstalledTypeRestrictionsProvider
{
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
		private readonly policyEnforcementService: PolicyEnforcementService,
	) {}

	async describeRestrictions({
		nodeTypes,
	}: {
		nodeTypes: readonly string[];
	}): Promise<PackagePolicyRestrictions | null> {
		if (
			!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES) ||
			!(
				this.policyEnforcementService.hasChecksFor('workflowStart') ||
				this.policyEnforcementService.hasChecksFor('workflowSave')
			)
		) {
			return null;
		}
		if (nodeTypes.length === 0) return { nodeTypes: [] };

		const { withoutProjectPolicy, byProject } =
			await this.service.evaluateComposedTypesForAllProjects(NODE_TYPES_KIND, nodeTypes);

		return { nodeTypes: toRestrictedTypes(withoutProjectPolicy, byProject) };
	}
}
