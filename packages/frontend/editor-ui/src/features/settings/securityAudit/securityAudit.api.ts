import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type {
	RiskCategory,
	CredentialLocation,
	NodeLocation,
	CommunityNodeDetails,
	CustomNodeDetails,
	StandardSection,
	InstanceSection,
	StandardReport,
	InstanceReport,
	AuditReport,
	SecurityAuditResponse,
	RunAuditOptions,
} from '@n8n/api-types';

// Re-export types for convenience
export type {
	RiskCategory,
	CredentialLocation,
	NodeLocation,
	CommunityNodeDetails,
	CustomNodeDetails,
	StandardSection,
	InstanceSection,
	StandardReport,
	InstanceReport,
	AuditReport,
	SecurityAuditResponse,
	RunAuditOptions,
};

export async function runSecurityAudit(
	context: IRestApiContext,
	options?: RunAuditOptions,
): Promise<SecurityAuditResponse> {
	const payload: { additionalOptions?: RunAuditOptions } = {};
	if (options) {
		payload.additionalOptions = options;
	}
	return await makeRestApiRequest(context, 'POST', '/audit', payload);
}
