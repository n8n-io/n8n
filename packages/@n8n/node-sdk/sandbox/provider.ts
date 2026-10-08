// The generic JS guest of the provider interface: it runs a provider bundle and exports the
// capability that its `supply()` makes.
import type * as wit from 'n8n:node-contract/capabilities@2.13.0';
import { get as witLimits } from 'n8n:node-contract/limits@2.13.0';

import type { Binaries } from '../src/define';
import {
	providedKindOf,
	provider as sdkProvider,
	type ProviderCapabilities,
} from '../src/providers';
import {
	actionOf,
	chatRequestOf,
	describe,
	inputOf,
	jsonHttp,
	log,
	messageOf,
	recordOf,
	ResultError,
	runErrorOf,
	withCredential,
	witMessageOf,
	witReplyOf,
} from './guest';

/** A method of a capability: an error becomes the run error of the WIT `result`. */
async function result<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		throw new ResultError(runErrorOf(error));
	}
}

class ChatModel {
	constructor(private readonly supplied: ProviderCapabilities['chatModel']) {}

	model() {
		return this.supplied.model;
	}

	async chat(request: wit.ChatRequest) {
		return await result(async () => witReplyOf(await this.supplied.chat(chatRequestOf(request))));
	}
}

class Memory {
	constructor(private readonly supplied: ProviderCapabilities['memory']) {}

	async load() {
		return await result(async () => (await this.supplied.load()).map(witMessageOf));
	}

	async save(messages: wit.ChatMessage[]) {
		await result(async () => await this.supplied.save(messages.map(messageOf)));
	}
}

class Tool {
	constructor(private readonly supplied: ProviderCapabilities['tool']) {}

	name() {
		return this.supplied.name;
	}

	description() {
		return this.supplied.description;
	}

	input() {
		return JSON.stringify(this.supplied.input);
	}

	async call(args: string) {
		return await result(async () =>
			JSON.stringify((await this.supplied.call(recordOf(args))) ?? null),
		);
	}
}

class Embeddings {
	constructor(private readonly supplied: ProviderCapabilities['embeddings']) {}

	async embed(texts: string[]) {
		return await result(async () =>
			(await this.supplied.embed(texts)).map((vector) => Float64Array.from(vector)),
		);
	}
}

export const capabilities = { ChatModel, Memory, Tool, Embeddings };

const noBinary = () => {
	throw new Error('A provider has no binary data');
};

const http = jsonHttp('provider');

const binary: Binaries = { create: async () => noBinary() };

/** The capability of the manifest kind, as the WIT variant. */
function capabilityOf(id: string, value: unknown) {
	const kind = providedKindOf(actionOf().output.json);
	if (kind === 'chatModel' && sdkProvider.is(kind, value)) {
		return { tag: 'chat-model', val: new ChatModel(value) } as const;
	}
	if (kind === 'memory' && sdkProvider.is(kind, value)) {
		return { tag: 'memory', val: new Memory(value) } as const;
	}
	if (kind === 'tool' && sdkProvider.is(kind, value))
		return { tag: 'tool', val: new Tool(value) } as const;
	if (kind === 'embeddings' && sdkProvider.is(kind, value)) {
		return { tag: 'embeddings', val: new Embeddings(value) } as const;
	}
	throw new Error(`${id} supplies ${kind ?? 'nothing'}, and its run() gave something else`);
}

export const provider = {
	describe,
	async supply(input: string) {
		return await result(async () => {
			const action = actionOf();
			const context = { input: inputOf(input), http, log, limits: witLimits(), binary };
			const value: unknown = await action.run?.(
				withCredential({ ...context, item: Object.freeze({ json: {} }) }),
			);
			return capabilityOf(action.id, value);
		});
	},
};
