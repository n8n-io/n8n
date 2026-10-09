import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiThreadSummary } from '@n8n/api-types';

import { mockedStore } from '@/__tests__/utils';

import { useInstanceAiStore } from '../../instanceAi.store';
import { useMessageRunTarget } from '../useMessageRunTarget';

const THREAD_ID = 'thread-1';
const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const OFFICE = { kind: 'linked', instanceId: OFFICE_ID } as const;

vi.mock('../../instanceAi.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../instanceAi.store')>()),
	useThread: () => ({ id: THREAD_ID }),
}));

function summary(overrides: Partial<InstanceAiThreadSummary> = {}): InstanceAiThreadSummary {
	return {
		id: THREAD_ID,
		title: 'Weekly report',
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

describe('useMessageRunTarget', () => {
	let refreshThread: Mock<() => Promise<void>>;

	beforeEach(() => {
		createTestingPinia();
		mockedStore(useInstanceAiStore).threads = [summary()];
		refreshThread = vi.fn(async () => {});
	});

	it('sends no run target when no opener chose one', () => {
		const { forNextMessage } = useMessageRunTarget(refreshThread);

		expect(forNextMessage()).toBeUndefined();
	});

	it('sends the target of an opener with every message until the chat accepts one', () => {
		const { remember, forNextMessage, accepted } = useMessageRunTarget(refreshThread);

		remember(OFFICE);

		expect(forNextMessage()).toEqual(OFFICE);
		// The opener failed, so the composer sends the text again with the same choice.
		expect(forNextMessage()).toEqual(OFFICE);

		accepted({ runTarget: OFFICE });

		expect(forNextMessage()).toBeUndefined();
	});

	it('keeps the target of an opener when a later send names none', () => {
		const { remember, forNextMessage } = useMessageRunTarget(refreshThread);

		remember(OFFICE);
		remember(undefined);

		expect(forNextMessage()).toEqual(OFFICE);
	});

	it('reads the chat when the accepted message chose a linked instance, so the chip shows', () => {
		const { accepted } = useMessageRunTarget(refreshThread);

		accepted({ runTarget: OFFICE });

		expect(refreshThread).toHaveBeenCalledOnce();
	});

	it('reads the chat when a message is accepted in a linked chat, because it can drop the link', () => {
		mockedStore(useInstanceAiStore).threads = [
			summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } }),
		];
		const { accepted } = useMessageRunTarget(refreshThread);

		accepted({});

		expect(refreshThread).toHaveBeenCalledOnce();
	});

	it.each([
		['a message without a target', {}],
		['a message that chose this computer', { runTarget: { kind: 'local' } }],
		['a message with a target that is not valid', { runTarget: { kind: 'linked' } }],
	])('does not read a chat that runs here again for %s', (_label, hostContext) => {
		mockedStore(useInstanceAiStore).threads = [summary({ runTarget: { kind: 'local' } })];
		const { accepted } = useMessageRunTarget(refreshThread);

		accepted(hostContext);

		expect(refreshThread).not.toHaveBeenCalled();
	});
});
