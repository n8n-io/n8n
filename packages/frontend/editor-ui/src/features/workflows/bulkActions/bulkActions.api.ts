import type { BulkWorkflowActionResult } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	toggleWorkflowsMcpAccessApi,
	type ToggleWorkflowsMcpAccessResponse,
	type ToggleWorkflowsMcpAccessTarget,
} from '@/features/ai/mcpAccess/mcp.api';

import type {
	BulkActionResult,
	BulkActionResultItem,
	BulkSelectableResource,
} from './bulkActions.types';

// ── Raw REST bulk endpoints (backend-provided) ──

export async function bulkArchiveWorkflowsApi(
	context: IRestApiContext,
	workflowIds: string[],
): Promise<BulkWorkflowActionResult> {
	return await makeRestApiRequest(context, 'POST', '/workflows/bulk/archive', { workflowIds });
}

export async function bulkDeleteWorkflowsApi(
	context: IRestApiContext,
	workflowIds: string[],
): Promise<BulkWorkflowActionResult> {
	return await makeRestApiRequest(context, 'POST', '/workflows/bulk/delete', { workflowIds });
}

export async function bulkUnpublishWorkflowsApi(
	context: IRestApiContext,
	workflowIds: string[],
): Promise<BulkWorkflowActionResult> {
	return await makeRestApiRequest(context, 'POST', '/workflows/bulk/unpublish', { workflowIds });
}

export async function bulkTransferWorkflowsApi(
	context: IRestApiContext,
	payload: {
		workflowIds: string[];
		destinationProjectId: string;
		destinationParentFolderId?: string;
	},
): Promise<BulkWorkflowActionResult> {
	return await makeRestApiRequest(context, 'POST', '/workflows/bulk/transfer', payload);
}

// ── Normalization helpers ──

const nameOf = (items: BulkSelectableResource[]) => {
	const byId = new Map(items.map((item) => [item.id, item]));
	return (id: string) => byId.get(id)?.name ?? id;
};

/**
 * Turns the backend `BulkWorkflowActionResult` (keyed by workflowId) into the
 * feature's resource-shaped result, resolving display names from the affected set.
 */
export function normalizeWorkflowActionResult(
	response: BulkWorkflowActionResult,
	affected: BulkSelectableResource[],
): BulkActionResult {
	const resolveName = nameOf(affected);
	const items: BulkActionResultItem[] = response.results.map((item) => ({
		id: item.workflowId,
		resourceType: 'workflow',
		name: resolveName(item.workflowId),
		status: item.status,
		message: item.message ?? item.reason,
	}));

	return { status: response.status, items, mocked: false };
}

export async function bulkToggleMcpAccess(
	context: IRestApiContext,
	params: {
		workflows: BulkSelectableResource[];
		availableInMCP: boolean;
	},
): Promise<BulkActionResult> {
	const { workflows, availableInMCP } = params;
	const items: BulkActionResultItem[] = [];
	let hadFailure = false;

	const classifyWorkflows = (response: ToggleWorkflowsMcpAccessResponse) => {
		const updated = new Set(response.updatedIds ?? []);
		const unchanged = new Set(response.unchangedIds ?? []);
		for (const workflow of workflows) {
			const status = updated.has(workflow.id)
				? 'completed'
				: unchanged.has(workflow.id)
					? 'unchanged'
					: 'failed';
			if (status === 'failed') hadFailure = true;
			items.push({ id: workflow.id, resourceType: 'workflow', name: workflow.name, status });
		}
	};

	if (workflows.length > 0) {
		const target: ToggleWorkflowsMcpAccessTarget = { workflowIds: workflows.map((w) => w.id) };
		try {
			classifyWorkflows(await toggleWorkflowsMcpAccessApi(context, target, availableInMCP));
		} catch {
			hadFailure = true;
			for (const workflow of workflows) {
				items.push({
					id: workflow.id,
					resourceType: 'workflow',
					name: workflow.name,
					status: 'failed',
				});
			}
		}
	}

	return {
		status: hadFailure ? 'partial' : 'completed',
		items,
		mocked: false,
	};
}

// ── Mocks (Unarchive, Share) ──

/** Marks every affected item as completed without touching the server. */
export function mockCompletedResult(affected: BulkSelectableResource[]): BulkActionResult {
	return {
		status: 'completed',
		items: affected.map((item) => ({
			id: item.id,
			resourceType: item.resourceType,
			name: item.name,
			status: 'completed',
		})),
		mocked: true,
	};
}
