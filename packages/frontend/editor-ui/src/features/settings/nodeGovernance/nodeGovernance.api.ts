import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface NodeGovernancePolicy {
	id: string;
	policyType: 'allow' | 'block';
	scope: 'global' | 'projects';
	targetType: 'node' | 'category';
	targetValue: string;
	createdById: string | null;
	createdBy?: { id: string; email: string; firstName?: string; lastName?: string };
	projectAssignments?: Array<{
		id: string;
		projectId: string;
		project?: { id: string; name: string };
	}>;
	createdAt: string;
	updatedAt: string;
}

export interface NodeCategory {
	id: string;
	slug: string;
	displayName: string;
	description: string | null;
	color: string | null;
	createdById: string | null;
	createdBy?: { id: string; email: string; firstName?: string; lastName?: string };
	nodeAssignments?: Array<{ id: string; nodeType: string }>;
	createdAt: string;
	updatedAt: string;
}

export interface NodeAccessRequest {
	id: string;
	projectId: string;
	requestedById: string;
	nodeType: string;
	justification: string;
	workflowName: string | null;
	status: 'pending' | 'approved' | 'rejected';
	reviewedById: string | null;
	reviewComment: string | null;
	reviewedAt: string | null;
	project?: { id: string; name: string };
	requestedBy?: { id: string; email: string; firstName?: string; lastName?: string };
	reviewedBy?: { id: string; email: string; firstName?: string; lastName?: string };
	createdAt: string;
	updatedAt: string;
}

export interface GovernanceStatus {
	status: 'allowed' | 'blocked' | 'pending_request';
	category?: string;
	requestId?: string;
}

// Policies
export async function getPolicies(
	context: IRestApiContext,
): Promise<{ policies: NodeGovernancePolicy[] }> {
	return await makeRestApiRequest(context, 'GET', '/node-governance/policies');
}

export async function createPolicy(
	context: IRestApiContext,
	data: {
		policyType: 'allow' | 'block';
		scope: 'global' | 'projects';
		targetType: 'node' | 'category';
		targetValue: string;
		projectIds?: string[];
	},
): Promise<{ policy: NodeGovernancePolicy }> {
	return await makeRestApiRequest(context, 'POST', '/node-governance/policies', data);
}

export async function updatePolicy(
	context: IRestApiContext,
	id: string,
	data: Partial<{
		policyType: 'allow' | 'block';
		scope: 'global' | 'projects';
		targetType: 'node' | 'category';
		targetValue: string;
		projectIds: string[];
	}>,
): Promise<{ policy: NodeGovernancePolicy }> {
	return await makeRestApiRequest(context, 'PATCH', `/node-governance/policies/${id}`, data);
}

export async function deletePolicy(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/node-governance/policies/${id}`);
}

// Categories
export async function getCategories(
	context: IRestApiContext,
): Promise<{ categories: NodeCategory[] }> {
	return await makeRestApiRequest(context, 'GET', '/node-governance/categories');
}

export async function createCategory(
	context: IRestApiContext,
	data: {
		slug: string;
		displayName: string;
		description?: string;
		color?: string;
	},
): Promise<{ category: NodeCategory }> {
	return await makeRestApiRequest(context, 'POST', '/node-governance/categories', data);
}

export async function updateCategory(
	context: IRestApiContext,
	id: string,
	data: Partial<{
		slug: string;
		displayName: string;
		description: string | null;
		color: string | null;
	}>,
): Promise<{ category: NodeCategory }> {
	return await makeRestApiRequest(context, 'PATCH', `/node-governance/categories/${id}`, data);
}

export async function deleteCategory(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/node-governance/categories/${id}`);
}

export async function assignNodeToCategory(
	context: IRestApiContext,
	categoryId: string,
	nodeType: string,
): Promise<{ assignment: unknown }> {
	return await makeRestApiRequest(context, 'POST', `/node-governance/categories/${categoryId}/nodes`, {
		nodeType,
	});
}

export async function removeNodeFromCategory(
	context: IRestApiContext,
	categoryId: string,
	nodeType: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`/node-governance/categories/${categoryId}/nodes/${encodeURIComponent(nodeType)}`,
	);
}

// Access Requests
export async function getPendingRequests(
	context: IRestApiContext,
): Promise<{ requests: NodeAccessRequest[] }> {
	return await makeRestApiRequest(context, 'GET', '/node-governance/requests');
}

export async function getMyRequests(
	context: IRestApiContext,
): Promise<{ requests: NodeAccessRequest[] }> {
	return await makeRestApiRequest(context, 'GET', '/node-governance/requests/my');
}

export async function createAccessRequest(
	context: IRestApiContext,
	data: {
		projectId: string;
		nodeType: string;
		justification: string;
		workflowName?: string;
	},
): Promise<{ alreadyExists: boolean; request: NodeAccessRequest; message?: string }> {
	return await makeRestApiRequest(context, 'POST', '/node-governance/requests', data);
}

export async function reviewAccessRequest(
	context: IRestApiContext,
	id: string,
	data: {
		action: 'approve' | 'reject';
		comment?: string;
		createPolicy?: boolean;
	},
): Promise<{ request: NodeAccessRequest }> {
	return await makeRestApiRequest(context, 'POST', `/node-governance/requests/${id}/review`, data);
}

// Node Governance Status
export async function getNodeGovernanceStatus(
	context: IRestApiContext,
	projectId: string,
	nodeTypes: string[],
): Promise<{ governance: Record<string, GovernanceStatus> }> {
	const nodeTypesParam = nodeTypes.join(',');
	return await makeRestApiRequest(
		context,
		'GET',
		`/node-governance/status?projectId=${encodeURIComponent(projectId)}&nodeTypes=${encodeURIComponent(nodeTypesParam)}`,
	);
}
