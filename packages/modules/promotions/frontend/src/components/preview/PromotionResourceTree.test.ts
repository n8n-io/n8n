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
			includedChanges: 0,
			totalChanges: 0,
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
				includedChanges: 0,
				totalChanges: 0,
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
				includedChanges: 0,
				totalChanges: 0,
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

		it('should show "Select all" with the count of included changes behind it', () => {
			const selected = new Set(['workflow:w1']);
			const { getByTestId, getByText } = renderComponent({
				pinia: createTestingPinia(),
				props: {
					tree,
					graph,
					selected,
					inclusion: resolveInclusion(graph, selected),
					includedChanges: 3,
					totalChanges: 17,
					disabled: new Set(),
					locked: false,
					direction: 'promote',
					blockers: indexBlockers([]),
				},
			});

			expect(getByText('Select all')).toBeInTheDocument();
			expect(getByTestId('promotion-preview-counts')).toHaveTextContent('3 of 17 selected');
		});

		it('should show each group with how many of its resources the operation includes', () => {
			const { getAllByTestId } = render(['workflow:w1']);

			expect(
				group(getAllByTestId, 'section:workflows').getByTestId('promotion-preview-group-count'),
			).toHaveTextContent(/^1 of 4 selected$/);
			expect(
				group(getAllByTestId, 'group:credential').getByTestId('promotion-preview-group-count'),
			).toHaveTextContent('1 of 2 selected');
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

		it('should show no checkbox, count in a list that users only read', () => {
			const selected = new Set(['workflow:w1']);
			const { queryAllByTestId } = renderComponent({
				pinia: createTestingPinia(),
				props: {
					tree,
					graph,
					selected,
					inclusion: resolveInclusion(graph, selected),
					includedChanges: 0,
					totalChanges: 0,
					disabled: new Set(),
					locked: true,
					direction: 'promote',
					blockers: indexBlockers([]),
					selectable: false,
				},
			});

			expect(queryAllByTestId('promotion-preview-group-checkbox')).toHaveLength(0);
			expect(queryAllByTestId('promotion-preview-group-count')).toHaveLength(0);
		});
	});
});
