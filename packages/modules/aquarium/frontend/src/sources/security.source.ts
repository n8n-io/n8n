import type { AquariumSecurity } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { EntityMetricsPatch, MetricsSource } from '../aquarium.types';
import { entityKey } from './source.utils';

export function toSecurityPatches(security: AquariumSecurity): EntityMetricsPatch[] {
	return security.workflows.map((workflow) => ({
		key: entityKey('workflow', workflow.workflowId),
		metrics: { securityRisks: workflow.risks.length },
	}));
}

/** Needs the `aquarium` backend module. It lists only the workflows with one or more risks. */
export const securitySource: MetricsSource = {
	id: 'security',
	async load({ restApiContext }) {
		const security = await makeRestApiRequest<AquariumSecurity>(
			restApiContext,
			'GET',
			'/aquarium/security',
		);
		return toSecurityPatches(security);
	},
};
