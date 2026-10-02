import {
	arr,
	declared,
	defineNode,
	generateNodeModule,
	generatedTriggersOf,
	json,
	obj,
	oneOf,
	parse,
	replyContractOf,
	str,
	int,
	passedItem,
	toContract,
	toNodeType,
	toTriggerNodeType,
	variant,
	type NativeTrigger,
	type Trigger,
} from '../index';

const hooks = defineNode({ id: 'hooks', displayName: 'Hooks' });

const call = hooks.trigger('trigger', {
	trigger: 'On call',
	summary: 'Starts on a call.',
	input: {
		path: str(),
		responseMode: oneOf('onReceived', 'responseNode').default('onReceived'),
		fields: arr(variant('kind', { text: { label: str() }, ['number']: { label: str() } })),
	},
	output: obj({ query: json(), body: declared().hint('Its JSON Schema types it') }).with({
		'x-n8n-entry-fields': {
			list: ['fields'],
			key: ['label'],
			type: 'kind',
			types: { ['number']: { type: 'number' } },
			fallback: { type: 'string' },
		},
	}),
	native: { type: 'n8n-nodes-base.hook', version: 2.1, on: 'webhook' },
	reply: {
		operation: 'respond',
		action: 'Respond',
		summary: 'Sends the reply.',
		input: { text: str() },
		native: { type: 'n8n-nodes-base.reply', version: 1.5 },
		awaits: { field: 'responseMode', value: 'responseNode' },
	},
});

const native = (trigger: Trigger): NativeTrigger => {
	if (trigger.kind !== 'native') throw new Error(`${trigger.id} is not native`);
	return trigger;
};

