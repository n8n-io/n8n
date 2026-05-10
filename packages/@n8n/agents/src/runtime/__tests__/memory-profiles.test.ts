import type { EmbeddingModel } from 'ai';

import type { AgentDbMessage } from '../../types/sdk/message';
import { extractAndStoreEpisodicMemory } from '../episodic-memory';
import { AgentEventBus } from '../event-bus';
import {
	DEFAULT_MEMORY_PROFILE_UPDATE_PROMPT,
	loadMemoryProfileContext,
	updateMemoryProfilesFromTurn,
} from '../memory-profiles';
import { InMemoryMemory } from '../memory-store';

jest.mock('ai', () => ({
	generateObject: jest.fn(),
	generateText: jest.fn(),
	embedMany: jest.fn(),
}));

const { generateObject, generateText, embedMany } = jest.requireMock<{
	generateObject: jest.Mock;
	generateText: jest.Mock<Promise<{ text: string }>, [{ prompt?: string; system?: string }]>;
	embedMany: jest.Mock;
}>('ai');

const fakeEmbedder = {} as EmbeddingModel;
const fakeModel = { doGenerate: jest.fn() } as unknown as Parameters<
	typeof updateMemoryProfilesFromTurn
>[0]['model'];

function extractedEntry(
	content: string,
	evidence: string,
	source: 'user_assertion' | 'user_accepted_assistant_proposal' = 'user_assertion',
) {
	return { content, source, evidence };
}

function makeUserMessage(text: string, id = 'user-1'): AgentDbMessage {
	return {
		id,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		role: 'user',
		content: [{ type: 'text', text }],
	};
}

function makeAssistantMessage(text: string, id = 'assistant-1'): AgentDbMessage {
	return {
		id,
		createdAt: new Date('2026-01-01T00:00:01.000Z'),
		role: 'assistant',
		content: [{ type: 'text', text }],
	};
}

describe('memory profiles', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('defines the default user-profile update contract', () => {
		const prompt = DEFAULT_MEMORY_PROFILE_UPDATE_PROMPT;

		for (const phrase of [
			'You maintain one concise mutable user profile document',
			'User-profile captures stable cross-session information',
			'<user-profile> is not task memory',
			'must never be connected to the current objective of an agent',
			'stable preferences about communication style, workflow, tools, environment, ownership, or domain context',
			'User-profile may include durable user preferences',
			'If the information would stop being useful after the current task ends',
			'describes the agent',
			'belongs in source-backed case entries',
			'Existing profile content is not authoritative',
			'Do not summarize, rewrite, or copy the agent',
			'plain markdown bullet list',
			'one bullet starting with "- "',
			'Do not use sections, headings, tables, or long paragraphs',
			'{"userProfile":"..."}',
		]) {
			expect(prompt).toContain(phrase);
		}

		for (const excludedContext of [
			'active project state',
			'debugging steps',
			'implementation order',
			'branch stack',
			'test flow',
			'next actions',
			'temporary constraints',
			'session objectives',
			'facts about this agent',
		]) {
			expect(prompt).toContain(excludedContext);
		}

		expect(prompt).not.toContain('agentProfile');
		expect(prompt).not.toContain('<agent-profile>');
	});

	it('updates the agent-scoped user profile from the latest turn pair', async () => {
		generateText.mockResolvedValueOnce({
			text: JSON.stringify({
				userProfile: 'The user prefers concise updates.',
			}),
		});

		const memory = new InMemoryMemory();
		await updateMemoryProfilesFromTurn({
			memory,
			config: {},
			model: fakeModel,
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			currentProfile: undefined,
			messages: [
				makeUserMessage('Remember that I prefer concise updates.'),
				makeAssistantMessage('Understood.'),
			],
			eventBus: new AgentEventBus(),
		});

		expect(embedMany).not.toHaveBeenCalled();
		await expect(
			memory.getMemoryProfile({
				scopeKind: 'user-profile',
				agentId: 'agent-1',
				resourceId: 'user-1',
			}),
		).resolves.toMatchObject({ content: 'The user prefers concise updates.' });
		expect(generateText).toHaveBeenCalledTimes(1);
		expect(generateText.mock.calls[0][0].system).toContain(
			'User-profile captures stable cross-session information',
		);
		expect(generateText.mock.calls[0][0].prompt).toContain('<user-profile>');
		expect(generateText.mock.calls[0][0].prompt).toContain('<user-message>');
		expect(generateText.mock.calls[0][0].prompt).toContain(
			'Remember that I prefer concise updates.',
		);
		expect(generateText.mock.calls[0][0].prompt).toContain('<assistant-message>');
		expect(generateText.mock.calls[0][0].prompt).not.toContain('<agent-description>');
		expect(generateText.mock.calls[0][0].prompt).not.toContain('<agent-profile>');
		expect(generateText.mock.calls[0][0].prompt).not.toContain('<accepted-entries>');
	});

	it('does not update memory profiles from assistant-only restatements', async () => {
		const memory = new InMemoryMemory();
		await updateMemoryProfilesFromTurn({
			memory,
			config: {},
			model: fakeModel,
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			currentProfile: undefined,
			messages: [makeAssistantMessage('Profile locked in: the user prefers concise updates.')],
			eventBus: new AgentEventBus(),
		});

		expect(generateText).not.toHaveBeenCalled();
		await expect(
			memory.getMemoryProfile({
				scopeKind: 'user-profile',
				agentId: 'agent-1',
				resourceId: 'user-1',
			}),
		).resolves.toBeNull();
	});

	it('does not update memory profiles from episodic extraction alone', async () => {
		generateObject.mockResolvedValueOnce({
			object: {
				entries: [
					extractedEntry(
						'The user prefers concise updates.',
						'Remember that I prefer concise updates.',
					),
				],
			},
		});
		embedMany.mockResolvedValueOnce({ embeddings: [[1, 0]] });

		const memory = new InMemoryMemory();
		await extractAndStoreEpisodicMemory({
			memory,
			config: { embedder: fakeEmbedder },
			model: fakeModel,
			threadId: 'thread-1',
			persistence: { threadId: 'thread-1', agentId: 'agent-1', resourceId: 'user-1' },
			messages: [makeUserMessage('Remember that I prefer concise updates.')],
			eventBus: new AgentEventBus(),
		});

		await expect(
			memory.getMemoryProfile({
				scopeKind: 'user-profile',
				agentId: 'agent-1',
				resourceId: 'user-1',
			}),
		).resolves.toBeNull();
		expect(generateObject).toHaveBeenCalledTimes(1);
		expect(generateText).not.toHaveBeenCalled();
	});

	it('loads user profiles by agent and resource', async () => {
		const memory = new InMemoryMemory();
		await memory.saveMemoryProfile(
			{ scopeKind: 'user-profile', agentId: 'agent-1', resourceId: 'user-1' },
			'The user prefers concise answers for this agent.',
		);

		const agentOne = await loadMemoryProfileContext({
			memory,
			persistence: { agentId: 'agent-1', resourceId: 'user-1' },
		});
		const agentTwo = await loadMemoryProfileContext({
			memory,
			persistence: { agentId: 'agent-2', resourceId: 'user-1' },
		});

		expect(agentOne).toEqual({
			userProfile: 'The user prefers concise answers for this agent.',
		});
		expect(agentTwo).toBeUndefined();
	});
});
