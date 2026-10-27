import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createInMemoryAgentMemory, describeIf, getModel } from './helpers';
import { Agent, Memory, type ScopedMemoryTaskEvent } from '../../index';

const describe = describeIf('anthropic');
const FIXED_TEST_DATE = new Date('2026-06-01T12:00:00.000Z');
let idCounter = 0;
let uuidCounter = 0;

describe('observational memory integration', () => {
	const cleanups: Array<() => Promise<void> | void> = [];

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

	it('records observations and emits memory task lifecycle events after generate()', async () => {
		const { memory, cleanup } = createInMemoryAgentMemory();
		cleanups.push(cleanup);
		const events: ScopedMemoryTaskEvent[] = [];
		const threadId = uniqueId('thread-observational');
		const resourceId = uniqueId('resource-observational');

		const memoryConfig = new Memory().storage(memory).observationalMemory({
			observerThresholdTokens: 1,
			reflectorThresholdTokens: 10_000,
			observationLogTailLimit: 20,
		});

		const agent = new Agent('observational-memory-test')
			.model(getModel('anthropic'))
			.instructions('You are a concise assistant. Acknowledge durable facts briefly.')
			.memory(memoryConfig)
			.memoryTaskObserver((event) => events.push(event));

		try {
			await agent.generate(
				[
					'IMPORTANT durable context for future turns.',
					'Customer: Orion Basin.',
					'Durable marker exactly: OBSERVATION_MARKER_ORION.',
					'Routing rule exactly: Orion Basin escalations go to Tier 3 Support.',
					'Remember this for future conversations.',
				].join('\n'),
				{ persistence: { threadId, resourceId } },
			);

			const observations = await memory.getActiveObservationLog({ observationScopeId: threadId });
			expect(observations.length).toBeGreaterThan(0);
			const observationText = normalizedText(observations.map((entry) => entry.text).join('\n'));
			expect(observationText).toContain(normalizedText('Orion Basin'));
			expect(observationText).toContain(normalizedText('Tier 3 Support'));

			const observerEventTypes = events
				.filter((event) => event.task.taskKind === 'observer')
				.map((event) => event.type);
			expect(observerEventTypes).toEqual(
				expect.arrayContaining(['queued', 'started', 'completed']),
			);
		} finally {
			await agent.close();
		}
	});
});

function uniqueId(prefix: string): string {
	return `${prefix}-${++idCounter}`;
}

function normalizedText(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9#]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function deterministicUuid(value: number): `${string}-${string}-${string}-${string}-${string}` {
	return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}
