import { generateText } from 'ai';
import { expect, it } from 'vitest';

import {
	Agent,
	type AgentDbMessage,
	type BuiltObservationStore,
	type CompactFn,
	createModel,
	Memory,
	type Observation,
	type ObservationCursor,
	OBSERVATION_SCHEMA_VERSION,
	type ObserveFn,
} from '../../../index';
import { InMemoryMemory } from '../../../runtime/memory-store';
import { describeIf, findLastTextContent, getModel } from '../helpers';

const describe = describeIf('anthropic');

const WORKING_MEMORY_TEMPLATE = [
	'# User Memory',
	'- **Location**:',
	'- **Project codename**:',
].join('\n');

type ObservationCycleStore = BuiltObservationStore &
	Pick<InMemoryMemory, 'getWorkingMemory' | 'saveWorkingMemory'>;

function uniqueId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

function messageText(message: AgentDbMessage): string {
	if (!('content' in message) || !Array.isArray(message.content)) {
		return `${message.type}: ${JSON.stringify(message)}`;
	}

	const text = message.content
		.map((part) => {
			if (part.type === 'text' || part.type === 'reasoning') return part.text;
			if (part.type === 'tool-call') return `[tool:${part.toolName}] ${JSON.stringify(part.input)}`;
			if (part.type === 'invalid-tool-call') return `[invalid-tool:${part.name ?? 'unknown'}]`;
			if (part.type === 'file') return `[file:${part.mediaType ?? 'unknown'}]`;
			if (part.type === 'citation') return `[citation:${part.title ?? part.url ?? 'unknown'}]`;
			if (part.type === 'provider') return JSON.stringify(part.value);
			return '';
		})
		.filter(Boolean)
		.join(' ');

	return `${message.role}: ${text}`;
}

function observationText(observation: Observation): string {
	const payload = observation.payload;
	if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
		const text = (payload as Record<string, unknown>).text;
		if (typeof text === 'string') return text;
	}
	return JSON.stringify(payload);
}

function observeWithModel(model: string): ObserveFn {
	return async ({ deltaMessages, threadId, now }) => {
		const transcript = deltaMessages.map(messageText).join('\n');
		const { text } = await generateText({
			model: createModel(model),
			temperature: 0,
			system: [
				'Extract durable user facts from the transcript.',
				'Return one concise observation sentence.',
				'Preserve exact names, places, and codes.',
				'If there are no durable facts, return NONE.',
			].join(' '),
			prompt: transcript,
		});

		const content = text.trim();
		if (content.toUpperCase() === 'NONE') return [];

		return [
			{
				scopeKind: 'thread',
				scopeId: threadId,
				kind: 'user-fact',
				payload: { text: content },
				durationMs: null,
				schemaVersion: OBSERVATION_SCHEMA_VERSION,
				createdAt: now,
			},
		];
	};
}

function compactWithModel(model: string): CompactFn {
	return async ({ observations, currentWorkingMemory, workingMemoryTemplate }) => {
		const observationList = observations.map((observation) => `- ${observationText(observation)}`);
		const { text } = await generateText({
			model: createModel(model),
			temperature: 0,
			system: [
				'You maintain a concise working-memory document.',
				'Return the complete updated document only.',
				'Preserve exact names, places, and codes.',
			].join(' '),
			prompt: [
				'Template:',
				workingMemoryTemplate,
				'',
				'Current working memory:',
				currentWorkingMemory ?? workingMemoryTemplate,
				'',
				'New observations:',
				observationList.join('\n'),
			].join('\n'),
		});

		return { content: text.trim() };
	};
}

