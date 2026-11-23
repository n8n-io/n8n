import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';

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
});
