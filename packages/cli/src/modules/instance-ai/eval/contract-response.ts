import { actionOfNode, type WorkflowNodeRef } from '@n8n/nodes-integrations';

import { truncateForLlm } from './request-sanitizer';

/**
 * What the node contract tells the mock about the response body. A `request` action emits the
 * body as its item and a `list` action checks each page against `list.response`, so both give
 * the raw body schema. A `run()` action reshapes the body in code: only the output it builds is
 * known, so the mock gets the fields that output requires and must find their raw source.
 */
export function contractResponseNotes(node: WorkflowNodeRef): string | undefined {
	const action = actionOfNode(node);
	if (!action) return undefined;
	const raw = action.request ? action.output.json : action.list?.response.json;
	if (raw) {
		return [
			`Node contract "${action.id}". The raw response body of its data request MUST match this JSON Schema:`,
			truncateForLlm(JSON.stringify(raw)),
		].join('\n');
	}
	return [
		`Node contract "${action.id}". The node reshapes the raw body in its own code and emits items of the JSON Schema below.`,
		'Return the RAW body that the service sends, as the API documentation shows it. Never return items of this schema.',
		'Every field that this schema requires must have its raw source in your body: a required field with the same name in the raw API keeps that name, and a renamed or flattened key comes from the raw field that the API documentation names.',
		'The node can send other requests first (a lookup, a label list): use this only for the requests that give the records.',
		truncateForLlm(JSON.stringify(action.output.json)),
	].join('\n');
}
