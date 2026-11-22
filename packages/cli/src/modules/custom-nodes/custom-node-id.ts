import { generateNanoId } from '@n8n/db';

/**
 * Makes the id of a custom node. The id is part of the node type name.
 * The node type lookup treats a name that ends with `Tool` as a tool variant of another node,
 * so the id must never end with `Tool`.
 */
export function generateCustomNodeId(generate: () => string = generateNanoId): string {
	let id = generate();
	while (id.endsWith('Tool')) id = generate();
	return id;
}
