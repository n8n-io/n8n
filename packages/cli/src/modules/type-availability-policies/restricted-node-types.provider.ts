import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	WorkflowDependencyRepository,
	type NodeTypesInProjects,
	type RestrictedNodeTypes,
} from '@n8n/db';
import { Service } from '@n8n/di';

import {
	NO_RESTRICTED_NODE_TYPES,
	type RestrictedNodeTypesProvider,
} from '@/workflows/restricted-node-types-provider-proxy.service';

import { NODE_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

const deniedNames = (verdicts: ComposedTypeVerdict[]) =>
	verdicts.filter((verdict) => verdict.action === 'deny').map((verdict) => verdict.name);

@Service()
export class NodeTypePolicyRestrictedTypesProvider implements RestrictedNodeTypesProvider {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
	) {}

	async findRestrictedNodeTypesInUse(): Promise<RestrictedNodeTypes> {
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)) {
			return NO_RESTRICTED_NODE_TYPES;
		}

		const inUse = await this.workflowDependencyRepository.findRunningNodeTypes();
		if (inUse.length === 0) return NO_RESTRICTED_NODE_TYPES;

		const { withoutProjectPolicy, byProject } =
			await this.service.evaluateComposedTypesForAllProjects(NODE_TYPES_KIND, inUse);

		const shared = deniedNames(withoutProjectPolicy);
		const sharedKey = shared.join('\n');
		const exceptProjectIds: string[] = [];
		const groups = new Map<string, NodeTypesInProjects>();
		for (const { projectId, verdicts } of byProject) {
			const denied = deniedNames(verdicts);
			const key = denied.join('\n');
			if (key === sharedKey) continue;

			exceptProjectIds.push(projectId);
			if (denied.length === 0) continue;

			const group = groups.get(key) ?? { projectIds: [], nodeTypes: denied };
			group.projectIds.push(projectId);
			groups.set(key, group);
		}

		return { shared, exceptProjectIds, byProjects: [...groups.values()], nodeTypesInUse: inUse };
	}
}
