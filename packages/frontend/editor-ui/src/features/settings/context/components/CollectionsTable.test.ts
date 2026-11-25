import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { useRBACStore } from '@n8n/stores/rbac.store';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import CollectionsTable from './CollectionsTable.vue';

function collection(overrides: Partial<KnowledgeCollectionDto> = {}): KnowledgeCollectionDto {
	return {
		id: 'c1',
		name: 'Customer support',
		description: 'Refunds and pricing',
		slug: 'customer-support',
		homeProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
		fileCount: 0,
		totalFileSizeBytes: 0,
		agentCount: 0,
		createdAt: '2026-11-01T00:00:00.000Z',
		updatedAt: '2026-11-01T00:00:00.000Z',
		...overrides,
	};
}

const renderTable = createComponentRenderer(CollectionsTable);

function render(collections: KnowledgeCollectionDto[], showEmpty = false) {
	return renderTable({ props: { collections, loading: false, showEmpty } });
}

async function openActions(row: HTMLElement) {
	await userEvent.click(within(row).getByTestId('collection-row-actions').querySelector('button')!);
}

function menuItem(action: 'edit' | 'delete') {
	return document.querySelector(`[data-test-id="action-${action}"]`);
}

function menuLabels() {
	return Array.from(document.querySelectorAll('[role="menuitem"]')).map((item) =>
		item.textContent?.trim(),
	);
}

