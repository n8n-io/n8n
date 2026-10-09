import { describe, expect, it, vi } from 'vitest';
import type { InstanceAiThreadSummary } from '@n8n/api-types';

import { createLostRunTargetDismissals } from '../lostRunTargetDismissals';

const OFFICE = { name: 'Office' };

function copy(id: string, lostRunTarget?: { name: string }): InstanceAiThreadSummary {
	return {
		id,
		title: 'Weekly report',
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...(lostRunTarget ? { lostRunTarget } : {}),
	};
}

/** A sidebar copy and a history copy of each thread, as the store holds them. */
function setUp(acknowledge = vi.fn(async (_threadId: string) => {})) {
	const copies = [copy('t-1', OFFICE), copy('t-1', OFFICE), copy('t-2', { name: 'Cloud' })];
	const localCopies = (threadId: string) => copies.filter(({ id }) => id === threadId);
	return { copies, acknowledge, ...createLostRunTargetDismissals(localCopies, acknowledge) };
}

describe('createLostRunTargetDismissals', () => {
	it('shows the lost link of a thread that the owner did not dismiss', () => {
		const { visible } = setUp();

		expect(visible({ id: 't-1', lostRunTarget: OFFICE })).toEqual(OFFICE);
		expect(visible({ id: 't-1' })).toBeUndefined();
	});

	it('hides the notice in every local copy of the thread at once, and tells the server', async () => {
		const { copies, acknowledge, dismiss } = setUp();

		const dismissing = dismiss('t-1');

		expect(copies[0].lostRunTarget).toBeUndefined();
		expect(copies[1].lostRunTarget).toBeUndefined();
		await dismissing;
		expect(acknowledge).toHaveBeenCalledWith('t-1');
	});

	it('leaves the notices of other threads alone', async () => {
		const { copies, visible, dismiss } = setUp();

		await dismiss('t-1');

		expect(copies[2].lostRunTarget).toEqual({ name: 'Cloud' });
		expect(visible({ id: 't-2', lostRunTarget: { name: 'Cloud' } })).toEqual({ name: 'Cloud' });
	});

	it('hides the lost link from a server copy that a read fetched before the dismissal', async () => {
		const { visible, dismiss } = setUp();

		await dismiss('t-1');

		expect(visible({ id: 't-1', lostRunTarget: OFFICE })).toBeUndefined();
	});

	it('brings the notice back in every copy when the server request fails', async () => {
		const { copies, visible, dismiss } = setUp(
			vi.fn(async () => {
				throw new Error('network down');
			}),
		);

		await expect(dismiss('t-1')).resolves.toBeUndefined();

		expect(copies[0].lostRunTarget).toEqual(OFFICE);
		expect(copies[1].lostRunTarget).toEqual(OFFICE);
		expect(visible({ id: 't-1', lostRunTarget: OFFICE })).toEqual(OFFICE);
	});

	it('does not overwrite a lost link that a copy holds again when it brings the notice back', async () => {
		let failRequest: (error: Error) => void = () => {};
		const { copies, dismiss } = setUp(
			vi.fn(
				async () =>
					await new Promise<void>((_resolve, reject) => {
						failRequest = reject;
					}),
			),
		);

		const dismissing = dismiss('t-1');
		copies[0].lostRunTarget = { name: 'Office (renamed)' };
		failRequest(new Error('network down'));
		await dismissing;

		expect(copies[0].lostRunTarget).toEqual({ name: 'Office (renamed)' });
		expect(copies[1].lostRunTarget).toEqual(OFFICE);
	});

	it('dismisses a thread without a local copy without an error', async () => {
		const { acknowledge, visible, dismiss } = setUp();

		await dismiss('t-unknown');

		expect(acknowledge).toHaveBeenCalledWith('t-unknown');
		expect(visible({ id: 't-unknown', lostRunTarget: OFFICE })).toBeUndefined();
	});
});
