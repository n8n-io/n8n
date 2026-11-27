import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import { billingPreview } from '../../__tests__/preview.fixtures';
import { crossProjectMoveBlockers, indexBlockers } from '../../promotionOperation';
import { buildSelectionGraph, resolveInclusion } from '../../promotionPreview.selection';
import { buildPreviewTree } from '../../promotionPreview.tree';
import PromotionResourceTree from './PromotionResourceTree.vue';

const graph = buildSelectionGraph(billingPreview(), 'promote');
const tree = buildPreviewTree(billingPreview(), { workflows: 'workflows', group: (id) => id });
const renderComponent = createComponentRenderer(PromotionResourceTree);

function render(selectedKeys: string[]) {
	const selected = new Set(selectedKeys);
	return renderComponent({
		pinia: createTestingPinia(),
		props: {
			tree,
			graph,
			selected,
			inclusion: resolveInclusion(graph, selected),
			disabled: new Set(),
			locked: false,
			direction: 'promote',
			blockers: indexBlockers([]),
		},
	});
}

const row = (getAllByTestId: (id: string) => HTMLElement[], key: string) => {
	const match = getAllByTestId('promotion-preview-tree-row').find(
		(element) => element.dataset.resourceKey === key,
	);
	if (!match) throw new Error(`No tree row for ${key}`);
	return within(match);
};

