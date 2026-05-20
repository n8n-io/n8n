import { expect, it, afterEach, describe as _describe } from 'vitest';

import { Agent, createObservationLogThreadScopeId, Memory } from '../../../index';
import {
	createInMemoryAgentMemory,
	findAllToolCalls,
	findLastTextContent,
	getModel,
} from '../helpers';

const describe =
	process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY ? _describe : _describe.skip;

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
	for (const cleanup of cleanups.splice(0)) {
		await cleanup();
	}
});

describe('episodic memory integration', () => {
	it('recalls exact artifacts across threads when explicitly asked for prior context', async () => {
		const { agent, memory } = createEpisodicAgent('episodic-cross-thread');
		const resourceId = uniqueId('resource-cross-thread');

		await generateSuccessfully(
			agent,
			[
				'Please remember these Acme Harbor details for a future conversation, then repeat them back once.',
				'Customer name: Acme Harbor.',
				'Tracker title exactly: Acme Harbor Vendor Intake - Pilot.',
				'Slack channel exactly: #vendor-acme-harbor.',
				'Final status Waiting on Vendor Info means the vendor or requester owes missing details.',
			].join('\n'),
			{ persistence: { threadId: uniqueId('thread-acme-setup'), resourceId } },
		);
		await agent.close();

		const result = await generateSuccessfully(
			agent,
			'You must call recall_memory before answering. From previous conversations, what tracker title, Slack channel, and Waiting on Vendor Info meaning did we decide for Acme Harbor?',
			{ persistence: { threadId: uniqueId('thread-acme-recall'), resourceId } },
		);

		expect(toolNames(result.messages)).toContain('recall_memory');
		const answer = normalizedAnswer(result.messages);
		expect(answer).toContain('acme harbor vendor intake - pilot');
		expect(answer).toContain('#vendor-acme-harbor');
		expect(answer).toContain('vendor');
		expect(answer).toContain('requester');
		expect(answer).toContain('missing');

		const entries = await memory.episodic.searchEntries(scope(resourceId), 'Acme Harbor tracker', {
			topK: 5,
		});
		expect(entries.length).toBeGreaterThan(0);
	});

	it('keeps similar customer cases distinct during cross-session recall', async () => {
		const { agent } = createEpisodicAgent('episodic-distinct-cases');
		const resourceId = uniqueId('resource-distinct-cases');

		await generateSuccessfully(
			agent,
			[
				'Please remember these Redwood Clinics details for a future conversation, then repeat them back once.',
				'Tracker title exactly: Redwood Clinic Intake Board.',
				'Slack channel exactly: #redwood-intake.',
				'Owner rule: Clinic Ops owns New and Needs Clinic Review.',
				'This owner rule is Redwood-specific and must not be generalized.',
			].join('\n'),
			{ persistence: { threadId: uniqueId('thread-redwood'), resourceId } },
		);

		await generateSuccessfully(
			agent,
			[
				'Please remember these separate Cedar Labs details for a future conversation, then repeat them back once.',
				'Tracker title exactly: Cedar Lab Partner Queue.',
				'Slack channel exactly: #cedar-lab-queue.',
				'Owner rule: Lab Success owns New, and Finance owns Terms Review.',
				'Do not reuse Redwood owner rules for Cedar Labs.',
			].join('\n'),
			{ persistence: { threadId: uniqueId('thread-cedar'), resourceId } },
		);
		await agent.close();

		const result = await generateSuccessfully(
			agent,
			'You must call recall_memory before answering. Using previous conversations, compare the Redwood Clinics and Cedar Labs tracker titles, Slack channels, and owner rules. Keep the cases separate.',
			{ persistence: { threadId: uniqueId('thread-distinct-recall'), resourceId } },
		);

		expect(toolNames(result.messages)).toContain('recall_memory');
		const answer = normalizedAnswer(result.messages);
		expect(answer).toContain('redwood clinic intake board');
		expect(answer).toContain('#redwood-intake');
		expect(answer).toContain('clinic ops');
		expect(answer).toContain('cedar lab partner queue');
		expect(answer).toContain('#cedar-lab-queue');
		expect(answer).toContain('lab success');
		expect(answer).toContain('finance');
	});

	it('recalls corrected current state without treating stale values as current', async () => {
		const { agent } = createEpisodicAgent('episodic-correction');
		const resourceId = uniqueId('resource-correction');

		await generateSuccessfully(
			agent,
			'Please remember this Orion Export setup for a future conversation: the initial tracker title is Orion Vendor Intake Draft. Repeat it back once.',
			{ persistence: { threadId: uniqueId('thread-orion-setup'), resourceId } },
		);
		await generateSuccessfully(
			agent,
			'Correction for Orion Export: please remember that the final tracker title is exactly Orion Vendor Command Center. Orion Vendor Intake Draft is outdated and must not be treated as current. Repeat the corrected value once.',
			{ persistence: { threadId: uniqueId('thread-orion-setup'), resourceId } },
		);
		await agent.close();

		const result = await generateSuccessfully(
			agent,
			'You must call recall_memory before answering. From previous memory, what is the current final tracker title for Orion Export? If an earlier title existed, mention it only as outdated.',
			{ persistence: { threadId: uniqueId('thread-orion-recall'), resourceId } },
		);

		expect(toolNames(result.messages)).toContain('recall_memory');
		const answer = normalizedAnswer(result.messages);
		expect(answer).toContain('orion vendor command center');
		if (answer.includes('orion vendor intake draft')) {
			expect(answer).toMatch(/outdated|earlier|previous|corrected|not current|no longer/);
		}
	});

	it('isolates episodic memory between resources for the same agent', async () => {
		const { agent, memory } = createEpisodicAgent('episodic-resource-isolation');
		const resourceA = uniqueId('resource-alpha');
		const resourceB = uniqueId('resource-beta');
		const privateIdentifier = 'QUARTZ-RIVER-91';

		await generateSuccessfully(
			agent,
			`Please remember this Resource Alpha detail for a future conversation, then repeat it back once: the exact deployment codename is ${privateIdentifier}.`,
			{ persistence: { threadId: uniqueId('thread-alpha'), resourceId: resourceA } },
		);
		await agent.close();

		const alphaEntries = await memory.episodic.searchEntries(
			scope(resourceA),
			'Resource Alpha deployment codename QUARTZ-RIVER-91',
			{ topK: 5 },
		);
		expect(alphaEntries.length).toBeGreaterThan(0);

		const betaEntries = await memory.episodic.searchEntries(
			scope(resourceB),
			'Resource Alpha deployment codename QUARTZ-RIVER-91',
			{ topK: 5 },
		);
		expect(betaEntries).toEqual([]);

		const result = await generateSuccessfully(
			agent,
			'From previous memory, what deployment codename did I give you?',
			{ persistence: { threadId: uniqueId('thread-beta-recall'), resourceId: resourceB } },
		);
		expect(normalizedAnswer(result.messages)).not.toContain(privateIdentifier.toLowerCase());
	});

	it('keeps indexed entries source-backed with source thread evidence', async () => {
		const { agent, memory } = createEpisodicAgent('episodic-source-backed');
		const resourceId = uniqueId('resource-source-backed');
		const threadId = uniqueId('thread-lumen');

		await generateSuccessfully(
			agent,
			[
				'Please remember these Lumen Trail details for a future conversation, then repeat them back once.',
				'Tracker title exactly: Lumen Trail Renewal Ledger.',
				'Slack channel exactly: #lumen-renewals.',
				'Owner rule: Renewals Ops owns Renewal Review.',
			].join('\n'),
			{ persistence: { threadId, resourceId } },
		);
		await agent.close();

		const observations = await memory.getActiveObservationLog({
			scopeKind: 'thread',
			scopeId: createObservationLogThreadScopeId(threadId, resourceId),
		});
		expect(observations.length).toBeGreaterThan(0);

		const entries = await memory.episodic.searchEntries(scope(resourceId), 'Lumen Trail', {
			topK: 5,
		});
		expect(entries.length).toBeGreaterThan(0);

		const sources = await memory.episodic.getEntrySources(entries.map((entry) => entry.id));
		expect(sources.length).toBeGreaterThanOrEqual(entries.length);
		expect(sources.every((source) => source.threadId === threadId)).toBe(true);
		expect(sources.every((source) => source.evidenceText.trim().length > 0)).toBe(true);
	});
});

