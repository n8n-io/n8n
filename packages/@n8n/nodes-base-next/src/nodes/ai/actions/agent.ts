import {
	provider,
	t,
	UserError,
	type ChatMessage,
	type ChatReply,
	type ChatRequest,
	type Tool,
	type ToolCall,
} from '@n8n/node-sdk';

import { ai } from '../ai.node';
import {
	assertFinished,
	isJsonSchema,
	parseReply,
	replyOutput,
	replyOutputOf,
	replySchema,
} from '../reply';

/** The tool result as the model reads it. A failed tool tells the model why. */
async function resultOf(call: ToolCall, tools: readonly Tool[]): Promise<ChatMessage> {
	const tool = tools.find(({ name }) => name === call.name);
	const content = await (async () => {
		if (!tool) return JSON.stringify({ error: `There is no tool named ${call.name}` });
		try {
			const result = await tool.call(call.args);
			return typeof result === 'string' ? result : JSON.stringify(result ?? null);
		} catch (error) {
			return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
		}
	})();
	return { role: 'tool', toolCallId: call.id, name: call.name, content };
}

interface Turn {
	readonly messages: readonly ChatMessage[];
	readonly reply: ChatReply;
}

export const runAgent = ai.action('agent', {
	action: 'Run an agent',
	summary: 'A chat model that calls tools until it can answer the prompt, with optional memory.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		model: provider.input('chatModel'),
		tools: t.arr(provider.input('tool')).optional(),
		memory: provider.input('memory').optional(),
		prompt: t.str().with({ minLength: 1 }),
		system: t.str().optional().hint('Instructions for the agent'),
		schema: replySchema,
		maxIterations: t.int().with({ minimum: 1, maximum: 50 }).default(10).hint('Most model calls'),
	},
	output: replyOutput,
	deriveOutput: ({ schema }) => replyOutputOf(schema),
	async run({ input }) {
		const { model, memory } = input;
		const tools = input.tools ?? [];
		const schema = isJsonSchema(input.schema) ? input.schema : undefined;
		const names = tools.map(({ name }) => name);
		const repeated = names.find((name, index) => names.indexOf(name) !== index);
		if (repeated)
			throw new UserError(`Two tools are named ${repeated}. Give each tool its own name.`);
		const history = memory ? await memory.load() : [];
		// The history goes between the instructions and the new prompt.
		const start: ChatMessage[] = [
			...(input.system ? [{ role: 'system', content: input.system } satisfies ChatMessage] : []),
			...history,
			{ role: 'user', content: input.prompt },
		];
		const request = (messages: readonly ChatMessage[]): ChatRequest => ({
			messages,
			...(tools.length
				? {
						tools: tools.map(({ name, description, input: args }) => ({
							name,
							description,
							input: args,
						})),
					}
				: {}),
			...(schema ? { output: schema } : {}),
		});
		// Each call sees the whole conversation, so the calls run one after the other.
		const step = async (messages: readonly ChatMessage[], left: number): Promise<Turn> => {
			const reply = await model.chat(request(messages));
			assertFinished(reply, model.model);
			if (reply.toolCalls.length === 0) return { messages, reply };
			if (left <= 1) {
				throw new UserError(
					`The agent made ${input.maxIterations} model calls and has no answer yet`,
				);
			}
			const results = await reply.toolCalls.reduce<Promise<ChatMessage[]>>(
				async (done, call) => [...(await done), await resultOf(call, tools)],
				Promise.resolve([]),
			);
			const asked: ChatMessage = {
				role: 'assistant',
				content: reply.text,
				toolCalls: reply.toolCalls,
			};
			return await step([...messages, asked, ...results], left - 1);
		};
		const { reply } = await step(start, input.maxIterations);
		if (memory) {
			await memory.save([
				{ role: 'user', content: input.prompt },
				{ role: 'assistant', content: reply.text },
			]);
		}
		return schema ? { text: reply.text, output: parseReply(reply, schema) } : { text: reply.text };
	},
});