async function runObservationCycleForTest({
	store,
	threadId,
	resourceId,
	model,
}: {
	store: ObservationCycleStore;
	threadId: string;
	resourceId: string;
	model: string;
}): Promise<{
	deltaMessages: AgentDbMessage[];
	cursorAfter: ObservationCursor | null;
}> {
	const handle = await store.acquireObservationLock('thread', threadId, {
		holderId: 'observational-memory-integration-test',
		ttlMs: 30_000,
	});
	expect(handle).not.toBeNull();
	if (!handle) throw new Error('Failed to acquire observation lock');

	try {
		const cursor = await store.getCursor('thread', threadId);
		const deltaMessages = await store.getMessagesForScope('thread', threadId, {
			...(cursor && {
				since: {
					sinceCreatedAt: cursor.lastObservedAt,
					sinceMessageId: cursor.lastObservedMessageId,
				},
			}),
		});
		expect(deltaMessages.length).toBeGreaterThan(0);

		const currentWorkingMemory = await store.getWorkingMemory({
			threadId,
			resourceId,
			scope: 'resource',
		});
		const now = new Date();
		const observedRows = await observeWithModel(model)({
			deltaMessages,
			currentWorkingMemory,
			cursor,
			threadId,
			resourceId,
			now,
			trigger: { type: 'per-turn' },
			telemetry: undefined,
		});
		const persistedRows = await store.appendObservations(observedRows);
		expect(persistedRows.length).toBeGreaterThan(0);

		const lastMessage = deltaMessages[deltaMessages.length - 1];
		await store.setCursor({
			scopeKind: 'thread',
			scopeId: threadId,
			lastObservedMessageId: lastMessage.id,
			lastObservedAt: lastMessage.createdAt,
			updatedAt: now,
		});

		const queuedRows = await store.getObservations({
			scopeKind: 'thread',
			scopeId: threadId,
			schemaVersionAtMost: OBSERVATION_SCHEMA_VERSION,
		});
		expect(queuedRows.length).toBeGreaterThan(0);

		const compacted = await compactWithModel(model)({
			observations: queuedRows,
			currentWorkingMemory,
			workingMemoryTemplate: WORKING_MEMORY_TEMPLATE,
			structured: false,
			threadId,
			resourceId,
			model,
			compactorPrompt: 'Compact thread-scoped observations into resource-scoped working memory.',
			telemetry: undefined,
		});
		await store.saveWorkingMemory({ threadId, resourceId, scope: 'resource' }, compacted.content);
		await store.deleteObservations(queuedRows.map((row) => row.id));

		const remainingRows = await store.getObservations({
			scopeKind: 'thread',
			scopeId: threadId,
		});
		expect(remainingRows).toHaveLength(0);

		return {
			deltaMessages,
			cursorAfter: await store.getCursor('thread', threadId),
		};
	} finally {
		await store.releaseObservationLock(handle);
	}
}

function createWriterAgent(model: string, store: InMemoryMemory): Agent {
	return new Agent('observational-memory-writer')
		.model(model)
		.instructions('You are a helpful assistant. Acknowledge briefly, and do not repeat user facts.')
		.memory(new Memory().storage(store).lastMessages(10));
}

function createReaderAgent(model: string, store: InMemoryMemory): Agent {
	return new Agent('observational-memory-reader')
		.model(model)
		.instructions('Answer only from working memory. Be concise.')
		.memory(
			new Memory()
				.storage(store)
				.lastMessages(1)
				.scope('resource')
				.freeform(WORKING_MEMORY_TEMPLATE),
		);
}

async function rememberFact(
	agent: Agent,
	fact: string,
	options: { persistence: { threadId: string; resourceId: string } },
) {
	const result = await agent.generate(`${fact} Reply with "noted".`, options);
	expect(result.finishReason).toBe('stop');
	expect(findLastTextContent(result.messages)).toBeTruthy();
}

async function addNeutralTurn(
	agent: Agent,
	options: { persistence: { threadId: string; resourceId: string } },
	forbiddenTerms: string[],
) {
	const result = await agent.generate('Reply only with "ok".', options);
	expect(result.finishReason).toBe('stop');
	const text = findLastTextContent(result.messages)?.toLowerCase() ?? '';
	expect(text).toContain('ok');
	for (const term of forbiddenTerms) {
		expect(text).not.toContain(term);
	}
}

function expectTextToContain(text: string | null | undefined, expectedTerms: string[]) {
	const normalized = text?.toLowerCase() ?? '';
	for (const term of expectedTerms) {
		expect(normalized).toContain(term);
	}
}

