// The generic JS guest of the trigger interface: it runs a trigger bundle with the trigger run of
// the host process (`runTriggerCall`), over the imports of the trigger world.
import type { IDataObject } from 'n8n-workflow';

import { runTriggerCall, type TriggerCall } from '../src/triggers';
import {
	describe,
	inputOf,
	isRecord,
	jsonHttp,
	log,
	parsed,
	ResultError,
	runErrorOf,
	triggerOf,
} from './guest';

const http = jsonHttp('trigger');

/** A call of the trigger interface: an error becomes the run error of the WIT `result`. */
async function result<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		throw new ResultError(runErrorOf(error));
	}
}

async function run(input: string, call: TriggerCall) {
	return await runTriggerCall(triggerOf(), call, { input: inputOf(input), http, log });
}

const isDataObject = (value: unknown): value is IDataObject => isRecord(value);

/** The remote webhook ID that `activate` gave, as the host sends it back. */
function idOf(state: string): string {
	const id = parsed(state);
	if (typeof id !== 'string') throw new Error('The host gave a state that is not a webhook ID');
	return id;
}

/** A repeated name gives a list of its values. */
const recordOfPairs = (pairs: Array<[string, string]>): IDataObject =>
	Object.fromEntries(
		[...new Set(pairs.map(([name]) => name))].map((name) => {
			const values = pairs.filter(([key]) => key === name).map(([, value]) => value);
			return [name, values.length === 1 ? values[0] : values];
		}),
	);

const itemsOf = (value: unknown) => {
	if (!Array.isArray(value)) throw new Error('The trigger run gave no list of items');
	return value.map((item) => JSON.stringify(item));
};

interface WebhookRequest {
	headers: Array<[string, string]>;
	query: Array<[string, string]>;
	body: string;
}

export const trigger = {
	describe,
	async poll(input: string, state: string | undefined, limit: number | undefined, at: bigint) {
		return await result(async () => {
			const known = state === undefined ? undefined : parsed(state);
			const value = await run(input, {
				call: 'poll',
				at: Number(at),
				...(isDataObject(known) ? { state: known } : {}),
				...(limit === undefined ? {} : { limit }),
			});
			return { items: itemsOf(value.items), state: JSON.stringify(value.state ?? null) };
		});
	},
	async webhook(input: string, state: string | undefined, request: WebhookRequest) {
		return await result(async () => {
			const body = parsed(request.body);
			const value = await run(input, {
				call: 'webhook',
				...(state === undefined ? {} : { state: idOf(state) }),
				request: {
					body: isDataObject(body) ? body : {},
					headers: recordOfPairs(request.headers),
					query: recordOfPairs(request.query),
				},
			});
			return itemsOf(value.items);
		});
	},
	async activate(input: string, url: string, secret: string | undefined) {
		return await result(async () => {
			const value = await run(input, {
				call: 'activate',
				url,
				...(secret === undefined ? {} : { secret }),
			});
			return JSON.stringify(value.state ?? null);
		});
	},
	async check(input: string, state: string) {
		return await result(async () => {
			const value = await run(input, { call: 'check', state: idOf(state) });
			return value.exists === true;
		});
	},
	async deactivate(input: string, state: string) {
		await result(async () => await run(input, { call: 'deactivate', state: idOf(state) }));
	},
};