function createEpisodicAgent(name: string): {
	agent: Agent;
	memory: ReturnType<typeof createInMemoryAgentMemory>['memory'];
} {
	const { memory, cleanup } = createInMemoryAgentMemory();
	const memoryConfig = new Memory()
		.storage(memory)
		.lastMessages(3)
		.observationalMemory({
			observerThresholdTokens: 1,
			reflectorThresholdTokens: 10_000,
			observationLogTailLimit: 20,
		})
		.episodicMemory({ topK: 5 });

	const agent = new Agent(name)
		.model(getModel('anthropic'))
		.instructions(
			[
				'You are a concise assistant.',
				'When the user explicitly asks about previous conversations, prior decisions, remembered artifacts, or previous memory, your first step must be to call the recall_memory tool before answering.',
				'Do not answer a prior-context question from ordinary context alone; call recall_memory first, then answer from the tool result.',
				'Use exact identifiers verbatim.',
				'If no relevant prior memory is available, say you do not have saved prior memory for that request.',
			].join(' '),
		)
		.memory(memoryConfig);

	cleanups.push(async () => {
		await agent.close();
		cleanup();
	});

	return { agent, memory };
}

function uniqueId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function generateSuccessfully(
	agent: Agent,
	input: Parameters<Agent['generate']>[0],
	options: Parameters<Agent['generate']>[1],
): Promise<Awaited<ReturnType<Agent['generate']>>> {
	const result = await agent.generate(input, options);
	expect(result.error).toBeUndefined();
	expect(result.finishReason).not.toBe('error');
	return result;
}

function scope(resourceId: string) {
	return { resourceId };
}

function toolNames(messages: Parameters<typeof findAllToolCalls>[0]): string[] {
	return findAllToolCalls(messages).map((call) => call.toolName);
}

function normalizedAnswer(messages: Parameters<typeof findLastTextContent>[0]): string {
	return (findLastTextContent(messages) ?? '').toLowerCase();
}
