import { expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks, describeIf } from './helpers';
import {
	Agent,
	filterLlmMessages,
	Tool,
	type CheckpointStore,
	type ContentToolCall,
	type GenerateResult,
	type SerializableAgentState,
	type StreamResult,
} from '../../index';
import { InMemoryMemory } from '../../runtime/memory/memory-store';

const eagerToolNames = ['workspace_read_file'];
const referenceNotes = Array.from(
	{ length: 60 },
	(_, i) =>
		`Reference ${i + 1}: The operations team stores business records by department, reporting period, account identifier, and record version. Preserve these fields when you work with records.`,
).join('\n');
const instructions = `Use tools for invoices and inventory. Never calculate an invoice or guess stock without a tool result. Complete only the requested action. Call approval tools to request approval. The runtime asks the user after the call. Do not ask for approval in a text reply. Reply with the result in one short sentence.\n\n${referenceNotes}`;

class JsonCheckpointStore implements CheckpointStore {
	private states = new Map<string, string>();
	async save(key: string, state: SerializableAgentState) {
		this.states.set(key, JSON.stringify(state));
	}
	async load(key: string) {
		const value = this.states.get(key);
		return value ? (JSON.parse(value) as SerializableAgentState) : undefined;
	}
	async delete(key: string) {
		this.states.delete(key);
	}
}

function toolCalls(state: SerializableAgentState): ContentToolCall[] {
	return filterLlmMessages(state.messageList.messages).flatMap((message) =>
		message.content.filter((part): part is ContentToolCall => part.type === 'tool-call'),
	);
}

function lastAssistantText(state: SerializableAgentState): string {
	const message = filterLlmMessages(state.messageList.messages)
		.filter((entry) => entry.role === 'assistant')
		.at(-1);
	return (
		message?.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join(' ') ?? ''
	);
}

async function stateOf(result: GenerateResult | StreamResult): Promise<SerializableAgentState> {
	if ('stream' in result) {
		const chunks = await collectStreamChunks(result.stream);
		expect(chunksOfType(chunks, 'error')).toHaveLength(0);
		return { ...result.getState(), usage: chunksOfType(chunks, 'finish').at(-1)?.usage };
	}
	expect(result.error).toBeUndefined();
	return { ...result.getState(), usage: result.usage };
}

function makeCatalog(onInvoice: () => void, onStock: () => void) {
	const readFile = new Tool('workspace_read_file')
		.description('Read a file from the workspace.')
		.input(z.object({ path: z.string() }))
		.handler(async () => ({ content: 'Workspace file.' }));
	const invoice = new Tool('issue_invoice')
		.description('Issue an invoice from a unit price and quantity. Requires user approval.')
		.input(z.object({ unitPrice: z.number(), quantity: z.number() }))
		.requireApproval()
		.handler(async ({ unitPrice, quantity }) => {
			onInvoice();
			return { total: unitPrice * quantity };
		});
	const stock = new Tool('lookup_warehouse_stock')
		.description('Read the available stock quantity for a product SKU in a warehouse.')
		.input(z.object({ sku: z.string(), warehouse: z.string() }))
		.handler(async () => {
			onStock();
			return { quantity: 13 };
		});
	return [readFile, invoice, stock];
}

type TestCase = {
	provider: 'openai' | 'anthropic';
	model: string;
	method: 'generate' | 'stream';
	store?: boolean;
};

