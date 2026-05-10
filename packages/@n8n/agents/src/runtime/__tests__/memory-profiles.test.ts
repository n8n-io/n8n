import type { EmbeddingModel } from 'ai';

import type { AgentDbMessage } from '../../types/sdk/message';
import { extractAndStoreEpisodicMemory } from '../episodic-memory';
import { AgentEventBus } from '../event-bus';
import {
	DEFAULT_MEMORY_PROFILE_UPDATE_PROMPT,
	loadMemoryProfileContext,
	updateMemoryProfilesFromTurn,
	withMemoryProfileDefaults,
} from '../memory-profiles';
import { InMemoryMemory } from '../memory-store';

jest.mock('ai', () => ({
	generateText: jest.fn(),
	embedMany: jest.fn(),
}));

const { generateText, embedMany } = jest.requireMock<{
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

	it('uses profile-specific defaults', () => {
		const profileDefaults = withMemoryProfileDefaults({});

		expect(profileDefaults.profileUpdatePrompt).toBe(DEFAULT_MEMORY_PROFILE_UPDATE_PROMPT);
	});

	it('tightens default profile update instructions to stable user entries and actionable persona behavior', () => {
		const prompt = withMemoryProfileDefaults({}).profileUpdatePrompt;

		expect(prompt).toContain('User profile captures stable cross-session information');
		expect(prompt).toContain('<user> is not task memory');
		expect(prompt).toContain('must never be connected to the current objective of an agent');
		expect(prompt).toContain('communication preferences');
		expect(prompt).toContain('coding, review, and testing preferences');
		expect(prompt).toContain('durable workflow preferences');
		expect(prompt).toContain('stable identity or role');
		expect(prompt).toContain('normal setup');
		expect(prompt).toContain('active project state');
		expect(prompt).toContain('debugging steps');
		expect(prompt).toContain('implementation order');
		expect(prompt).toContain('branch stack');
		expect(prompt).toContain('test flow');
		expect(prompt).toContain('next actions');
		expect(prompt).toContain('temporary constraints');
		expect(prompt).toContain('session objectives');
		expect(prompt).toContain(
			'If the information would stop being useful after the current task ends',
		);
		expect(prompt).toContain('belongs in <persona>');
		expect(prompt).toContain('belongs in source-backed case entries');
		expect(prompt).toContain('Existing profile content is not authoritative');
		expect(prompt).toContain('remove entries that violate these rules');
		expect(prompt).not.toContain('ongoing context about the user/resource');
		expect(prompt).toContain('Persona captures actionable behavioral directives');
		expect(prompt).toContain('imperative system-instruction-style directives');
		expect(prompt).toContain('concrete future behavior change');
		expect(prompt).toContain('descriptive agent facts');
		expect(prompt).toContain('storage/data-model facts');
		expect(prompt).toContain('model names');
		expect(prompt).toContain('schema facts');
		expect(prompt).toContain('current feature details');
		expect(prompt).toContain('current implementation details');
	});

	it('updates memory profiles from the profile updater path', async () => {
		generateText.mockResolvedValueOnce({
			text: JSON.stringify({
				persona:
					'When discussing memory architecture, distinguish profile-shaped from episodic-shaped memory.',
				user: 'The user prefers concise updates.',
			}),
		});

		const memory = new InMemoryMemory();
		const messages = [
			makeUserMessage(
				'Remember that I prefer concise updates. For this agent, respond with memory architecture distinctions instead of vague memory language.',
			),
			makeAssistantMessage(
				'Understood. I will distinguish profile-shaped memory from episodic-shaped memory.',
			),
		];
		await updateMemoryProfilesFromTurn({
			memory,
			config: { agentDescription: 'Helps users debug n8n code.' },
			model: fakeModel,
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			currentProfile: undefined,
			messages,
			eventBus: new AgentEventBus(),
		});

		await expect(
			memory.getMemoryProfile({ scopeKind: 'resource', scopeId: 'user-1' }),
		).resolves.toMatchObject({ content: 'The user prefers concise updates.' });
		await expect(
			memory.getMemoryProfile({ scopeKind: 'agent', scopeId: 'agent-1' }),
		).resolves.toMatchObject({
			content:
				'When discussing memory architecture, distinguish profile-shaped from episodic-shaped memory.',
		});
		expect(generateText).toHaveBeenCalledTimes(1);
		expect(generateText.mock.calls[0][0].system).toContain(
			'Persona captures actionable behavioral directives',
		);
		expect(generateText.mock.calls[0][0].system).toContain(
			'Assistant messages are supporting context',
		);
		expect(generateText.mock.calls[0][0].prompt).toContain(
			'<agent-description>\nHelps users debug n8n code.\n</agent-description>',
		);
		expect(generateText.mock.calls[0][0].prompt).toContain('<user-message>');
		expect(generateText.mock.calls[0][0].prompt).toContain(
			'For this agent, respond with memory architecture distinctions',
		);
		expect(generateText.mock.calls[0][0].prompt).toContain('<assistant-message>');
		expect(generateText.mock.calls[0][0].prompt).toContain(
			'I will distinguish profile-shaped memory from episodic-shaped memory.',
		);
		expect(generateText.mock.calls[0][0].prompt).not.toContain('<accepted-entries>');
	});

	it('updates memory profiles from the turn pair even when no entries are accepted', async () => {
		generateText.mockResolvedValueOnce({
			text: JSON.stringify({
				persona:
					'When users describe technical issues, ask for the specific n8n version before suggesting fixes.',
				user: 'The user prefers responses without business framing or em dashes.',
			}),
		});

		const memory = new InMemoryMemory();
		await updateMemoryProfilesFromTurn({
			memory,
			config: { agentDescription: 'Helps users debug n8n code.' },
			model: fakeModel,
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			currentProfile: undefined,
			messages: [
				makeUserMessage(
					'When I report a technical issue, ask me for the exact n8n version first. I prefer no business framing or em dashes.',
				),
				makeAssistantMessage('Got it. I will ask for the n8n version first.'),
			],
			eventBus: new AgentEventBus(),
		});

		expect(embedMany).not.toHaveBeenCalled();
		await expect(
			memory.getMemoryProfile({ scopeKind: 'agent', scopeId: 'agent-1' }),
		).resolves.toMatchObject({
			content:
				'When users describe technical issues, ask for the specific n8n version before suggesting fixes.',
		});
		await expect(
			memory.getMemoryProfile({ scopeKind: 'resource', scopeId: 'user-1' }),
		).resolves.toMatchObject({
			content: 'The user prefers responses without business framing or em dashes.',
		});
	});

	it('does not update memory profiles from assistant-only restatements', async () => {
		const memory = new InMemoryMemory();
		await updateMemoryProfilesFromTurn({
			memory,
			config: { agentDescription: 'Helps users debug n8n code.' },
			model: fakeModel,
			scope: { agentId: 'agent-1', resourceId: 'user-1' },
			currentProfile: undefined,
			messages: [makeAssistantMessage('Persona locked in: I will always use a test-first style.')],
			eventBus: new AgentEventBus(),
		});

		expect(generateText).not.toHaveBeenCalled();
		await expect(
			memory.getMemoryProfile({ scopeKind: 'agent', scopeId: 'agent-1' }),
		).resolves.toBeNull();
	});

	it('does not update memory profiles from episodic extraction alone', async () => {
		generateText.mockResolvedValueOnce({
			text: JSON.stringify({
				entries: [
					extractedEntry(
						'The user prefers concise updates.',
						'Remember that I prefer concise updates.',
					),
				],
			}),
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
			memory.getMemoryProfile({ scopeKind: 'resource', scopeId: 'user-1' }),
		).resolves.toBeNull();
		expect(generateText).toHaveBeenCalledTimes(1);
	});

	it('loads resource profiles shared across agents and persona profiles scoped to one agent', async () => {
		const memory = new InMemoryMemory();
		await memory.saveMemoryProfile(
			{ scopeKind: 'resource', scopeId: 'user-1' },
			'The user prefers concise answers.',
		);
		await memory.saveMemoryProfile(
			{ scopeKind: 'agent', scopeId: 'agent-1' },
			'This agent handles memory debugging.',
		);
		await memory.saveMemoryProfile(
			{ scopeKind: 'agent', scopeId: 'agent-2' },
			'This other agent handles invoices.',
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
			persona: 'This agent handles memory debugging.',
			user: 'The user prefers concise answers.',
		});
		expect(agentTwo).toEqual({
			persona: 'This other agent handles invoices.',
			user: 'The user prefers concise answers.',
		});
	});

	it('uses neutral agent/resource scope for profile updates', async () => {
		generateText.mockResolvedValueOnce({
			text: JSON.stringify({
				persona: 'When users ask about tests, describe the narrow focused command first.',
				user: '',
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
				makeUserMessage('When I ask about tests, describe the narrow focused command first.'),
				makeAssistantMessage('Understood.'),
			],
			eventBus: new AgentEventBus(),
		});

		await expect(
			memory.getMemoryProfile({ scopeKind: 'agent', scopeId: 'agent-1' }),
		).resolves.toMatchObject({
			content: 'When users ask about tests, describe the narrow focused command first.',
		});
	});
});