describe('CollectionsTable', () => {
	beforeEach(() => {
		createTestingPinia({
			initialState: {
				[STORES.PROJECTS]: {
					personalProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
					myProjects: [
						{
							id: 'team-1',
							name: 'Support team',
							type: 'team',
							icon: { type: 'icon', value: 'bot' },
							// Project admins and editors both hold `agent:update`.
							scopes: ['agent:read', 'agent:update'],
						},
						{
							id: 'team-viewer',
							name: 'Viewers only',
							type: 'team',
							scopes: ['agent:read'],
						},
					],
				},
			},
		});
	});

	it('shows the column titles', () => {
		const { getByTestId } = render([collection()]);
		const table = getByTestId('collections-table');

		expect(table).toHaveTextContent('Collection');
		expect(table).toHaveTextContent('Project');
		expect(table).toHaveTextContent('Contents');
		expect(table).toHaveTextContent('Agents');
		expect(table).toHaveTextContent('Last updated');
	});

	it('shows the name and the description of each collection in the order it gets them', () => {
		// A sort by name or by update time would put the second row first.
		const { getAllByTestId } = render([
			collection({
				id: 'b',
				name: 'Zeta guide',
				description: 'First from the server',
				updatedAt: '2026-01-01T00:00:00.000Z',
			}),
			collection({
				id: 'a',
				name: 'Alpha guide',
				description: 'Second from the server',
				updatedAt: '2026-06-01T00:00:00.000Z',
			}),
		]);

		const names = getAllByTestId('collection-name').map((cell) => cell.textContent?.trim());
		const descriptions = getAllByTestId('collection-description').map((cell) =>
			cell.textContent?.trim(),
		);
		expect(names).toEqual(['Zeta guide', 'Alpha guide']);
		expect(descriptions).toEqual(['First from the server', 'Second from the server']);
	});

	it('names the project of each collection', () => {
		const { getAllByTestId } = render([
			collection({
				id: 'own',
				homeProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
			}),
			collection({
				id: 'other',
				homeProject: { id: 'personal-2', name: 'Jane Doe <jane@acme.com>', type: 'personal' },
			}),
			collection({
				id: 'team',
				homeProject: { id: 'team-1', name: 'Support team', type: 'team' },
			}),
		]);

		const chips = getAllByTestId('collection-project');
		expect(chips[0]).toHaveTextContent(/^Personal$/);
		expect(chips[0].querySelector('[data-icon="user"]')).not.toBeNull();
		expect(chips[1]).toHaveTextContent(/^Jane Doe$/);
		expect(chips[1].querySelector('[data-icon="user"]')).not.toBeNull();
		expect(chips[2]).toHaveTextContent(/^Support team$/);
		expect(chips[2].querySelector('[data-icon="bot"]')).not.toBeNull();
	});

	it('shows the default project icon for a team project the user has not loaded', () => {
		const { getByTestId } = render([
			collection({ homeProject: { id: 'team-2', name: 'Sales', type: 'team' } }),
		]);

		const chip = getByTestId('collection-project');
		expect(chip).toHaveTextContent('Sales');
		expect(chip.querySelector('[data-icon="layers"]')).not.toBeNull();
	});

	it.each([
		[0, 'Empty'],
		[1, '1 file'],
		[12, '12 files'],
	])('shows %i files as "%s"', (fileCount, expected) => {
		const { getByTestId } = render([collection({ fileCount })]);

		expect(getByTestId('collection-contents')).toHaveTextContent(new RegExp(`^${expected}$`));
	});

	it.each([
		[0, '—'],
		[1, '1'],
		[3, '3'],
	])('shows %i agents as "%s"', (agentCount, expected) => {
		const { getByTestId } = render([collection({ agentCount })]);

		expect(getByTestId('collection-agents')).toHaveTextContent(new RegExp(`^${expected}$`));
	});

	it('shows when each collection was last updated', () => {
		const { getByTestId } = render([collection()]);

		expect(getByTestId('collection-updated-at')).not.toBeEmptyDOMElement();
	});

	// The data table renders its cover row whenever the slot exists, so an always-on
	// slot would leave a blank row above the data.
	it('renders no cover row while rows are shown', () => {
		const { container } = render([collection()]);

		expect(container.querySelector('td.cover')).toBeNull();
	});

	it('renders the empty slot in the cover row only when asked for the empty state', () => {
		const { container, getByTestId } = renderTable({
			props: { collections: [], loading: false, showEmpty: true },
			slots: { empty: '<div data-test-id="stub-empty">No collections yet</div>' },
		});

		expect(container.querySelector('td.cover')).not.toBeNull();
		expect(getByTestId('stub-empty')).toBeInTheDocument();
	});

	it('shows no pager', () => {
		const rows = Array.from({ length: 30 }, (_, index) => collection({ id: `c${index}` }));
		const { container } = render(rows);

		expect(container.querySelector('.table-pagination')).toBeNull();
	});

	describe('row menu', () => {
		const editable = collection({
			id: 'editable',
			homeProject: { id: 'team-1', name: 'Support team', type: 'team' },
		});
		const readOnly = collection({
			id: 'read-only',
			name: 'Brand guidelines',
			homeProject: { id: 'team-viewer', name: 'Viewers only', type: 'team' },
		});

		it('offers Edit and Delete on a row the user can change', async () => {
			const { getByTestId } = render([editable]);

			await openActions(getByTestId('collections-table'));

			await waitFor(() => expect(menuItem('edit')).toBeInTheDocument());
			expect(menuLabels()).toEqual(['Edit', 'Delete']);
		});

		it('shows no menu on a row of a project where the user is a viewer', () => {
			const { getAllByTestId } = render([editable, readOnly]);
			const rowOf = (name: string) =>
				getAllByTestId('collection-name')
					.find((cell) => cell.textContent?.trim() === name)!
					.closest('tr')!;

			expect(within(rowOf('Customer support')).getByTestId('collection-row-actions')).toBeVisible();
			expect(within(rowOf('Brand guidelines')).queryByTestId('collection-row-actions')).toBeNull();
		});

		it('gives the row menu a name for screen readers', () => {
			const { getByTestId } = render([editable]);

			expect(
				within(getByTestId('collection-row-actions')).getByRole('button', { name: 'More actions' }),
			).toBeVisible();
		});

		it('shows the menu on every row to a user with the global scope', () => {
			mockedStore(useRBACStore).hasScope.mockImplementation((scope) => scope === 'agent:update');
			const { getAllByTestId } = render([
				editable,
				readOnly,
				collection({
					id: 'other',
					homeProject: { id: 'team-2', name: 'Sales', type: 'team' },
				}),
			]);

			expect(getAllByTestId('collection-row-actions')).toHaveLength(3);
		});

		it('emits edit and delete with the collection of the row', async () => {
			const { getByTestId, emitted } = render([editable]);

			await openActions(getByTestId('collections-table'));
			await waitFor(() => expect(menuItem('edit')).toBeInTheDocument());
			await userEvent.click(menuItem('edit')!);

			await openActions(getByTestId('collections-table'));
			await waitFor(() => expect(menuItem('delete')).toBeInTheDocument());
			await userEvent.click(menuItem('delete')!);

			expect(emitted('edit')).toEqual([[editable]]);
			expect(emitted('delete')).toEqual([[editable]]);
		});

		it('does not open the row when the user clicks its menu', async () => {
			const { getByTestId, emitted } = render([editable]);

			await openActions(getByTestId('collections-table'));
			await waitFor(() => expect(menuItem('edit')).toBeInTheDocument());
			await userEvent.click(menuItem('edit')!);

			expect(emitted('open')).toBeUndefined();
		});
	});

	describe('row click', () => {
		it('emits open with the collection of the clicked row', async () => {
			const first = collection({ id: 'first', name: 'Customer support' });
			const second = collection({ id: 'second', name: 'Brand guidelines' });
			const { getAllByTestId, emitted } = render([first, second]);

			await userEvent.click(getAllByTestId('collection-name')[1]);

			expect(emitted('open')).toEqual([[second]]);
		});

		it('opens a row that the user cannot change', async () => {
			const readOnly = collection({
				homeProject: { id: 'team-viewer', name: 'Viewers only', type: 'team' },
			});
			const { getByTestId, emitted } = render([readOnly]);

			await userEvent.click(getByTestId('collection-updated-at'));

			expect(emitted('open')).toEqual([[readOnly]]);
		});

		it('opens a collection from the keyboard', async () => {
			const first = collection();
			const { getByRole, emitted } = render([first]);

			getByRole('button', { name: 'Customer support' }).focus();
			await userEvent.keyboard('{Enter}');

			expect(emitted('open')).toEqual([[first]]);
		});
	});
});
