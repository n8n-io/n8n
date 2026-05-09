import { afterEach, describe as _describe, expect, it } from 'vitest';

import { Agent, createEmbeddingModel, Memory } from '../../../index';
import {
	createInMemoryAgentMemory,
	findAllToolCalls,
	findLastTextContent,
	getModel,
} from '../helpers';

const ANTHROPIC_API_KEY_ENV = 'N8N_AI_ANTHROPIC_KEY';
const OPENAI_API_KEY_ENV = 'N8N_AI_OPENAI_API_KEY';

const describe =
	process.env[ANTHROPIC_API_KEY_ENV] && process.env[OPENAI_API_KEY_ENV]
		? _describe
		: _describe.skip;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required for this integration test`);
	return value;
}

const agents: Agent[] = [];
afterEach(async () => {
	await Promise.all(agents.map(async (agent) => await agent.close()));
	agents.length = 0;
});

describe('cross-thread facts', () => {
	it('stores a durable fact and recalls it with recall_memory', async () => {
		const { memory } = createInMemoryAgentMemory();
		const mem = new Memory()
			.storage(memory)
			.lastMessages(1)
			.crossThreadFacts({
				sync: true,
				topK: 3,
				embedder: createEmbeddingModel('openai/text-embedding-3-small', {
					apiKey: requireEnv(OPENAI_API_KEY_ENV),
				}),
				embeddingModel: 'openai/text-embedding-3-small',
				prompts: {
					extraction:
						'Extract durable user facts from the transcript. Return only JSON: {"facts":[{"content":"..."}]}. Include exact codenames.',
				},
			});

		const agent = new Agent('cross-thread-facts-test')
			.model({ id: getModel('anthropic'), apiKey: requireEnv(ANTHROPIC_API_KEY_ENV) })
			.instructions(
				[
					'You are testing cross-thread fact memory.',
					'When the user asks about information they previously shared, call recall_memory before answering.',
					'If recall_memory returns facts, answer using those facts exactly.',
					'Be concise.',
				].join('\n'),
			)
			.memory(mem);
		agents.push(agent);

		const suffix = Date.now().toString(36);
		const codename = `Nova-${suffix}`;
		const agentId = 'agent-cross-thread-facts-test';
		const resourceId = `user-${suffix}`;
		const options = {
			persistence: {
				threadId: `thread-${suffix}`,
				agentId,
				resourceId,
			},
		};

		await agent.generate(
			`Remember this durable user fact for later: my cross-thread spike codename is ${codename}. Reply exactly: noted.`,
			options,
		);

		const storedFacts = await memory.searchCrossThreadFacts(
			{ agentId, resourceId },
			'cross-thread spike codename',
			{ topK: 3 },
		);
		expect(storedFacts.map((fact) => fact.content).join('\n')).toContain(codename);

		const result = await agent.generate(
			'What cross-thread spike codename did I tell you? Use memory.',
			options,
		);

		const toolCalls = findAllToolCalls(result.messages);
		expect(toolCalls.some((call) => call.toolName === 'recall_memory')).toBe(true);
		expect(findLastTextContent(result.messages)).toContain(codename);
	});
});
