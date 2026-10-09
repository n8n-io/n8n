import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { InstanceAiThreadSummary } from '@n8n/api-types';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useInstanceAiStore } from '../../instanceAi.store';
import RunTargetLostNotice from '../RunTargetLostNotice.vue';

const THREAD_ID = 'thread-1';
const LOST_NOTICE =
	"This chat runs in Office, which isn't linked any more. Link it again in Settings, or start a new chat.";

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

describe('RunTargetLostNotice', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('tells the owner that the chat runs here, because its linked instance is no longer linked', () => {
		mockedStore(useInstanceAiStore).threads = [summary({ lostRunTarget: { name: 'Office' } })];

		const { getByTestId } = renderComponent(RunTargetLostNotice);

		expect(getByTestId('instance-ai-run-target-lost-notice')).toHaveTextContent(LOST_NOTICE);
	});

	it('is a status message, so a screen reader announces it', () => {
		mockedStore(useInstanceAiStore).threads = [summary({ lostRunTarget: { name: 'Office' } })];

		const { getByRole } = renderComponent(RunTargetLostNotice);

		expect(getByRole('status')).toHaveTextContent(LOST_NOTICE);
	});

	it('does not acknowledge the notice when it shows, so a later read of the chat still returns it', () => {
		const store = mockedStore(useInstanceAiStore);
		store.threads = [summary({ lostRunTarget: { name: 'Office' } })];

		renderComponent(RunTargetLostNotice);

		expect(store.acknowledgeLostRunTarget).not.toHaveBeenCalled();
	});

	it('acknowledges the notice when the owner dismisses it, and asks the parent to move the focus', async () => {
		const store = mockedStore(useInstanceAiStore);
		store.threads = [summary({ lostRunTarget: { name: 'Office' } })];

		const { getByRole, emitted } = renderComponent(RunTargetLostNotice);
		await userEvent.click(getByRole('button', { name: 'Dismiss' }));

		expect(store.acknowledgeLostRunTarget).toHaveBeenCalledTimes(1);
		expect(store.acknowledgeLostRunTarget).toHaveBeenCalledWith(THREAD_ID);
		expect(emitted('dismissed')).toHaveLength(1);
	});

	it('lets a keyboard user dismiss the notice', async () => {
		const store = mockedStore(useInstanceAiStore);
		store.threads = [summary({ lostRunTarget: { name: 'Office' } })];

		const { getByTestId } = renderComponent(RunTargetLostNotice);
		await userEvent.tab();

		expect(getByTestId('instance-ai-run-target-lost-notice-dismiss')).toHaveFocus();
		await userEvent.keyboard('{Enter}');

		expect(store.acknowledgeLostRunTarget).toHaveBeenCalledWith(THREAD_ID);
	});

	it('shows nothing and acknowledges nothing for a chat that never lost its link', () => {
		const store = mockedStore(useInstanceAiStore);
		store.threads = [summary()];

		const { queryByTestId, queryByRole } = renderComponent(RunTargetLostNotice);

		expect(queryByTestId('instance-ai-run-target-lost-notice')).not.toBeInTheDocument();
		expect(queryByRole('status')).not.toBeInTheDocument();
		expect(store.acknowledgeLostRunTarget).not.toHaveBeenCalled();
	});

	it('reads the lost link from the history when the sidebar does not hold the chat', () => {
		mockedStore(useInstanceAiStore).threadHistory = {
			threads: [summary({ lostRunTarget: { name: 'Office' } })],
		} as unknown as ReturnType<typeof useInstanceAiStore>['threadHistory'];

		const { getByTestId } = renderComponent(RunTargetLostNotice);

		expect(getByTestId('instance-ai-run-target-lost-notice')).toHaveTextContent(LOST_NOTICE);
	});
});