describe('PromotionResourceTree', () => {
	it('should show required dependencies as checked and read-only, and unused ones as unchecked', () => {
		const { getAllByTestId } = render(['workflow:w1']);

		const table = row(getAllByTestId, 'dataTable:t1').getByRole('checkbox');
		expect(table).toBeChecked();
		expect(table).toBeDisabled();
		// "Format currency" is a sub-workflow of the selected workflow. Selecting a caller does not include it.
		expect(row(getAllByTestId, 'workflow:w4').getByRole('checkbox')).not.toBeChecked();
	});

	it('should mute the name and icon of a disabled row only, whether it is selected or not', () => {
		const { getAllByTestId } = render(['workflow:w1']);

		const labelOf = (key: string) =>
			getAllByTestId('promotion-preview-tree-row')
				.find((element) => element.dataset.resourceKey === key)
				?.querySelector('button:not([role="checkbox"])');

		expect(labelOf('dataTable:t1')?.className).toContain('muted');
		expect(labelOf('workflow:w4')?.className).not.toContain('muted');
		expect(labelOf('workflow:w1')?.className).not.toContain('muted');
	});

	it('should mute the name of a disabled row that is not selected', () => {
		const selected = new Set<string>();
		const { getAllByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				tree,
				graph,
				selected,
				inclusion: resolveInclusion(graph, selected),
				disabled: new Set(['workflow:w3']),
				locked: false,
				direction: 'promote',
				blockers: indexBlockers([]),
			},
		});

		const buttonOf = (key: string) =>
			getAllByTestId('promotion-preview-tree-row')
				.find((element) => element.dataset.resourceKey === key)
				?.querySelector('button:not([role="checkbox"])');

		expect(row(getAllByTestId, 'workflow:w3').getByRole('checkbox')).not.toBeChecked();
		expect(buttonOf('workflow:w3')?.className).toContain('muted');
		expect(buttonOf('workflow:w2')?.className).not.toContain('muted');
	});

	it('should say "a personal project" in a blocker tooltip, because the server leaves out its name', async () => {
		const base = billingPreview();
		const preview = {
			...base,
			resources: base.resources.map((resource) =>
				resource.key === 'workflow:w2'
					? {
							...resource,
							change: 'deleted' as const,
							movedToProject: { id: 'p9' },
						}
					: resource,
			),
		};
		const movedGraph = buildSelectionGraph(preview, 'promote');
		const { getByTestId, findByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				tree: buildPreviewTree(preview, { workflows: 'workflows', group: (id) => id }),
				graph: movedGraph,
				selected: new Set<string>(),
				inclusion: resolveInclusion(movedGraph, new Set()),
				disabled: new Set(),
				locked: false,
				direction: 'promote',
				blockers: indexBlockers(crossProjectMoveBlockers(movedGraph)),
			},
		});

		await userEvent.hover(getByTestId('promotion-preview-tree-blocker'));

		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			'moved to a personal project on this instance',
		);
	});

	it('should open the reason of a Promote blocker on keyboard focus', async () => {
		const base = billingPreview();
		const preview = {
			...base,
			resources: base.resources.map((resource) =>
				resource.key === 'workflow:w2'
					? {
							...resource,
							change: 'deleted' as const,
							movedToProject: { id: 'p2', name: 'Ops' },
						}
					: resource,
			),
		};
		const movedGraph = buildSelectionGraph(preview, 'promote');
		const { getByTestId, findByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				tree: buildPreviewTree(preview, { workflows: 'workflows', group: (id) => id }),
				graph: movedGraph,
				selected: new Set<string>(),
				inclusion: resolveInclusion(movedGraph, new Set()),
				disabled: new Set(),
				locked: false,
				direction: 'promote',
				blockers: indexBlockers(crossProjectMoveBlockers(movedGraph)),
			},
		});
		const marker = getByTestId('promotion-preview-tree-blocker');

		expect(marker).toHaveAttribute('tabindex', '0');
		marker.focus();

		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			'moved to Ops on this instance',
		);
	});

	it('should show a folder as partly selected and toggle the workflows inside it', async () => {
		const { getAllByTestId, emitted } = render(['workflow:w1']);

		const folder = row(getAllByTestId, 'folder:f1').getByRole('checkbox');
		expect(folder).toHaveAttribute('data-state', 'indeterminate');

		await userEvent.click(folder);
		expect(emitted('toggleContainer')).toEqual([['folder:f1']]);
	});

	describe('groups, hints and the summary', () => {
		const group = (getAllByTestId: (id: string) => HTMLElement[], id: string) => {
			const match = getAllByTestId('promotion-preview-tree-group').find(
				(element) => element.dataset.groupId === id,
			);
			if (!match) throw new Error(`No group ${id}`);
			return within(match);
		};

		it('should show "Select all" without a count of selected changes', () => {
			const selected = new Set(['workflow:w1']);
			const { queryByTestId, getByText } = renderComponent({
				pinia: createTestingPinia(),
				props: {
					tree,
					graph,
					selected,
					inclusion: resolveInclusion(graph, selected),
					disabled: new Set(),
					locked: false,
					direction: 'promote',
					blockers: indexBlockers([]),
				},
			});

			expect(getByText('Select all')).toBeInTheDocument();
			expect(queryByTestId('promotion-preview-counts')).not.toBeInTheDocument();
		});

		it('should show the total of each group after its name, whatever the selection', () => {
			const { getAllByTestId } = render(['workflow:w1']);

			expect(
				group(getAllByTestId, 'section:workflows').getByTestId('promotion-preview-group-total'),
			).toHaveTextContent('(4)');
			expect(
				group(getAllByTestId, 'group:credential').getByTestId('promotion-preview-group-total'),
			).toHaveTextContent('(2)');
			expect(
				group(getAllByTestId, 'section:workflows').queryByText(/of \d+ selected/),
			).not.toBeInTheDocument();
		});

		it('should send the workflows of the group when users click its checkbox', async () => {
			const { getAllByTestId, emitted } = render([]);

			await userEvent.click(
				group(getAllByTestId, 'section:workflows').getByTestId('promotion-preview-group-checkbox'),
			);

			expect(emitted().toggleGroup).toEqual([
				[['workflow:w1', 'workflow:w2', 'workflow:w3', 'workflow:w4']],
			]);
		});

		it('should show no checkbox in a list that users only read, but still the group totals', () => {
			const selected = new Set(['workflow:w1']);
			const { queryAllByTestId } = renderComponent({
				pinia: createTestingPinia(),
				props: {
					tree,
					graph,
					selected,
					inclusion: resolveInclusion(graph, selected),
					disabled: new Set(),
					locked: true,
					direction: 'promote',
					blockers: indexBlockers([]),
					selectable: false,
				},
			});

			expect(queryAllByTestId('promotion-preview-group-checkbox')).toHaveLength(0);
			expect(queryAllByTestId('promotion-preview-group-total').length).toBeGreaterThan(0);
		});
	});
});