async function runScenario(testCase: TestCase) {
	const { method, model, store } = testCase;
	let invoiceExecutions = 0;
	let stockExecutions = 0;
	const catalog = makeCatalog(
		() => invoiceExecutions++,
		() => stockExecutions++,
	);
	const memory = new InMemoryMemory();
	const checkpoints = new JsonCheckpointStore();
	const requests: Array<Record<string, unknown>> = [];
	const fetch: typeof globalThis.fetch = async (input, init) => {
		if (typeof init?.body === 'string')
			requests.push(JSON.parse(init.body) as Record<string, unknown>);
		return await globalThis.fetch(input, init);
	};
	const name = `${testCase.provider}-${method}-${store ?? 'default'}-native`;
	const persistence = { resourceId: 'native-deferral-user', threadId: `thread-${name}` };
	const providerOptions = testCase.provider === 'openai' ? { openai: { store } } : undefined;
	const createAgent = () =>
		new Agent(name)
			.model(model)
			.modelFetch(fetch)
			.instructions(instructions)
			.tool(catalog)
			.memory(memory)
			.checkpoint(checkpoints)
			.promptCaching()
			.nativeToolDeferral({ eagerToolNames });
	let agent = createAgent();
	const options = {
		persistence,
		providerOptions,
		maxIterations: 6,
	};
	const first = await stateOf(
		method === 'generate'
			? await agent.generate(
					'Issue an invoice for 7 items at a unit price of 6. Use the invoice tool.',
					options,
				)
			: await agent.stream(
					'Issue an invoice for 7 items at a unit price of 6. Use the invoice tool.',
					options,
				),
	);
	expect(first.status).toBe('suspended');
	expect(invoiceExecutions).toBe(0);
	const pending = Object.values(first.pendingToolCalls).find(
		(call) => call.toolName === 'issue_invoice',
	);
	expect(pending?.suspended).toBe(true);
	if (!pending?.suspended) throw new Error('Expected invoice approval.');

	const searches = toolCalls(first).filter((call) => call.providerExecuted);
	expect(searches.length).toBeGreaterThan(0);
	if (testCase.provider === 'openai') {
		for (const call of searches) {
			expect(call.resultProviderOptions?.openai?.itemId).toBeDefined();
			expect(call.resultProviderOptions?.openai?.itemId).not.toBe(
				call.providerOptions?.openai?.itemId,
			);
		}
	}

	await agent.close();
	agent = createAgent();
	const approved = await stateOf(
		method === 'generate'
			? await agent.approve('generate', {
					...options,
					runId: pending.runId,
					toolCallId: pending.toolCallId,
				})
			: await agent.approve('stream', {
					...options,
					runId: pending.runId,
					toolCallId: pending.toolCallId,
				}),
	);
	expect(approved.status).toBe('success');
	expect(lastAssistantText(approved)).toContain('42');
	expect(invoiceExecutions).toBe(1);
	expect(toolCalls(approved)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				toolName: 'issue_invoice',
				state: 'resolved',
				output: { total: 42 },
			}),
		]),
	);

	const later = await stateOf(
		method === 'generate'
			? await agent.generate(
					'Now look up stock for SKU A-17 in warehouse west. Use the inventory tool.',
					options,
				)
			: await agent.stream(
					'Now look up stock for SKU A-17 in warehouse west. Use the inventory tool.',
					options,
				),
	);
	expect(later.status).toBe('success');
	expect(lastAssistantText(later)).toContain('13');
	expect(stockExecutions).toBe(1);
	expect(toolCalls(later)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				toolName: 'lookup_warehouse_stock',
				state: 'resolved',
				output: { quantity: 13 },
			}),
		]),
	);
	expect(later.usage?.inputTokenDetails?.cacheRead).toBeGreaterThan(0);
	for (const request of requests) expect(request.tools).toEqual(requests[0].tools);
	await agent.close();
}

for (const provider of ['openai', 'anthropic'] as const) {
	const cases: TestCase[] = [];
	for (const method of ['generate', 'stream'] as const) {
		if (provider === 'openai') {
			for (const store of [true, false])
				cases.push({ provider, method, store, model: 'openai/gpt-5.4' });
		} else {
			cases.push({ provider, method, model: 'anthropic/claude-sonnet-4-6' });
		}
	}
	describeIf(provider)(`native tool deferral ${provider}`, () => {
		it.each(cases)(
			'$method preserves discovery, approval, history and cache (store=$store)',
			async (testCase) => {
				await runScenario(testCase);
			},
		);
	});
}
