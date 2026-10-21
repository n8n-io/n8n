import { findEntraTenantIdIssue } from '@n8n/ai-utilities/model-discovery';
import { NodeOperationError, type INode } from 'n8n-workflow';

/**
 * Returns the validated (trimmed) tenant ID. Runs at mint time, not on the
 * credential form: saved credentials can still hold the old `common` default.
 */
export function requireTenantId(node: INode, tenantId: string | undefined): string {
	const issue = findEntraTenantIdIssue(tenantId);
	if (issue) {
		throw new NodeOperationError(
			node,
			issue.message,
			issue.description ? { description: issue.description } : undefined,
		);
	}
	return tenantId?.trim() ?? '';
}
