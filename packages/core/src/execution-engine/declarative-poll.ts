import type {
	IDataObject,
	IDeclarativePollingTrigger,
	INodeExecutionData,
	INodeType,
	IPollFunctions,
} from 'n8n-workflow';
import { createRunExecutionData, UnexpectedError } from 'n8n-workflow';

import { ExecuteContext, PollContext } from './node-execution-context';
import { RoutingNode } from './routing-node';

/** Static-data key the engine keeps a declarative trigger's cursor under. */
export const DECLARATIVE_CURSOR_KEY = 'cursor';

const isAfter = (a: unknown, b: unknown, type: 'timestamp' | 'id') => {
	if (type === 'timestamp') return new Date(String(a)).getTime() > new Date(String(b)).getTime();
	if (typeof a === 'number' && typeof b === 'number') return a > b;
	return String(a) > String(b);
};

async function applyCursor(
	this: IPollFunctions,
	strategy: IDeclarativePollingTrigger['cursor'],
	items: INodeExecutionData[],
	cursor: IDataObject | undefined,
): Promise<{ items: INodeExecutionData[]; cursor: IDataObject | undefined }> {
	if (typeof strategy === 'function') return await strategy.call(this, items, cursor);

	const { type, field } = strategy;
	const since = cursor?.value;
	let highest = since;
	const newItems: INodeExecutionData[] = [];
	for (const item of items) {
		const value = item.json[field];
		if (value === undefined || value === null) continue;
		if (since === undefined || isAfter(value, since, type)) newItems.push(item);
		if (highest === undefined || isAfter(value, highest, type)) highest = value;
	}
	return { items: newItems, cursor: highest === undefined ? cursor : { value: highest } };
}

/**
 * Builds a `poll()` for a node whose description carries `trigger: { type: 'polling' }`.
 *
 * Contract (matches the shipped programmatic pollers): read cursor → request via
 * `RoutingNode` with `$cursor` exposed → derive new items + next cursor → store
 * the cursor even when nothing is emitted → return items or `null`. The first
 * production poll only seeds the cursor. Manual runs never touch the cursor and
 * return the last `manual.maxResults` items.
 */
export function createDeclarativePoll(
	nodeType: INodeType,
	trigger: IDeclarativePollingTrigger,
): NonNullable<INodeType['poll']> {
	return async function (this: IPollFunctions) {
		if (!(this instanceof PollContext)) {
			throw new UnexpectedError('Declarative poll needs a PollContext');
		}
		const { workflow, node, additionalData, mode } = this;
		const isManual = mode === 'manual';
		const staticData = this.getWorkflowStaticData('node');
		const stored = staticData[DECLARATIVE_CURSOR_KEY];
		const cursor =
			!isManual && typeof stored === 'object' && stored !== null
				? (stored as IDataObject)
				: undefined;
		const isFirstRun = !isManual && cursor === undefined;

		// A timestamp window has nothing to fetch before "now": seed and wait for the next tick.
		if (isFirstRun && typeof trigger.cursor !== 'function' && trigger.cursor.type === 'timestamp') {
			staticData[DECLARATIVE_CURSOR_KEY] = { value: new Date().toISOString() };
			return null;
		}

		const executeData = { node, data: {}, source: null };
		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			mode,
			createRunExecutionData(),
			0,
			[],
			{ main: [[{ json: {} }]] },
			executeData,
			[],
		);
		// A nameless property carries the routing: `RoutingNode` reads routing off
		// properties, and skips the parameter lookup when the name is empty.
		const pollNodeType: INodeType = {
			...nodeType,
			description: {
				...nodeType.description,
				properties: [
					...nodeType.description.properties,
					{ displayName: '', name: '', type: 'hidden', default: '', routing: trigger.routing },
				],
			},
		};
		const routingNode = new RoutingNode(context, pollNodeType, undefined, { $cursor: cursor ?? {} });
		const fetched = (await routingNode.runNode())?.[0] ?? [];

		if (isManual) {
			const items = fetched.slice(-(trigger.manual?.maxResults ?? 1));
			return items.length ? [items] : null;
		}

		const result = await applyCursor.call(this, trigger.cursor, fetched, cursor);
		// Store even when nothing is emitted, so the advance persists.
		if (result.cursor !== undefined) staticData[DECLARATIVE_CURSOR_KEY] = result.cursor;

		if (isFirstRun || result.items.length === 0) return null;
		return [result.items];
	};
}
