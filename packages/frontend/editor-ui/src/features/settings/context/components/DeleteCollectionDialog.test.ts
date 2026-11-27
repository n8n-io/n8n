import type { KnowledgeCollectionAgentDto, KnowledgeCollectionDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useCollectionsStore } from '@/features/settings/context/collections.store';

import DeleteCollectionDialog from './DeleteCollectionDialog.vue';

const showError = vi.fn();
const showMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

// N8nDialog teleports out of the tree (Reka UI's DialogPortal), so replace it with a
// render-inline pass-through that keeps the header and the close button of the title row.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		// Boolean, so the bare `open` attribute of the dialog counts as open.
		props: { open: Boolean, header: String },
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog">
				<h2>{{ header }}</h2>
				<button data-test-id="dialog-close" @click="$emit('update:open', false)" />
				<slot />
			</div>
		`,
	};
	return { ...actual, N8nDialog };
});

function collection(overrides: Partial<KnowledgeCollectionDto> = {}): KnowledgeCollectionDto {
	return {
		id: 'c1',
		name: 'Customer support',
		description: 'Refunds and pricing',
		slug: 'customer-support',
		homeProject: { id: 'team-1', name: 'Support team', type: 'team' },
		fileCount: 3,
		totalFileSizeBytes: 100,
		agentCount: 0,
		createdAt: '2026-11-01T00:00:00.000Z',
		updatedAt: '2026-11-01T00:00:00.000Z',
		...overrides,
	};
}

function agentsNamed(names: string[]): KnowledgeCollectionAgentDto[] {
	return names.map((name, index) => ({ id: `agent-${index + 1}`, name, projectId: 'team-1' }));
}

const renderDialog = createComponentRenderer(DeleteCollectionDialog);

let collectionsStore: MockedStore<typeof useCollectionsStore>;

describe('DeleteCollectionDialog', () => {
	beforeEach(() => {
		createTestingPinia();
		collectionsStore = mockedStore(useCollectionsStore);
		collectionsStore.deleteCollection.mockResolvedValue(undefined);
		// The agent names stay pending unless a test resolves them.
		collectionsStore.listCollectionAgents.mockReturnValue(
			createDeferredPromise<KnowledgeCollectionAgentDto[]>().promise,
		);
		showError.mockReset();
		showMessage.mockReset();
	});

	it('names the collection and says what the delete removes', () => {
		const { getByTestId } = renderDialog({ props: { collection: collection() } });
		const dialog = getByTestId('collection-delete-dialog');

		expect(dialog).toHaveTextContent('Delete Customer support?');
		expect(dialog).toHaveTextContent(
			'This deletes the collection and everything in it, for every project it is shared with.',
		);
		expect(getByTestId('collection-delete-cancel')).toHaveTextContent('Cancel');
		expect(getByTestId('collection-delete-confirm')).toHaveTextContent('Delete collection');
	});

	it.each([
		[1, '1 agent uses this collection and will stop answering from it.'],
		[2, '2 agents use this collection and will stop answering from it.'],
	])(
		'warns that %i agents stop answering from the collection while their names load',
		(agentCount, expected) => {
			const { getByTestId, queryByTestId } = renderDialog({
				props: { collection: collection({ agentCount }) },
			});

			expect(getByTestId('collection-delete-agents-warning')).toHaveTextContent(expected);
			expect(queryByTestId('collection-delete-no-agents')).toBeNull();
		},
	);

	it.each([
		{
			count: 1,
			names: ['Support agent'],
			expected: '1 agent uses this collection and will stop answering from it: Support agent.',
		},
		{
			count: 2,
			names: ['FirstClassDarwin', 'Support agent'],
			expected:
				'2 agents use this collection and will stop answering from it: FirstClassDarwin, Support agent.',
		},
		{
			count: 5,
			names: ['Ada', 'Billing', 'Darwin', 'Escalations', 'Support agent'],
			expected:
				'5 agents use this collection and will stop answering from it: Ada, Billing, Darwin, Escalations, Support agent.',
		},
	])('names the $count agents inline in the warning', async ({ count, names, expected }) => {
		collectionsStore.listCollectionAgents.mockResolvedValue(agentsNamed(names));
		const { getByTestId, queryByTestId } = renderDialog({
			props: { collection: collection({ agentCount: count }) },
		});

		await waitFor(() =>
			expect(getByTestId('collection-delete-agents-warning')).toHaveTextContent(expected),
		);
		expect(collectionsStore.listCollectionAgents).toHaveBeenCalledWith('team-1', 'c1');
		expect(queryByTestId('collection-delete-agents-trigger')).toBeNull();
	});

	it('names the agents that the parent passes, without loading them again', () => {
		const { getByTestId } = renderDialog({
			props: {
				collection: collection({ agentCount: 2 }),
				agents: agentsNamed(['FirstClassDarwin', 'Support agent']),
			},
		});

		expect(getByTestId('collection-delete-agents-warning')).toHaveTextContent(
			'2 agents use this collection and will stop answering from it: FirstClassDarwin, Support agent.',
		);
		expect(collectionsStore.listCollectionAgents).not.toHaveBeenCalled();
	});

	it('lists more than 5 agents as text in a tooltip that the count opens from the keyboard', async () => {
		const names = ['Support agent', 'Support agent', '<b>x</b>', 'Ada', 'Billing', 'Darwin'];
		collectionsStore.listCollectionAgents.mockResolvedValue(agentsNamed(names));
		const { findByTestId, getByTestId } = renderDialog({
			props: { collection: collection({ agentCount: 6 }) },
		});

		const trigger = await findByTestId('collection-delete-agents-trigger');
		const warning = getByTestId('collection-delete-agents-warning');
		expect(warning).toHaveTextContent(
			'6 agents use this collection and will stop answering from it.',
		);
		expect(warning).not.toHaveTextContent('Support agent');

		// The dialog stub renders its close button before the body.
		await userEvent.tab();
		await userEvent.tab();

		expect(trigger).toHaveFocus();
		const tooltip = await screen.findByTestId('tooltip-content');
		const list = within(tooltip).getByTestId('collection-delete-agents-list');
		expect(within(list).getAllByRole('listitem')).toHaveLength(6);
		expect(list.querySelector('b')).toBeNull();

		const description = document.getElementById(trigger.getAttribute('aria-describedby') ?? '');
		expect(description).toHaveTextContent(
			'Support agent, Support agent, <b>x</b>, Ada, Billing, Darwin',
		);
	});

	it('shows the count and still deletes when the names cannot load', async () => {
		collectionsStore.listCollectionAgents.mockRejectedValue(new Error('offline'));
		const target = collection({ agentCount: 2 });
		const { getByTestId, emitted } = renderDialog({ props: { collection: target } });

		await flushPromises();

		expect(getByTestId('collection-delete-agents-warning')).toHaveTextContent(
			'2 agents use this collection and will stop answering from it.',
		);

		await userEvent.click(getByTestId('collection-delete-confirm'));

		expect(collectionsStore.deleteCollection).toHaveBeenCalledWith('team-1', 'c1');
		await waitFor(() => expect(emitted('deleted')).toEqual([[target]]));
		expect(showError).not.toHaveBeenCalled();
	});

	it.each<{ list: string; names: string[] }>([
		{ list: 'fewer names than the count', names: ['Support agent'] },
		{ list: 'more names than the count', names: ['Ada', 'Billing', 'Support agent'] },
		{ list: 'no names', names: [] },
	])('keeps the count-only text when the loaded list has $list', async ({ names }) => {
		collectionsStore.listCollectionAgents.mockResolvedValue(agentsNamed(names));
		const { getByTestId } = renderDialog({
			props: { collection: collection({ agentCount: 2 }) },
		});

		await flushPromises();

		expect(collectionsStore.listCollectionAgents).toHaveBeenCalledWith('team-1', 'c1');
		const warning = getByTestId('collection-delete-agents-warning');
		expect(warning).toHaveTextContent(
			'2 agents use this collection and will stop answering from it.',
		);
		expect(warning).not.toHaveTextContent('Support agent');
	});

	it('says that no agents use the collection, with no warning', () => {
		const { getByTestId, queryByTestId } = renderDialog({
			props: { collection: collection({ agentCount: 0 }) },
		});

		expect(getByTestId('collection-delete-no-agents')).toHaveTextContent(
			'No agents use this collection.',
		);
		expect(queryByTestId('collection-delete-agents-warning')).toBeNull();
		expect(collectionsStore.listCollectionAgents).not.toHaveBeenCalled();
	});

	it('deletes the collection in its home project, then reports the delete', async () => {
		// The agent names are still loading, so the delete does not wait for them.
		const target = collection({ agentCount: 2 });
		const { getByTestId, emitted } = renderDialog({ props: { collection: target } });

		await userEvent.click(getByTestId('collection-delete-confirm'));

		expect(collectionsStore.deleteCollection).toHaveBeenCalledWith('team-1', 'c1');
		await waitFor(() => expect(emitted('deleted')).toEqual([[target]]));
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Collection “Customer support” deleted.',
			type: 'success',
		});
		expect(showError).not.toHaveBeenCalled();
	});

	it('reports a failed delete in a toast and stays open', async () => {
		const failure = new Error('offline');
		collectionsStore.deleteCollection.mockRejectedValue(failure);
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('collection-delete-confirm'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(failure, 'Could not delete collection'),
		);
		expect(emitted('deleted')).toBeUndefined();
		expect(emitted('close')).toBeUndefined();
		expect(showMessage).not.toHaveBeenCalled();
		expect(getByTestId('collection-delete-confirm')).toBeEnabled();
	});

	it('closes without deleting on cancel', async () => {
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('collection-delete-cancel'));

		expect(emitted('close')).toEqual([[]]);
		expect(collectionsStore.deleteCollection).not.toHaveBeenCalled();
	});

	it('closes without deleting from the close button of the dialog', async () => {
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('dialog-close'));

		expect(emitted('close')).toEqual([[]]);
		expect(collectionsStore.deleteCollection).not.toHaveBeenCalled();
	});

	it('shows progress and does not close while the delete runs', async () => {
		const pending = createDeferredPromise<void>();
		collectionsStore.deleteCollection.mockReturnValue(pending.promise);
		const { getByTestId, emitted } = renderDialog({ props: { collection: collection() } });

		await userEvent.click(getByTestId('collection-delete-confirm'));

		expect(getByTestId('collection-delete-confirm')).toBeDisabled();
		expect(getByTestId('collection-delete-cancel')).toBeDisabled();
		await userEvent.click(getByTestId('dialog-close'));
		expect(emitted('close')).toBeUndefined();

		pending.resolve();
		await waitFor(() => expect(emitted('deleted')).toHaveLength(1));
	});
});
