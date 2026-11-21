import { resolveNodeAnnotations, type INode, type INodeTypes } from 'n8n-workflow';

/**
 * Returns the function that tells if a second run of a node has the same
 * effect as one run. The engine runs a step of such a node again after the
 * worker of the step stopped.
 *
 * The function reads the annotations that the node type declares for the
 * operation that the parameters of the node select. A node is not idempotent
 * when its node type declares nothing, or when an expression selects the
 * operation.
 */
export function createIdempotencyResolver(nodeTypes: INodeTypes): (node: INode) => boolean {
	return (node) => {
		try {
			const { description } = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			return resolveNodeAnnotations(description, node).idempotent;
		} catch {
			// An unknown node type must not stop the start of an execution. The safe
			// answer is that the engine does not run the node a second time.
			return false;
		}
	};
}
