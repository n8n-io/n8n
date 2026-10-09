import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { LINKED_INSTANCES_MODULE_ID } from '@/features/linkedInstances/linkedInstances.constants';

import { useInstanceAiStore } from '../../instanceAi.store';
import RunTargetChip from '../RunTargetChip.vue';

const THREAD_ID = 'thread-1';
const OFFICE_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';

/** Turns the linked-instances module on or off for the chip. */
function setLinkedInstancesModule(active: boolean) {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules: active ? [LINKED_INSTANCES_MODULE_ID] : [],
	} as typeof settingsStore.settings;
}

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
		// The module check is a store function, which the default testing Pinia would stub.
		createTestingPinia({ stubActions: false });
		setLinkedInstancesModule(true);
	});

	it('names the linked instance of a chat that runs there', () => {
		mockedStore(useInstanceAiStore).threads = [
			summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } }),
		];

		const { getByTestId } = renderComponent(RunTargetChip);

		expect(getByTestId('instance-ai-run-target-chip')).toHaveTextContent('Runs in Office');
	});

	it('shows no chip while the linked-instances module is off, although the chat keeps its link', () => {
		setLinkedInstancesModule(false);
		mockedStore(useInstanceAiStore).threads = [
			summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } }),
		];

		const { queryByTestId } = renderComponent(RunTargetChip);

		expect(queryByTestId('instance-ai-run-target-chip')).not.toBeInTheDocument();
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

	it('lets the keyboard reach the chip and shows its explanation on focus', async () => {
		mockedStore(useInstanceAiStore).threads = [
			summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } }),
		];

		const { getByTestId, findByTestId } = renderComponent(RunTargetChip);
		const chip = getByTestId('instance-ai-run-target-chip');
		expect(chip).toHaveAttribute('tabindex', '0');

		await userEvent.tab();

		expect(chip).toHaveFocus();
		expect(await findByTestId('tooltip-content', {}, { timeout: 3000 })).toHaveTextContent(
			'Chosen when this chat started. To run a workflow somewhere else, move it.',
		);
	});

	it('gives screen readers the explanation with the name of the chip', () => {
		mockedStore(useInstanceAiStore).threads = [
			summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } }),
		];

		const { getByTestId } = renderComponent(RunTargetChip);

		expect(getByTestId('instance-ai-run-target-chip').textContent).toBe(
			'Runs in OfficeChosen when this chat started. To run a workflow somewhere else, move it.',
		);
	});

	it('reads the chat from the history when the sidebar does not hold it', () => {
		mockedStore(useInstanceAiStore).threadHistory = {
			threads: [summary({ runTarget: { kind: 'linked', instanceId: OFFICE_ID, name: 'Office' } })],
		} as unknown as ReturnType<typeof useInstanceAiStore>['threadHistory'];

		const { getByTestId } = renderComponent(RunTargetChip);

		expect(getByTestId('instance-ai-run-target-chip')).toHaveTextContent('Runs in Office');
	});
});
