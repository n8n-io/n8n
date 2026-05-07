import { InMemoryMemory } from '../../runtime/memory-store';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentDbMessage } from '../../types/sdk/message';
import {
	OBSERVATION_SCHEMA_VERSION,
	type NewObservation,
	type ObserveFn,
} from '../../types/sdk/observation';
import { Agent } from '../agent';
import { Memory } from '../memory';

function makeMsg(role: 'user' | 'assistant', text: string): AgentDbMessage {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date(),
		role,
		content: [{ type: 'text', text }],
	};
}

async function seedThread(store: InMemoryMemory, threadId: string): Promise<void> {
	await store.saveThread({ id: threadId, resourceId: 'u-1' });
	await store.saveMessages({
		threadId,
		resourceId: 'u-1',
		messages: [makeMsg('user', 'one'), makeMsg('assistant', 'two')],
	});
}

function makeNewObs(payload: string): NewObservation {
	return {
		scopeKind: 'thread',
		scopeId: 't-1',
		kind: 'observation',
		payload,
		durationMs: null,
		schemaVersion: OBSERVATION_SCHEMA_VERSION,
		createdAt: new Date(),
	};
}

describe('agent.reflect', () => {
	it('returns no-config when observational memory is not configured', async () => {
		const agent = new Agent('a').model('openai/gpt-4o-mini');
		const result = await agent.reflect({ threadId: 't-1', resourceId: 'u-1' });
		expect(result).toEqual({ status: 'no-config' });
	});

	it('runs the cycle with the builder-time observer', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, 't-1');

		const observe = jest
			.fn()
			.mockResolvedValue([makeNewObs('builder-observed')]) as unknown as ObserveFn;
		const memory = new Memory()
			.storage(store)
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe });

		const agent = new Agent('a').model('openai/gpt-4o-mini').instructions('test').memory(memory);
		const result = await agent.reflect({ threadId: 't-1', resourceId: 'u-1' });

		expect(result).toEqual({ status: 'ran', observationsWritten: 1, compacted: false });
		const written = await store.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(written.map((r) => r.payload)).toEqual(['builder-observed']);
	});

	it('lets a call-time observer override the builder default', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, 't-1');

		const builderObserve = jest
			.fn()
			.mockResolvedValue([makeNewObs('builder')]) as unknown as ObserveFn;
		const callObserve = jest.fn().mockResolvedValue([makeNewObs('call')]) as unknown as ObserveFn;
		const memory = new Memory()
			.storage(store)
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe: builderObserve });

		const agent = new Agent('a').model('openai/gpt-4o-mini').instructions('test').memory(memory);
		await agent.reflect({ threadId: 't-1', resourceId: 'u-1', observe: callObserve });

		expect(builderObserve).not.toHaveBeenCalled();
		expect(callObserve).toHaveBeenCalledTimes(1);
	});

	it('skips with lock-held when another holder is on the lock', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, 't-1');
		await store.acquireObservationLock('thread', 't-1', { ttlMs: 60_000, holderId: 'other' });

		const observe = jest.fn().mockResolvedValue([makeNewObs('x')]) as unknown as ObserveFn;
		const memory = new Memory()
			.storage(store)
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory({ observe });

		const agent = new Agent('a').model('openai/gpt-4o-mini').instructions('test').memory(memory);
		const result = await agent.reflect({ threadId: 't-1', resourceId: 'u-1' });

		expect(result).toEqual({ status: 'skipped', reason: 'lock-held' });
		expect(observe).not.toHaveBeenCalled();
	});
});

describe('agent.reflectInBackground', () => {
	it('emits AgentEvent.Error when background setup fails before scheduling the cycle', async () => {
		const store = new InMemoryMemory();
		const errors: string[] = [];
		const memory = new Memory()
			.storage(store)
			.freeform('# Notes')
			.scope('thread')
			.observationalMemory();
		const agent = new Agent('a').model('openai/gpt-4o-mini').memory(memory);
		agent.on(AgentEvent.Error, (event) => {
			if (event.type === AgentEvent.Error) errors.push(event.message);
		});

		agent.reflectInBackground({ threadId: 't-1', resourceId: 'u-1' });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(errors).toEqual(['Agent "a" requires instructions']);
	});
});
