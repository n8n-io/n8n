/**
 * The `deduplication` service of `ctx.service` (spec 9.9) over an
 * `IDataDeduplicator` of n8n-workflow: n8n's `DeduplicationHelper` on the
 * `processed_data` table, or the fallback host's file store in the test bed.
 * The caller hashes nothing: the items arrive as the v1 node gives them to
 * n8n-core's `DataDeduplicationService`.
 *
 * The workflow of a call is the workflow of the execution, never one that
 * the args name: a call cannot read or change another workflow's items.
 */
import type { ServiceAnswer, ServiceCallEvent } from './data-table.ts';

/** The four calls of n8n-workflow's `IDataDeduplicator`. */
export interface DeduplicationBackend {
	checkProcessedAndRecord(
		items: unknown[],
		scope: string,
		contextData: unknown,
		options: unknown,
	): Promise<unknown>;
	removeProcessed(
		items: unknown[],
		scope: string,
		contextData: unknown,
		options: unknown,
	): Promise<unknown>;
	clearAllProcessedItems(scope: string, contextData: unknown, options: unknown): Promise<unknown>;
	getProcessedDataCount(scope: string, contextData: unknown, options: unknown): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** JSON as the wire carries it. */
function json(value: unknown): unknown {
	const text = JSON.stringify(value);
	return text === undefined ? null : (JSON.parse(text) as unknown);
}

/**
 * Runs one `deduplication` call for the workflow `workflowId`. `args` has
 * `items` (for the first two calls), `scope` (`node` or `workflow`), `node`
 * (`{ id }`, for the scope `node`) and `options` (`{ mode, maxEntries? }`).
 */
export async function runDeduplicationCall(
	backend: DeduplicationBackend,
	call: ServiceCallEvent,
	workflowId: string,
): Promise<ServiceAnswer> {
	try {
		const args = call.args ?? {};
		const scope = args.scope === 'node' ? 'node' : 'workflow';
		const node = isRecord(args.node) && typeof args.node.id === 'string' ? args.node : undefined;
		if (scope === 'node' && !node) throw new Error('The scope "node" needs the node id');
		if (!workflowId) throw new Error('The call has no workflow');
		const context = { workflow: { id: workflowId }, ...(node ? { node: { id: node.id } } : {}) };
		const options = isRecord(args.options) ? args.options : {};
		const items = Array.isArray(args.items) ? args.items : [];
		let result: unknown;
		switch (call.op) {
			case 'checkProcessedAndRecord':
				result = await backend.checkProcessedAndRecord(items, scope, context, options);
				break;
			case 'removeProcessed':
				result = await backend.removeProcessed(items, scope, context, options);
				break;
			case 'clearAllProcessedItems':
				result = await backend.clearAllProcessedItems(scope, context, options);
				break;
			case 'getProcessedDataCount':
				result = await backend.getProcessedDataCount(scope, context, options);
				break;
			default:
				throw new Error(`Unknown deduplication operation "${call.op}"`);
		}
		return { ok: true, result: json(result ?? null) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: { message } };
	}
}
