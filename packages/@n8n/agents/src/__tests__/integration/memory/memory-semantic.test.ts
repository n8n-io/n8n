import { expect, it, afterEach, describe as _describe } from 'vitest';

import { Agent, Memory } from '../../../index';
import { findLastTextContent, getModel, createSqliteMemory } from '../helpers';

// Only run when both API keys are present
const describe =
	process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY ? _describe : _describe.skip;

const cleanups: Array<() => void> = [];
afterEach(() => {
	cleanups.forEach((fn) => fn());
	cleanups.length = 0;
});

describe('semantic recall', () => {
	it('recalls relevant info beyond the lastMessages window', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const mem = new Memory()
			.storage(memory)
			.lastMessages(3)
			.semanticRecall({ topK: 3, embedder: 'openai/text-embedding-3-small' });

		const agent = new Agent('semantic-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise. Answer from your context.')
			.memory(mem);

		const threadId = `semantic-${Date.now()}`;
		const resourceId = 'test-user';
		const options = { persistence: { threadId, resourceId } };

		// Turn 1: unique fact that will be pushed out of the 3-message window
		await agent.generate(
			'The annual rainfall in Timbuktu is approximately 200mm. Just acknowledge.',
			options,
		);

		// Filler turns to push turn 1 out of the lastMessages window
		await agent.generate('What is 2 + 2?', options);
		await agent.generate('Tell me a one-word synonym for happy.', options);
		await agent.generate('What color is the sky?', options);

		// Ask about the fact from turn 1 — should be recalled via semantic search
		const result = await agent.generate('What is the annual rainfall in Timbuktu?', options);

		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('200');
	});

	it('works combined with freeform working memory', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const template = '# User Context\n- **Name**:\n- **Interest**:';

		const mem = new Memory()
			.storage(memory)
			.lastMessages(3)
			.freeform(template)
			.semanticRecall({ topK: 3, embedder: 'openai/text-embedding-3-small' });

		const agent = new Agent('combined-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem);

		const threadId = `combined-${Date.now()}`;
		const resourceId = `user-${Date.now()}`;
		const options = { persistence: { threadId, resourceId } };

		// Turn 1: name (working memory) + unique fact (semantic recall)
		await agent.generate(
			'My name is Frank. Also, the capital of Bhutan is Thimphu. Just acknowledge both.',
			options,
		);

		// Filler turns
		await agent.generate('What is 3 + 3?', options);
		await agent.generate('Name a primary color.', options);
		await agent.generate('What day comes after Monday?', options);

		// Ask about both — name from working memory, fact from semantic recall
		const result = await agent.generate(
			'What is my name, and what is the capital of Bhutan?',
			options,
		);

		const text = findLastTextContent(result.messages)?.toLowerCase() ?? '';
		expect(text).toContain('frank');
		expect(text).toContain('thimphu');
	});
});
