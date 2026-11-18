import { ExpandCompositeNodeRequestDto, type ExpandedCompositeNode } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError, UserError } from '@n8n/errors';
import type { IConnections } from 'n8n-workflow';
import { expandCompositeNode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

/**
 * Lets the user look inside a composite node. Only the backend can expand one,
 * because the node types in the editor carry no expand function.
 *
 * Mounted under `/workflows` so `@ProjectScope` resolves the workflow's project
 * from the `:workflowId` URL param.
 */
@RestController('/workflows')
export class CompositeNodesController {
	constructor(private readonly nodeTypes: NodeTypes) {}

	@Post('/:workflowId/composite-nodes/expand')
	@ProjectScope('workflow:read')
	async expand(
		_req: AuthenticatedRequest<{ workflowId: string }>,
		_res: unknown,
		@Body { node }: ExpandCompositeNodeRequestDto,
	): Promise<ExpandedCompositeNode> {
		let expanded;
		try {
			expanded = expandCompositeNode(node, this.nodeTypes);
		} catch (error) {
			if (error instanceof UserError) throw new BadRequestError(error.message);
			throw error;
		}
		if (!expanded) throw new BadRequestError(`Node "${node.name}" is not a composite node.`);

		return {
			nodes: expanded.nodes,
			connections: withoutEntryAnchor(expanded.connections, node.name),
		};
	}
}

/**
 * Drops the connection from the entry into input 0 of the exit. It exists only
 * for engine v2, and it would draw a line across the whole view.
 */
function withoutEntryAnchor(connections: IConnections, compositeName: string): IConnections {
	const copy = structuredClone(connections);
	for (const outputs of Object.values(copy)) {
		for (const slots of Object.values(outputs)) {
			for (const [index, slot] of slots.entries()) {
				slots[index] =
					slot?.filter(
						(connection) => !(connection.node === compositeName && connection.index === 0),
					) ?? null;
			}
		}
	}
	return copy;
}
