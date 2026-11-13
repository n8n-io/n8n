import { UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import type {
	DeclarativePollingCursor,
	IDataObject,
	IDeclarativePollingTrigger,
	INode,
	INodeExecutionData,
	INodeType,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { PollContext } from './node-execution-context';
import { runStandaloneRouting } from './standalone-routing';

/** The node static-data key that holds the cursor of a declarative polling trigger. */
export const DECLARATIVE_CURSOR_KEY = 'cursor';

const isCursor = (value: unknown): value is IDataObject => isRecord(value);

// A value that is not text means the wrong field or cursor type, so the poll fails.
const toTime = (node: INode, value: unknown, field: string) => {
	if (typeof value !== 'string') {
		throw new NodeOperationError(
			node,
			`The 'timestamp' cursor needs a text date in "${field}", but it got a ${typeof value} value`,
			{ description: "Use the 'id' cursor for numeric timestamps." },
		);
	}
	return new Date(value).getTime();
};

const DIGITS = /^\d+$/;

const isAfter = (node: INode, a: unknown, b: unknown, type: 'timestamp' | 'id', field: string) => {
	if (type === 'timestamp') return toTime(node, a, field) > toTime(node, b, field);
	if (typeof a === 'number' && typeof b === 'number') return a > b;
	const [x, y] = [String(a), String(b)];
	// Compare integer strings by length first, so "10" is after "9" and large IDs keep precision.
	if (DIGITS.test(x) && DIGITS.test(y) && x.length !== y.length) return x.length > y.length;
	return x > y;
};

async function applyCursor(
	this: IPollFunctions,
	strategy: DeclarativePollingCursor,
	items: INodeExecutionData[],
	cursor: IDataObject | undefined,
): Promise<{ items: INodeExecutionData[]; cursor: IDataObject | undefined }> {
	if (typeof strategy === 'function') return await strategy.call(this, items, cursor);

	const node = this.getNode();
	const { type, field } = strategy;
	const since = cursor?.value;
	let highest = since;
	let unreadable = 0;
	const newItems: INodeExecutionData[] = [];
	for (const item of items) {
		const value = item.json[field];
		if (value === undefined || value === null || value === '') continue;
		// A text date that does not parse is a bad record. Skip it, so it does not stop the other items.
		if (type === 'timestamp' && Number.isNaN(toTime(node, value, field))) {
			unreadable++;
			continue;
		}
		if (since === undefined || isAfter(node, value, since, type, field)) newItems.push(item);
		if (highest === undefined || isAfter(node, value, highest, type, field)) highest = value;
	}
	if (unreadable > 0) {
		// No values in the log: they come from the API.
		this.logger.warn(
			`Polling trigger "${node.name}" skipped ${unreadable} item(s) with a date in "${field}" that cannot be read`,
			{ workflowId: this.getWorkflow().id },
		);
	}
	return { items: newItems, cursor: highest === undefined ? cursor : { value: highest } };
}

const lastItems = (items: INodeExecutionData[], maxResults = 1) => {
	const count = Math.trunc(maxResults);
	// `slice(-0)` returns all items, so zero and below need their own case.
	return count > 0 ? items.slice(-count) : [];
};

/** Builds `poll()` for a node with `trigger: { type: 'polling' }` in its description. */
export function createDeclarativePoll(
	nodeType: INodeType,
	trigger: IDeclarativePollingTrigger,
): NonNullable<INodeType['poll']> {
	return async function (this: IPollFunctions) {
		if (!(this instanceof PollContext)) {
			throw new UnexpectedError('Declarative polling trigger needs a PollContext');
		}
		const isManual = this.mode === 'manual';
		const staticData = this.getWorkflowStaticData('node');
		const stored = staticData[DECLARATIVE_CURSOR_KEY];
		const cursor = !isManual && isCursor(stored) ? stored : undefined;
		// Durable cursors drop an empty activation poll, so the first scheduled poll seeds again.
		const isFirstRun = !isManual && cursor === undefined;

		// There is nothing to fetch before "now", so store it and wait for the next poll.
		if (isFirstRun && typeof trigger.cursor !== 'function' && trigger.cursor.type === 'timestamp') {
			staticData[DECLARATIVE_CURSOR_KEY] = { value: new Date().toISOString() };
			return null;
		}

		// Load credentials as a trigger, like PollContext. A manual run then gets an actionable error for an end-user credential.
		const fetched = await runStandaloneRouting(
			this,
			nodeType,
			trigger.routing,
			{ $cursor: cursor ?? {} },
			{ credentialUsage: 'trigger' },
		);

		if (isManual) {
			// Built-in cursors only filter, so a manual run skips them. A function cursor can shape items.
			const shaped =
				typeof trigger.cursor === 'function'
					? (await trigger.cursor.call(this, fetched, undefined)).items
					: fetched;
			const items = lastItems(shaped, trigger.manual?.maxResults);
			return items.length ? [items] : null;
		}

		const result = await applyCursor.call(this, trigger.cursor, fetched, cursor);
		// Store `{}` after an empty first run, so the next poll emits its items.
		if (result.cursor !== undefined || isFirstRun) {
			staticData[DECLARATIVE_CURSOR_KEY] = result.cursor ?? {};
		}

		if (isFirstRun || result.items.length === 0) return null;
		return [result.items];
	};
}
