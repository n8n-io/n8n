import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiThreadSummary } from '@n8n/api-types';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useInstanceAiStore } from '../../instanceAi.store';
import RunTargetChip from '../RunTargetChip.vue';

const THREAD_ID = 'thread-1';
const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';

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

describe('RunTargetChip', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('names the linked instance of a chat that runs there', () => {
		mockedStore(useInstanceAiStore).threads = [
			summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } }),
		];

		const { getByTestId } = renderComponent(RunTargetChip);

		expect(getByTestId('instance-ai-run-target-chip')).toHaveTextContent('Runs in Office');
	});

	it.each([
		['the chat runs on this computer', summary({ runTarget: { kind: 'local' } })],
		['the chat has no stored target yet', summary()],
		[
			'the chat is shared, so it runs here',
			summary({
				runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' },
				sharedWith: { projectId: 'project-1', projectName: 'Sales' },
			}),
		],
	])('shows no chip when %s', (_case, chat) => {
		mockedStore(useInstanceAiStore).threads = [chat];

		const { queryByTestId } = renderComponent(RunTargetChip);

		expect(queryByTestId('instance-ai-run-target-chip')).not.toBeInTheDocument();
	});

	it('reads the chat from the history when the sidebar does not hold it', () => {
		mockedStore(useInstanceAiStore).threadHistory = {
			threads: [summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } })],
		} as unknown as ReturnType<typeof useInstanceAiStore>['threadHistory'];

		const { getByTestId } = renderComponent(RunTargetChip);

		expect(getByTestId('instance-ai-run-target-chip')).toHaveTextContent('Runs in Office');
	});
});