describe('native triggers', () => {
	it('name their event in the contract, and have no SDK runtime', () => {
		expect(call.kind).toBe('native');
		expect(toContract(call)).toMatchObject({
			id: 'hooks.trigger',
			trigger: 'webhook',
			credentials: [],
		});
		expect(() => toTriggerNodeType(call)).toThrow(
			'hooks.trigger runs as the built-in node n8n-nodes-base.hook',
		);
	});

	it('let an action run as a built-in node, as a native trigger does', () => {
		const batches = hooks.action('batches', {
			action: 'Loop in batches',
			summary: 'Emits batches.',
			flow: { effect: 'transform', cardinality: 'batch' },
			outputs: ['done', 'loop'],
			input: { batchSize: int() },
			output: passedItem(),
			native: { type: 'n8n-nodes-base.splitInBatches', version: 3 },
		});
		expect(toContract(batches)).toMatchObject({
			id: 'hooks.batches',
			outputs: ['done', 'loop'],
			output: passedItem().json,
		});
		expect(() => toNodeType(batches)).toThrow(
			'hooks.batches runs as the built-in node n8n-nodes-base.splitInBatches',
		);
	});

	it('describe the reply step as an action that passes its items on', () => {
		expect(replyContractOf(native(call))).toEqual({
			id: 'hooks.respond',
			version: 1,
			node: 'hooks',
			action: 'Respond',
			summary: 'Sends the reply.',
			flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace' },
			credentials: [],
			input: obj({ text: str() }).json,
			output: { type: 'object', additionalProperties: true, 'x-n8n-passed': true },
		});
	});

	it('take a variant as the reply input, flat as the reply node keeps it', () => {
		const respondWith = variant('respondWith', { text: { body: str() }, noData: {} });
		const replied = hooks.trigger('replied', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: { responseMode: str() },
			output: obj({}),
			native: { type: 'n8n-nodes-base.hook', version: 1, on: 'webhook' },
			reply: {
				operation: 'answer',
				action: 'Answer',
				summary: 'Sends the reply.',
				input: respondWith,
				native: { type: 'n8n-nodes-base.reply', version: 1 },
				awaits: { field: 'responseMode', value: 'wait' },
			},
		});
		expect(replyContractOf(native(replied))?.input).toEqual(respondWith.json);
		expect(generateNodeModule('hooks', generatedTriggersOf(replied, ''))).toContain(
			'export type HooksAnswerInput<I, C> = { respondWith: "text"; body: Value<I, C, string> } | { respondWith: "noData" };',
		);
	});

	it('generate the built-in nodes with their pairing', () => {
		const pairing = {
			trigger: 'n8n-nodes-base.hook',
			reply: 'n8n-nodes-base.reply',
			field: 'responseMode',
			value: 'responseNode',
		};
		const generated = generatedTriggersOf(call, '@n8n/nodes-base-next.hooksTrigger');
		expect(
			generated.map(({ nodeType, typeVersion, operation }) => [nodeType, typeVersion, operation]),
		).toEqual([
			['n8n-nodes-base.hook', 2.1, 'trigger'],
			['n8n-nodes-base.reply', 1.5, 'respond'],
		]);
		expect(generated.map((entry) => entry.pairing)).toEqual([pairing, pairing]);
		const text = generateNodeModule('hooks', generated);
		expect(text).toContain(
			`contractStep("n8n-nodes-base.reply", config, 1.5, undefined, undefined, ${JSON.stringify(pairing)})`,
		);
		expect(text).toContain(
			`contractTrigger("n8n-nodes-base.hook", config, 2.1, undefined, ${JSON.stringify({ pairing, example: { query: {}, body: {} }, takesSchema: true })})`,
		);
		expect(text).toContain(
			'trigger: <const N extends string, const S extends { body?: ValueSchema } = {}, const C extends HooksTriggerInput>(',
		);
		expect(text).toContain(
			' config: { name: N; schema?: S; sample?: Array<DeepPartial<Declared<HooksTriggerOutput & HooksTriggerFields<C>, S>>>; settings?: NodeSettings } & C & Exact<C, HooksTriggerInput & { name: string; schema?: unknown; sample?: unknown; settings?: NodeSettings }>,',
		);
		expect(text).toMatch(
			/export type HooksTriggerOutput = \{[^]*body: \{ \[key: string\]: any \};/,
		);
		expect(text).toContain(
			'export type HooksTriggerFields<C> = EntryFields<C, ["fields"], ["label"], "kind", { number: number }, string>;',
		);
		expect(text).toContain(
			'(trigger, webhook; schema types body; reply when responseMode is responseNode)',
		);
		expect(text).toContain(
			"import { contractStep, contractTrigger, type Declared, type DeepPartial, type EntryFields, type Exact, type Flow, type NodeSettings, type OutputOf, type Step, type Value, type ValueSchema } from '@n8n/workflow-sdk/next';",
		);
	});

	it('keep the node type of a trigger that the SDK runs', () => {
		const polled = hooks.trigger('polled', {
			trigger: 'On item',
			summary: 'Starts on a new item.',
			input: {},
			output: obj({ id: str() }),
			poll: {
				request: () => ({ path: '/items' }),
				response: arr(obj({ id: int() })),
				items: (page) => page,
				cursor: { id: () => 1 },
			},
		});
		expect(generatedTriggersOf(polled, '@n8n/nodes-base-next.hooksPolled')).toEqual([
			{
				contract: toContract(polled),
				nodeType: '@n8n/nodes-base-next.hooksPolled',
				resource: undefined,
				operation: 'polled',
			},
		]);
	});

	it('require emit for a webhook whose output is not the request', () => {
		const request = obj({ body: json(), headers: json(), query: json() });
		hooks.trigger('raw', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: {},
			output: request,
			webhook: {},
		});
		hooks.trigger('mapped', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: {},
			output: obj({ id: str() }),
			webhook: { emit: ({ body }) => [parse(obj({ id: str() }), body, 'body')] },
		});
		hooks.trigger('unmapped', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: {},
			output: obj({ id: str() }),
			// @ts-expect-error without emit the item is the request, which has no id
			webhook: {},
		});
	});

	it('check that the reply waits on a trigger field', () => {
		hooks.trigger('typo', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: { responseMode: str() },
			output: obj({}),
			native: { type: 'n8n-nodes-base.hook', version: 1, on: 'webhook' },
			reply: {
				operation: 'respond',
				action: 'Respond',
				summary: 'Sends the reply.',
				input: {},
				native: { type: 'n8n-nodes-base.reply', version: 1 },
				// @ts-expect-error the trigger has no such input field
				awaits: { field: 'responseModus', value: 'responseNode' },
			},
		});
	});
});