describe('observational memory integration', () => {
	it('compacts observed thread facts into resource working memory for another thread', async () => {
		const store = new InMemoryMemory();
		const model = getModel('anthropic');
		const resourceId = uniqueId('obs-resource');
		const sourceThreadId = uniqueId('obs-source');
		const readerThreadId = uniqueId('obs-reader');

		const writer = createWriterAgent(model, store);

		await rememberFact(writer, 'Please remember this for later: I live in Reykjavik.', {
			persistence: { threadId: sourceThreadId, resourceId },
		});

		await runObservationCycleForTest({
			store,
			threadId: sourceThreadId,
			resourceId,
			model,
		});

		const reader = createReaderAgent(model, store);
		const result = await reader.generate('From memory only, where do I live?', {
			persistence: {
				threadId: readerThreadId,
				resourceId,
			},
		});

		expectTextToContain(findLastTextContent(result.messages), ['reykjavik']);
	});

	it('uses compacted working memory inside the observed thread after the fact leaves chat history', async () => {
		const store = new InMemoryMemory();
		const model = getModel('anthropic');
		const resourceId = uniqueId('obs-resource');
		const sourceThreadId = uniqueId('obs-source');
		const options = {
			persistence: { threadId: sourceThreadId, resourceId },
		};

		const writer = createWriterAgent(model, store);

		await rememberFact(
			writer,
			'Please remember this for later: I live in Reykjavik, and my project codename is Aurora-17.',
			options,
		);
		await addNeutralTurn(writer, options, ['reykjavik', 'aurora-17']);

		await runObservationCycleForTest({
			store,
			threadId: sourceThreadId,
			resourceId,
			model,
		});

		const workingMemory = await store.getWorkingMemory({
			threadId: sourceThreadId,
			resourceId,
			scope: 'resource',
		});
		expectTextToContain(workingMemory, ['reykjavik', 'aurora-17']);

		const reader = createReaderAgent(model, store);
		const result = await reader.generate(
			'From memory only, where do I live and what is my project codename?',
			options,
		);

		expectTextToContain(findLastTextContent(result.messages), ['reykjavik', 'aurora-17']);
	});

	it('folds later turns from the same thread into existing working memory', async () => {
		const store = new InMemoryMemory();
		const model = getModel('anthropic');
		const resourceId = uniqueId('obs-resource');
		const sourceThreadId = uniqueId('obs-source');
		const options = {
			persistence: { threadId: sourceThreadId, resourceId },
		};

		const writer = createWriterAgent(model, store);

		await rememberFact(
			writer,
			'Please remember this for later: I live in Reykjavik, and my project codename is Aurora-17.',
			options,
		);
		await addNeutralTurn(writer, options, ['reykjavik', 'aurora-17']);
		const firstCycle = await runObservationCycleForTest({
			store,
			threadId: sourceThreadId,
			resourceId,
			model,
		});

		await rememberFact(writer, 'Also remember that my editor theme is Solarized Dawn.', options);
		await addNeutralTurn(writer, options, ['solarized', 'dawn']);
		const secondCycle = await runObservationCycleForTest({
			store,
			threadId: sourceThreadId,
			resourceId,
			model,
		});

		expect(firstCycle.cursorAfter).not.toBeNull();
		expect(secondCycle.cursorAfter?.lastObservedAt.getTime()).toBeGreaterThan(
			firstCycle.cursorAfter!.lastObservedAt.getTime(),
		);

		const workingMemory = await store.getWorkingMemory({
			threadId: sourceThreadId,
			resourceId,
			scope: 'resource',
		});
		expectTextToContain(workingMemory, ['reykjavik', 'aurora-17', 'solarized dawn']);

		const reader = createReaderAgent(model, store);
		const result = await reader.generate(
			'From memory only, where do I live, what is my project codename, and what is my editor theme?',
			options,
		);

		expectTextToContain(findLastTextContent(result.messages), [
			'reykjavik',
			'aurora-17',
			'solarized',
			'dawn',
		]);
	});
});
