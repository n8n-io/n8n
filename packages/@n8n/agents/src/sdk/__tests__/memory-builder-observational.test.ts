import type { BuiltMemory } from '../../types';
import { OBSERVATION_SCHEMA_VERSION, type ObserveFn } from '../../types/sdk/observation';
import { Agent } from '../agent';
import { Memory } from '../memory';

describe('Memory builder — observational memory', () => {
	const observe = jest.fn().mockResolvedValue([]) as unknown as ObserveFn;

	it('omits observationalMemory when not configured', () => {
		const config = new Memory().build();
		expect(config.observationalMemory).toBeUndefined();
	});

	it('applies summaryKind and lockTtlMs defaults', () => {
		const config = new Memory().observationalMemory({ observe }).build();
		expect(config.observationalMemory?.summaryKind).toBe('summary');
		expect(config.observationalMemory?.lockTtlMs).toBe(30_000);
	});

	it('respects consumer overrides for summaryKind and lockTtlMs', () => {
		const config = new Memory()
			.observationalMemory({ observe, summaryKind: 'rolling', lockTtlMs: 5_000 })
			.build();
		expect(config.observationalMemory?.summaryKind).toBe('rolling');
		expect(config.observationalMemory?.lockTtlMs).toBe(5_000);
	});

	it('forwards optional fields untouched', () => {
		const formatContext = jest.fn(() => '');
		const compact = jest.fn().mockResolvedValue({
			summary: {
				scopeKind: 'thread' as const,
				scopeId: 't',
				kind: 'summary',
				payload: '',
				durationMs: null,
				schemaVersion: OBSERVATION_SCHEMA_VERSION,
				createdAt: new Date(),
				compactedAt: null,
			},
		});
		const config = new Memory()
			.observationalMemory({
				observe,
				compact,
				compactionRowThreshold: 25,
				stalenessThresholdMs: 3600_000,
				formatContext,
				sync: true,
			})
			.build();

		expect(config.observationalMemory?.observe).toBe(observe);
		expect(config.observationalMemory?.compact).toBe(compact);
		expect(config.observationalMemory?.compactionRowThreshold).toBe(25);
		expect(config.observationalMemory?.stalenessThresholdMs).toBe(3600_000);
		expect(config.observationalMemory?.formatContext).toBe(formatContext);
		expect(config.observationalMemory?.sync).toBe(true);
	});

	it('rejects backends that do not implement BuiltObservationStore', () => {
		const minimalBackend = {
			getThread: jest.fn().mockResolvedValue(null),
			saveThread: jest.fn().mockResolvedValue({}),
			deleteThread: jest.fn().mockResolvedValue(undefined),
			getMessages: jest.fn().mockResolvedValue([]),
			saveMessages: jest.fn().mockResolvedValue(undefined),
			deleteMessages: jest.fn().mockResolvedValue(undefined),
			describe: () => ({
				name: 'minimal',
				constructorName: 'MinimalMemory',
				connectionParams: null,
			}),
		} as unknown as BuiltMemory;

		expect(() =>
			new Memory().storage(minimalBackend).observationalMemory({ observe }).build(),
		).toThrow(/BuiltObservationStore/);
	});

	it('coexists with workingMemory', () => {
		const config = new Memory().freeform('# Notes').observationalMemory({ observe }).build();

		expect(config.workingMemory).toBeDefined();
		expect(config.observationalMemory).toBeDefined();
	});

	describe('agent.snapshot.hasObservationalMemory', () => {
		it('is false when no memory is configured', () => {
			const agent = new Agent('a').model('openai/gpt-4o-mini');
			expect(agent.snapshot.hasObservationalMemory).toBe(false);
		});

		it('is false when memory is configured without observational block', () => {
			const memory = new Memory();
			const agent = new Agent('a').model('openai/gpt-4o-mini').memory(memory);
			expect(agent.snapshot.hasObservationalMemory).toBe(false);
		});

		it('is true when observationalMemory is configured', () => {
			const memory = new Memory().observationalMemory({ observe });
			const agent = new Agent('a').model('openai/gpt-4o-mini').memory(memory);
			expect(agent.snapshot.hasObservationalMemory).toBe(true);
		});
	});
});
