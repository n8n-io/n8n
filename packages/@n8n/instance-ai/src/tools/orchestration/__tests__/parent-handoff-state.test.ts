import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import {
	consumeUserDecisions,
	formatParentHandoffEnvelope,
	hydrateUserDecisions,
	listUserDecisions,
	recordUserDecision,
} from '../parent-handoff-state';

const METADATA_KEY = 'instanceAiParentHandoffDecision';

function createThreadMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		metadata: initialMetadata,
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		getThread: vi.fn<() => Promise<ThreadRecord>>().mockResolvedValue(thread),
		patchThread: vi.fn().mockImplementation(
			async (args: {
				update: (current: ThreadRecord) => { metadata?: Record<string, unknown> };
			}) => {
				const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
				if (patch?.metadata) thread.metadata = patch.metadata;
				return await Promise.resolve(thread);
			},
		),
		thread,
	};
}

function createDomain(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		threadId: 'thread-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

function createOrchestration(
	domain?: InstanceAiContext,
	overrides: Partial<OrchestrationContext> = {},
): OrchestrationContext {
	return {
		domainContext: domain,
		...overrides,
	} as unknown as OrchestrationContext;
}

describe('formatParentHandoffEnvelope', () => {
	it('returns empty string when no handoff facts exist', () => {
		expect(formatParentHandoffEnvelope(createOrchestration())).toBe('');
	});

	it('includes only populated sections', () => {
		const domain = createDomain({
			resolvedUserDecisions: [
				{ question: 'How should we set up the OpenAI credential?', answer: 'automatic' },
			],
		});
		const envelope = formatParentHandoffEnvelope(
			createOrchestration(domain, { currentUserMessage: 'automatic' }),
		);

		expect(envelope).toContain('<aia-handoff>');
		expect(envelope).toContain('Current user message:');
		expect(envelope).toContain('automatic');
		expect(envelope).toContain('How should we set up the OpenAI credential?');
		expect(envelope).not.toContain('Current attachments');
		expect(envelope).not.toContain('Preview session');
	});

	it('ignores a non-string current user message', () => {
		expect(
			formatParentHandoffEnvelope(
				createOrchestration(undefined, {
					currentUserMessage: vi.fn() as unknown as string,
				}),
			),
		).toBe('');
	});

	it('truncates a current user message longer than 2000 characters', () => {
		const long = 'a'.repeat(2001);
		const envelope = formatParentHandoffEnvelope(
			createOrchestration(undefined, { currentUserMessage: long }),
		);

		expect(envelope).toContain(`${'a'.repeat(2000)}…`);
		expect(envelope).not.toContain(long);
	});

	it('lists attachment names and mime types, never bytes', () => {
		const domain = createDomain({
			currentUserAttachments: [
				{ type: 'file', fileName: 'brief.pdf', mimeType: 'application/pdf', data: 'QUJD' },
			],
		});
		const envelope = formatParentHandoffEnvelope(createOrchestration(domain));

		expect(envelope).toContain('brief.pdf');
		expect(envelope).toContain('application/pdf');
		expect(envelope).not.toContain('QUJD');
		expect(envelope).not.toContain('data');
	});

	it('lists preview session ids without a transcript', () => {
		const domain = createDomain({
			agentPreviewSession: {
				agentId: 'ag_1',
				threadId: 'th_1',
				executionId: 'ex_1',
			},
		});
		const envelope = formatParentHandoffEnvelope(createOrchestration(domain));

		expect(envelope).toContain('agentId=ag_1');
		expect(envelope).toContain('threadId=th_1');
		expect(envelope).toContain('executionId=ex_1');
		expect(envelope).not.toContain('transcript');
	});

	it('renders a skipped question as no selection', () => {
		const domain = createDomain({
			resolvedUserDecisions: [{ question: 'Which model?', answer: '(skipped)', skipped: true }],
		});

		const envelope = formatParentHandoffEnvelope(createOrchestration(domain));

		expect(envelope).toContain('Skipped by the user; proceed without a selection');
		expect(envelope).not.toContain('A: (skipped)');
	});
});

describe('recordUserDecision and hydrateUserDecisions', () => {
	it('upserts by normalized question so the last answer wins', async () => {
		const context = createDomain({ threadMemory: undefined, threadId: undefined });

		await recordUserDecision(context, {
			question: 'How  should we set up the OpenAI credential?',
			answer: 'manual',
		});
		await recordUserDecision(context, {
			question: 'how should we set up the OpenAI credential?',
			answer: 'automatic',
		});

		expect(listUserDecisions(context)).toEqual([
			{
				question: 'how should we set up the OpenAI credential?',
				answer: 'automatic',
			},
		]);
	});

	it('hydrates persisted decisions onto a fresh context', async () => {
		const threadMemory = createThreadMemory();
		await recordUserDecision(createDomain({ threadMemory }), {
			question: 'Which model?',
			answer: 'GPT-5',
		});
		await recordUserDecision(createDomain({ threadMemory }), {
			question: 'How should we set up the OpenAI credential?',
			answer: 'automatic',
		});

		const nextTurn = createDomain({ threadMemory });
		await hydrateUserDecisions(nextTurn);

		expect(listUserDecisions(nextTurn)).toEqual([
			{ question: 'Which model?', answer: 'GPT-5' },
			{ question: 'How should we set up the OpenAI credential?', answer: 'automatic' },
		]);
	});

	it('merges each write with decisions already persisted by another context', async () => {
		const threadMemory = createThreadMemory();
		const first = createDomain({ threadMemory, resolvedUserDecisions: [] });
		const second = createDomain({ threadMemory, resolvedUserDecisions: [] });

		await recordUserDecision(first, { question: 'Which model?', answer: 'Claude' });
		await recordUserDecision(second, { question: 'Which channel?', answer: 'Chat' });

		const nextTurn = createDomain({ threadMemory });
		await hydrateUserDecisions(nextTurn);
		expect(listUserDecisions(nextTurn)).toEqual([
			{ question: 'Which model?', answer: 'Claude' },
			{ question: 'Which channel?', answer: 'Chat' },
		]);
	});

	it('consumes handed-off decisions without deleting a newer answer', async () => {
		const original = { question: 'Which model?', answer: 'Claude' };
		const threadMemory = createThreadMemory({ [METADATA_KEY]: [original] });
		const context = createDomain({
			threadMemory,
			resolvedUserDecisions: [original],
		});
		threadMemory.thread.metadata = {
			[METADATA_KEY]: [{ question: 'Which model?', answer: 'GPT-5' }],
		};

		await consumeUserDecisions(context, [original]);

		expect(listUserDecisions(context)).toEqual([{ question: 'Which model?', answer: 'GPT-5' }]);
	});

	it('drops the oldest decision once the cap is exceeded', async () => {
		const context = createDomain({ threadMemory: undefined, threadId: undefined });
		for (let i = 0; i < 41; i++) {
			await recordUserDecision(context, { question: `Q${String(i)}`, answer: `A${String(i)}` });
		}

		const decisions = listUserDecisions(context);
		expect(decisions).toHaveLength(40);
		expect(decisions[0]?.question).toBe('Q1');
		expect(decisions.at(-1)?.question).toBe('Q40');
	});

	it('keeps in-memory decisions when thread memory is missing', async () => {
		const context = createDomain({ threadMemory: undefined, threadId: undefined });

		await recordUserDecision(context, { question: 'Channel?', answer: 'chat' });

		expect(listUserDecisions(context)).toEqual([{ question: 'Channel?', answer: 'chat' }]);
	});

	it('records without a separate thread read', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.getThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createDomain({ threadMemory });

		await expect(
			recordUserDecision(context, { question: 'Channel?', answer: 'chat' }),
		).resolves.toBeUndefined();
		expect(listUserDecisions(context)).toEqual([{ question: 'Channel?', answer: 'chat' }]);
		expect(threadMemory.getThread).not.toHaveBeenCalled();
	});

	it('does not throw when patchThread rejects', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.patchThread.mockRejectedValue(new Error('write failed'));
		const context = createDomain({ threadMemory });

		await expect(
			recordUserDecision(context, { question: 'Channel?', answer: 'chat' }),
		).resolves.toBeUndefined();
		expect(listUserDecisions(context)).toEqual([{ question: 'Channel?', answer: 'chat' }]);
	});

	it('treats malformed metadata as an empty list', async () => {
		const threadMemory = createThreadMemory({ [METADATA_KEY]: { not: 'an array' } });
		const context = createDomain({ threadMemory });

		await expect(hydrateUserDecisions(context)).resolves.toEqual([]);
		expect(listUserDecisions(context)).toEqual([]);
	});
});
