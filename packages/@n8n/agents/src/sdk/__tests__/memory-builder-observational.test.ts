import type { BuiltMemory, BuiltObservationStore, MemoryConfig } from '../../types';
import type { CompactFn, ObserveFn } from '../../types/sdk/observation';
import { Agent } from '../agent';
import { Memory } from '../memory';

describe('Memory builder — observational memory', () => {
	const observe = jest.fn().mockResolvedValue([]) as unknown as ObserveFn;

	const makeObservationBackend = (): BuiltMemory & BuiltObservationStore => {
		const savedThread = {
			id: 'thread-id',
			resourceId: 'resource-id',
			createdAt: new Date(),
			updatedAt: new Date(),
		} satisfies Awaited<ReturnType<BuiltMemory['saveThread']>>;

		return {
			getThread: jest.fn().mockResolvedValue(null),
			saveThread: jest.fn().mockResolvedValue(savedThread),
			deleteThread: jest.fn().mockResolvedValue(undefined),
			getMessages: jest.fn().mockResolvedValue([]),
			saveMessages: jest.fn().mockResolvedValue(undefined),
			deleteMessages: jest.fn().mockResolvedValue(undefined),
			saveWorkingMemory: jest.fn().mockResolvedValue(undefined),
			appendObservations: jest.fn().mockResolvedValue([]),
			getObservations: jest.fn().mockResolvedValue([]),
			getMessagesForScope: jest.fn().mockResolvedValue([]),
			deleteObservations: jest.fn().mockResolvedValue(undefined),
			getCursor: jest.fn().mockResolvedValue(null),
			setCursor: jest.fn().mockResolvedValue(undefined),
			acquireObservationLock: jest.fn().mockResolvedValue(null),
			releaseObservationLock: jest.fn().mockResolvedValue(undefined),
			describe: () => ({
				name: 'observation',
				constructorName: 'ObservationMemory',
				connectionParams: null,
			}),
		} as BuiltMemory & BuiltObservationStore;
	};

	const getMemoryConfig = (agent: Agent): MemoryConfig | undefined =>
		(agent as unknown as { memoryConfig?: MemoryConfig }).memoryConfig;

	it('omits observationalMemory when not configured', () => {
		const config = new Memory().build();
		expect(config.observationalMemory).toBeUndefined();
	});

	it('applies lockTtlMs default', () => {
		const config = new Memory()
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe })
			.build();
		expect(config.observationalMemory?.lockTtlMs).toBe(30_000);
	});

	it('applies trigger, compaction, and gap defaults', () => {
		const config = new Memory()
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe })
			.build();

		expect(config.observationalMemory?.trigger).toEqual({ type: 'per-turn' });
		expect(config.observationalMemory?.compactionThreshold).toBe(5);
		expect(config.observationalMemory?.gapThresholdMs).toBe(60 * 60_000);
	});

	it('respects consumer overrides for lockTtlMs', () => {
		const config = new Memory()
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe, lockTtlMs: 5_000 })
			.build();
		expect(config.observationalMemory?.lockTtlMs).toBe(5_000);
	});

	it('forwards optional fields untouched', () => {
		const compact = jest.fn().mockResolvedValue({ content: '# Notes' }) as unknown as CompactFn;
		const config = new Memory()
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({
				observe,
				compact,
				trigger: { type: 'idle-timer', idleMs: 5 * 60 * 1000, gapThresholdMs: 3600_000 },
				compactionThreshold: 25,
				gapThresholdMs: 30 * 60_000,
				observerPrompt: 'Observe.',
				compactorPrompt: 'Compact.',
				sync: true,
			})
			.build();

		expect(config.observationalMemory?.observe).toBe(observe);
		expect(config.observationalMemory?.compact).toBe(compact);
		expect(config.observationalMemory?.compactionThreshold).toBe(25);
		expect(config.observationalMemory?.trigger).toEqual({
			type: 'idle-timer',
			idleMs: 5 * 60 * 1000,
			gapThresholdMs: 3600_000,
		});
		expect(config.observationalMemory?.gapThresholdMs).toBe(30 * 60_000);
		expect(config.observationalMemory?.observerPrompt).toBe('Observe.');
		expect(config.observationalMemory?.compactorPrompt).toBe('Compact.');
		expect(config.observationalMemory?.sync).toBe(true);
	});

	it('uses idle-timer trigger gapThresholdMs when no top-level override is set', () => {
		const config = new Memory()
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({
				observe,
				trigger: { type: 'idle-timer', idleMs: 5 * 60 * 1000, gapThresholdMs: 45 * 60_000 },
			})
			.build();

		expect(config.observationalMemory?.gapThresholdMs).toBe(45 * 60_000);
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
			new Memory()
				.storage(minimalBackend)
				.freeform('# Notes')
				.scope('thread')
				.observationalMemory({ observe })
				.build(),
		).toThrow(/BuiltObservationStore/);
	});

	it('rejects partial observation backends before runtime cycles can use them', () => {
		const partialObservationBackend = {
			getThread: jest.fn().mockResolvedValue(null),
			saveThread: jest.fn().mockResolvedValue({}),
			deleteThread: jest.fn().mockResolvedValue(undefined),
			getMessages: jest.fn().mockResolvedValue([]),
			saveMessages: jest.fn().mockResolvedValue(undefined),
			deleteMessages: jest.fn().mockResolvedValue(undefined),
			saveWorkingMemory: jest.fn().mockResolvedValue(undefined),
			appendObservations: jest.fn().mockResolvedValue([]),
			describe: () => ({
				name: 'partial-observation',
				constructorName: 'PartialObservationMemory',
				connectionParams: null,
			}),
		} as unknown as BuiltMemory;

		expect(() =>
			new Memory()
				.storage(partialObservationBackend)
				.freeform('# Notes')
				.scope('thread')
				.observationalMemory({ observe })
				.build(),
		).toThrow(/BuiltObservationStore/);
	});

	it('requires workingMemory', () => {
		expect(() => new Memory().observationalMemory({ observe }).build()).toThrow(/working memory/);
	});

	it('requires thread-scoped working memory', () => {
		expect(() =>
			new Memory().freeform('# Notes').scope('resource').observationalMemory({ observe }).build(),
		).toThrow(/thread-scoped working memory/);
	});

	it('coexists with workingMemory', () => {
		const config = new Memory()
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe })
			.build();

		expect(config.workingMemory).toBeDefined();
		expect(config.workingMemory?.scope).toBe('thread');
		expect(config.observationalMemory).toBeDefined();
	});

	describe('raw MemoryConfig validation', () => {
		it('requires thread-scoped working memory', () => {
			const config: MemoryConfig = {
				memory: makeObservationBackend(),
				lastMessages: 10,
				workingMemory: { template: '# Notes', structured: false, scope: 'resource' },
				observationalMemory: { observe },
			};

			expect(() =>
				new Agent('a').model('openai/gpt-4o-mini').instructions('test').memory(config),
			).toThrow(/thread-scoped working memory/);
		});

		it('rejects backends that do not implement BuiltObservationStore', () => {
			const minimalBackend = {
				getThread: jest.fn().mockResolvedValue(null),
				saveThread: jest.fn().mockResolvedValue({}),
				deleteThread: jest.fn().mockResolvedValue(undefined),
				getMessages: jest.fn().mockResolvedValue([]),
				saveMessages: jest.fn().mockResolvedValue(undefined),
				deleteMessages: jest.fn().mockResolvedValue(undefined),
				saveWorkingMemory: jest.fn().mockResolvedValue(undefined),
				describe: () => ({
					name: 'minimal',
					constructorName: 'MinimalMemory',
					connectionParams: null,
				}),
			} as unknown as BuiltMemory;
			const config: MemoryConfig = {
				memory: minimalBackend,
				lastMessages: 10,
				workingMemory: { template: '# Notes', structured: false, scope: 'thread' },
				observationalMemory: { observe },
			};

			expect(() =>
				new Agent('a').model('openai/gpt-4o-mini').instructions('test').memory(config),
			).toThrow(/BuiltObservationStore/);
		});

		it('applies observational defaults', () => {
			const rawConfig: MemoryConfig = {
				memory: makeObservationBackend(),
				lastMessages: 10,
				workingMemory: { template: '# Notes', structured: false, scope: 'thread' },
				observationalMemory: {},
			};

			const agent = new Agent('a')
				.model('openai/gpt-4o-mini')
				.instructions('test')
				.memory(rawConfig);
			const config = getMemoryConfig(agent);

			expect(config?.observationalMemory).toMatchObject({
				trigger: { type: 'per-turn' },
				compactionThreshold: 5,
				gapThresholdMs: 60 * 60_000,
				lockTtlMs: 30_000,
			});
			expect(rawConfig.observationalMemory).toEqual({});
		});
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
			const memory = new Memory()
				.freeform('# Notes')
				.scope('thread')
				.observationalMemory({ observe });
			const agent = new Agent('a').model('openai/gpt-4o-mini').memory(memory);
			expect(agent.snapshot.hasObservationalMemory).toBe(true);
		});
	});
});
