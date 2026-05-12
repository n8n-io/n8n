import { afterEach, describe as _describe, expect, it } from 'vitest';

import { Agent, createEmbeddingModel, Memory } from '../../../index';
import { createInMemoryAgentMemory, findLastTextContent, getModel } from '../helpers';

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

describe('episodic memory entries', () => {
	it('stores a durable entry and answers a later thread from injected memory', async () => {
		const { memory } = createInMemoryAgentMemory();
		const mem = new Memory()
			.storage(memory)
			.lastMessages(1)
			.episodicMemory({
				sync: true,
				topK: 3,
				embedder: createEmbeddingModel('openai/text-embedding-3-small', {
					apiKey: requireEnv(OPENAI_API_KEY_ENV),
				}),
				embeddingModel: 'openai/text-embedding-3-small',
				prompts: {
					extraction:
						'Extract source-backed episodic memory entries from the transcript. Return only JSON: {"entries":[{"content":"..."}]}. Include exact codenames.',
				},
			});

		const agent = new Agent('episodic-memory-test')
			.model({ id: getModel('anthropic'), apiKey: requireEnv(ANTHROPIC_API_KEY_ENV) })
			.instructions(
				[
					'You are testing episodic memory.',
					'Use the <memory> section when it contains enough relevant entries.',
					'Only call recall_memory when the injected memory is insufficient.',
					'If recall_memory returns entries, answer using those entries exactly.',
					'Be concise.',
				].join('\n'),
			)
			.memory(mem);
		agents.push(agent);

		const suffix = Date.now().toString(36);
		const codename = `Nova-${suffix}`;
		const agentId = 'agent-episodic-memory-test';
		const resourceId = `user-${suffix}`;
		const options = {
			persistence: {
				threadId: `thread-${suffix}`,
				agentId,
				resourceId,
			},
		};

		await agent.generate(
			`Remember this durable user entry for later: my cross-thread spike codename is ${codename}. Reply exactly: noted.`,
			options,
		);

		const storedFacts = await memory.searchEpisodicMemoryEntries(
			{ agentId, resourceId },
			'cross-thread spike codename',
			{ topK: 3 },
		);
		expect(storedFacts.map((entry) => entry.content).join('\n')).toContain(codename);

		const result = await agent.generate(
			'What cross-thread spike codename did I tell you? Use available memory.',
			options,
		);

		expect(findLastTextContent(result.messages)).toContain(codename);
	});
});
