import { expect, it, afterEach } from 'vitest';

import { Agent, Memory } from '../../../index';
import { SqliteMemory } from '../../../storage/sqlite-memory';
import { describeIf, findLastTextContent, getModel, createSqliteMemory } from '../helpers';

const describe = describeIf('anthropic');

const cleanups: Array<() => void> = [];
afterEach(() => {
	cleanups.forEach((fn) => fn());
	cleanups.length = 0;
});

describe('freeform working memory', () => {
	const template = '# User Context\n- **Name**:\n- **City**:\n- **Pet**:';

	it('agent recalls info via working memory across turns', async () => {
		const memory = new Memory().storage('memory').lastMessages(10).freeform(template);

		const agent = new Agent('freeform-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `freeform-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		await agent.generate('My name is Alice and I live in Berlin.', options);
		const result = await agent.generate('What city do I live in?', options);

		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('berlin');
	});

	it('working memory tags are stripped from visible response', async () => {
		const memory = new Memory().storage('memory').lastMessages(10).freeform(template);

		const agent = new Agent('strip-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `strip-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		const result = await agent.generate('My name is Bob.', options);

		const allText = result.messages
			.flatMap((m) => ('content' in m ? m.content : []))
			.filter((c) => c.type === 'text')
			.map((c) => (c as { text: string }).text)
			.join(' ');
		expect(allText).not.toContain('<working_memory>');
		expect(allText).not.toContain('</working_memory>');
	});

	it('working memory persists across threads with same resourceId', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const mem = new Memory().storage(memory).lastMessages(10).freeform(template);
		const agent = new Agent('cross-thread-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem);

		const resourceId = `user-${Date.now()}`;

		await agent.generate('My name is Charlie and I have a dog named Rex.', {
			persistence: { threadId: `thread-1-${Date.now()}`, resourceId },
		});

		const result = await agent.generate("What's my dog's name?", {
			persistence: { threadId: `thread-2-${Date.now()}`, resourceId },
		});

		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('rex');
	});

	it('working memory survives SqliteMemory restart', async () => {
		const { memory, cleanup, url } = createSqliteMemory();
		cleanups.push(cleanup);

		const mem = new Memory().storage(memory).lastMessages(10).freeform(template);
		const agent1 = new Agent('restart-wm-1')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem);

		const resourceId = `user-${Date.now()}`;
		const threadId = `restart-wm-${Date.now()}`;

		await agent1.generate('My name is Diana.', { persistence: { threadId, resourceId } });

		const memory2 = new SqliteMemory({ url });
		const mem2 = new Memory().storage(memory2).lastMessages(10).freeform(template);
		const agent2 = new Agent('restart-wm-2')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem2);

		const result = await agent2.generate('What is my name?', {
			persistence: { threadId: `new-thread-${Date.now()}`, resourceId },
		});

		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('diana');
	});
});
