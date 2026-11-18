import type { ExpandedCompositeNode } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';
import type { INode } from 'n8n-workflow';

export async function expandCompositeNode(
	context: IRestApiContext,
	workflowId: string,
	node: INode,
): Promise<ExpandedCompositeNode> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/workflows/${encodeURIComponent(workflowId)}/composite-nodes/expand`,
		{ node },
	);
}
