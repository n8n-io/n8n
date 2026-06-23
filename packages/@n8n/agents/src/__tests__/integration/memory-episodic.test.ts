import { embed } from 'ai';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
	createInMemoryAgentMemory,
	describeIf,
	findAllToolCalls,
	findLastTextContent,
} from './helpers';
import {
	Agent,
	createEmbeddingModel,
	DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL,
	Memory,
} from '../../index';

const describe = describeIf('anthropic', 'openai');
const EPISODIC_MEMORY_MODEL = 'anthropic/claude-sonnet-4-6';
const EPISODIC_MEMORY_CAPTURE_DELAY_MS = 500;
const EPISODIC_MEMORY_TEST_RECALL_LIMIT = 20;
const FIXED_TEST_DATE = new Date('2026-06-01T12:00:00.000Z');

describe('episodic memory integration', () => {
	const cleanups: Array<() => Promise<void> | void> = [];
	let idCounter = 0;
	let uuidCounter = 0;

	beforeEach(() => {
		idCounter = 0;
		uuidCounter = 0;
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(FIXED_TEST_DATE);
		vi.spyOn(crypto, 'randomUUID').mockImplementation(() => deterministicUuid(++uuidCounter));
	});

	afterEach(async () => {
		try {
			for (const cleanup of cleanups.splice(0)) {
				await cleanup();
			}
		} finally {
			vi.restoreAllMocks();
			vi.useRealTimers();
		}
	});

	function createEpisodicAgent(name: string): {
		agent: Agent;
		memory: ReturnType<typeof createInMemoryAgentMemory>['memory'];
	} {
		const { memory, cleanup } = createInMemoryAgentMemory();
		const memoryConfig = new Memory()
			.storage(memory)
			.observationalMemory({
				observerThresholdTokens: 1,
				reflectorThresholdTokens: 10_000,
				observationLogTailLimit: 20,
			})
			.episodicMemory({ topK: EPISODIC_MEMORY_TEST_RECALL_LIMIT });

		const agent = new Agent(name)
			.model(EPISODIC_MEMORY_MODEL)
			.instructions(
				[
					'You are a concise assistant.',
					'When the user explicitly asks about previous conversations, prior decisions, remembered artifacts, or previous memory, your first step must be to call the recall_memory tool before answering.',
					'Do not answer a prior-context question from ordinary context alone; call recall_memory first, then answer from the tool result.',
					'Use exact identifiers verbatim.',
					'If no relevant prior memory is available, say you do not have saved prior memory for that request.',
					'When asked to remember durable details, acknowledge in one concise sentence and repeat the exact identifiers without discussing memory limitations.',
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
		return `${prefix}-${++idCounter}`;
	}

	it('recalls exact artifacts across threads when explicitly asked for prior context', async () => {
		const { agent, memory } = createEpisodicAgent('episodic-cross-thread');
		const resourceId = uniqueId('resource-cross-thread');

		await generateSuccessfully(
			agent,
			[
				'IMPORTANT durable prior decision for future sessions.',
				'Preserve this exact durable memory sentence for future recall:',
				'Customer Acme Harbor tracker title exactly Acme Harbor Vendor Intake - Pilot, Slack channel exactly #vendor-acme-harbor, and status definition exactly Waiting on Vendor Info means the vendor or requester owes missing details.',
				'This should be remembered for future conversations about Acme Harbor.',
			].join('\n'),
			{ persistence: { threadId: uniqueId('thread-acme-setup'), resourceId } },
		);
		await waitForEpisodicMemoryCapture();
		await agent.close();

		const entries = await searchEpisodicEntries(
			memory,
			resourceId,
			'Acme Harbor Vendor Intake - Pilot #vendor-acme-harbor Waiting on Vendor Info',
		);
		expect(entries.length).toBeGreaterThan(0);
		const storedText = entries.map((entry) => entry.content).join('\n');
		expect(normalizedText(storedText)).toContain(
			normalizedText('Acme Harbor Vendor Intake - Pilot'),
		);
		expect(storedText).toContain('#vendor-acme-harbor');

		const result = await generateSuccessfully(
			agent,
			'You must call recall_memory before answering. Use the recall query "Acme Harbor Vendor Intake - Pilot #vendor-acme-harbor Waiting on Vendor Info". From previous conversations, what tracker title, Slack channel, and Waiting on Vendor Info meaning did we decide for Acme Harbor?',
			{ persistence: { threadId: uniqueId('thread-acme-recall'), resourceId } },
		);

		expect(toolNames(result.messages)).toContain('recall_memory');
		const recallOutput = resolvedToolOutput(result.messages, 'recall_memory');
		const recalledText = JSON.stringify(recallOutput);
		expect(normalizedText(recalledText)).toContain(
			normalizedText('Acme Harbor Vendor Intake - Pilot'),
		);
		expect(recalledText).toContain('#vendor-acme-harbor');

		const answer = normalizedAnswer(result.messages);
		expect(answer).toContain('#vendor-acme-harbor');
		expect(answer).toContain('vendor');
		expect(answer).toContain('requester');
		expect(answer).toContain('missing');
	});

	it('keeps similar customer cases distinct during cross-session recall', async () => {
		const { agent, memory } = createEpisodicAgent('episodic-distinct-cases');
		const resourceId = uniqueId('resource-distinct-cases');
		const redwoodThreadId = uniqueId('thread-redwood');
		const cedarThreadId = uniqueId('thread-cedar');

		await generateSuccessfully(
			agent,
			[
				'These are final durable Redwood Clinics details for future conversations.',
				'Customer: Redwood Clinics.',
				'Tracker title exactly: Redwood Clinic Intake Board.',
				'Slack channel exactly: #redwood-intake.',
				'Owner rule exactly: Clinic Ops owns New and Needs Clinic Review.',
				'This owner rule is Redwood-specific and must not be generalized.',
			].join('\n'),
			{ persistence: { threadId: redwoodThreadId, resourceId } },
		);
		await waitForEpisodicMemoryCapture();
		await agent.close();

		await generateSuccessfully(
			agent,
			[
				'These are final durable Cedar Labs details for future conversations.',
				'Customer: Cedar Labs.',
				'Tracker title exactly: Cedar Lab Partner Queue.',
				'Slack channel exactly: #cedar-lab-queue.',
				'Owner rule exactly: Lab Success owns New, and Finance owns Terms Review.',
				'Do not reuse Redwood owner rules for Cedar Labs.',
			].join('\n'),
			{ persistence: { threadId: cedarThreadId, resourceId } },
		);
		await waitForEpisodicMemoryCapture();
		await agent.close();

		const redwoodEntries = await searchEpisodicEntries(
			memory,
			resourceId,
			'Redwood Clinic Intake Board #redwood-intake Clinic Ops',
		);
		expect(redwoodEntries.length).toBeGreaterThan(0);

		const cedarEntries = await searchEpisodicEntries(
			memory,
			resourceId,
			'Cedar Lab Partner Queue #cedar-lab-queue Lab Success Finance',
		);
		expect(cedarEntries.length).toBeGreaterThan(0);

		const result = await generateSuccessfully(
			agent,
			'You must call recall_memory before answering. Use the recall query "Redwood Clinics Redwood Clinic Intake Board #redwood-intake Clinic Ops Cedar Labs Cedar Lab Partner Queue #cedar-lab-queue Lab Success Finance". Using previous conversations, compare the Redwood Clinics and Cedar Labs tracker titles, Slack channels, and owner rules. Keep the cases separate.',
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
		await waitForEpisodicMemoryCapture();
		await generateSuccessfully(
			agent,
			'Correction for Orion Export: please remember that the final tracker title is exactly Orion Vendor Command Center. Orion Vendor Intake Draft is outdated and must not be treated as current. Repeat the corrected value once.',
			{ persistence: { threadId: uniqueId('thread-orion-setup'), resourceId } },
		);
		await waitForEpisodicMemoryCapture();
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
		await waitForEpisodicMemoryCapture();
		await agent.close();

		const alphaEntries = await searchEpisodicEntries(
			memory,
			resourceA,
			'Resource Alpha deployment codename QUARTZ-RIVER-91',
		);
		expect(alphaEntries.length).toBeGreaterThan(0);

		const betaEntries = await searchEpisodicEntries(
			memory,
			resourceB,
			'Resource Alpha deployment codename QUARTZ-RIVER-91',
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
				'IMPORTANT durable prior decision for future sessions.',
				'Please remember these final Lumen Trail details for future conversations.',
				'Customer: Lumen Trail.',
				'Tracker title exactly: Lumen Trail Renewal Ledger.',
				'Slack channel exactly: #lumen-renewals.',
				'Owner rule exactly: Renewals Ops owns Renewal Review.',
				'These exact details must remain source-backed to this thread.',
			].join('\n'),
			{ persistence: { threadId, resourceId } },
		);
		await waitForEpisodicMemoryCapture();
		await agent.close();

		const observations = await memory.getActiveObservationLog({
			observationScopeId: threadId,
		});
		expect(observations.length).toBeGreaterThan(0);

		const entries = await searchEpisodicEntries(
			memory,
			resourceId,
			'Lumen Trail Renewal Ledger #lumen-renewals Renewals Ops',
		);
		expect(entries.length).toBeGreaterThan(0);

		const sources = await memory.episodic.getEntrySources(entries.map((entry) => entry.id));
		expect(sources.length).toBeGreaterThanOrEqual(entries.length);
		expect(sources.every((source) => source.threadId === threadId)).toBe(true);
		expect(sources.every((source) => source.evidenceText.trim().length > 0)).toBe(true);
	});
});

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

async function searchEpisodicEntries(
	memory: ReturnType<typeof createInMemoryAgentMemory>['memory'],
	resourceId: string,
	query: string,
) {
	const { embedding: queryEmbedding } = await embed({
		model: createEmbeddingModel(DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL),
		value: query,
	});
	return await memory.episodic.searchEntries(scope(resourceId), query, {
		topK: EPISODIC_MEMORY_TEST_RECALL_LIMIT,
		queryEmbedding,
	});
}

function toolNames(messages: Parameters<typeof findAllToolCalls>[0]): string[] {
	return findAllToolCalls(messages).map((call) => call.toolName);
}

function resolvedToolOutput(messages: Parameters<typeof findAllToolCalls>[0], toolName: string) {
	const toolCall = findAllToolCalls(messages).find((call) => call.toolName === toolName);
	if (!toolCall || toolCall.state !== 'resolved') {
		throw new Error(`${toolName} did not resolve`);
	}
	return toolCall.output;
}

function normalizedAnswer(messages: Parameters<typeof findLastTextContent>[0]): string {
	return (findLastTextContent(messages) ?? '').toLowerCase();
}

function normalizedText(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9#]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function waitForEpisodicMemoryCapture(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, EPISODIC_MEMORY_CAPTURE_DELAY_MS));
}

function deterministicUuid(value: number): `${string}-${string}-${string}-${string}-${string}` {
	return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}
