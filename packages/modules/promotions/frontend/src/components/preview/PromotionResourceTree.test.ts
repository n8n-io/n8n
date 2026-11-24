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
	it('should show required dependencies as checked, like any checked box, and unused ones as unchecked', () => {
		const { getAllByTestId } = render(['workflow:w1']);

		const table = row(getAllByTestId, 'dataTable:t1').getByRole('checkbox');
		expect(table).toBeChecked();
		expect(table).not.toBeDisabled();
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

		it('should show "Select all" with no count behind it', () => {
			const selected = new Set(['workflow:w1']);
			const { queryByTestId, getByText } = renderComponent({
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
			expect(queryByTestId('promotion-preview-counts')).not.toBeInTheDocument();
		});

		it('should show how many resources each group has, next to its title', () => {
			const { getAllByTestId } = render(['workflow:w1']);

			expect(
				group(getAllByTestId, 'section:workflows').getByTestId('promotion-preview-group-total'),
			).toHaveTextContent(/^\(4\)$/);
			expect(
				group(getAllByTestId, 'group:credential').getByTestId('promotion-preview-group-total'),
			).toHaveTextContent('(2)');
		});

		it('should send the workflows of the group when users click its checkbox', async () => {
			const { getAllByTestId, emitted } = render([]);

			await userEvent.click(
				group(getAllByTestId, 'section:workflows').getByTestId('promotion-preview-group-checkbox'),
			);

			expect(emitted().toggleGroup).toEqual([
				[expect.arrayContaining(['workflow:w1', 'workflow:w2', 'workflow:w3', 'workflow:w4'])],
			]);
		});

		it('should keep the checkbox of a group of dependencies enabled', () => {
			const { getAllByTestId } = render(['workflow:w1']);

			expect(
				group(getAllByTestId, 'group:credential').getByTestId('promotion-preview-group-checkbox'),
			).not.toBeDisabled();
		});

		it('should show no checkbox, count or hint in a list that users only read', () => {
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
			expect(queryAllByTestId('promotion-preview-tree-hint')).toHaveLength(0);
			// The heading shows the total, like (2).
			const totals = queryAllByTestId('promotion-preview-group-total');
			expect(totals.length).toBeGreaterThan(0);
			for (const total of totals) expect(total.textContent?.trim()).toMatch(/^\(\d+\)$/);
		});
	});

	it('should add a dependency outside the access of the user to its group, last, with a disabled box and a lock', async () => {
		const selected = new Set(['workflow:w1']);
		const { getAllByTestId, findByTestId } = renderComponent({
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
				outsideAccess: [
					{
						kind: 'credential',
						name: 'Billing database',
						consumers: [
							{
								project: { id: 'p1', name: 'Sales' },
								workflows: [
									{ id: 'w1', name: 'Sync orders' },
									{ id: 'w2', name: 'Churn alert' },
								],
							},
						],
					},
				],
			},
		});

		// The group counts it, although users cannot select it. It is the last item of the group.
		const heading = getAllByTestId('promotion-preview-tree-group').find(
			(element) => element.dataset.groupId === 'group:credential',
		) as HTMLElement;
		expect(within(heading).getByTestId('promotion-preview-group-total')).toHaveTextContent('(3)');
		const rowsOfCredentials = getAllByTestId('promotion-preview-tree-outside-row');
		expect(rowsOfCredentials).toHaveLength(1);
		const [outside] = rowsOfCredentials;
		expect(outside).toHaveTextContent('Billing database');
		expect(outside.previousElementSibling).toHaveAttribute('data-resource-key');
		expect(outside.nextElementSibling?.getAttribute('data-group-id') ?? null).not.toBe(
			'group:credential',
		);
		const checkbox = within(outside).getByRole('checkbox');
		expect(checkbox).not.toBeChecked();
		expect(checkbox).toBeDisabled();
		await userEvent.hover(within(outside).getByTestId('promotion-preview-tree-outside-lock'));
		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			"You don't have permission to promote this dependency.",
		);
	});

	it('should nest outside workflows below their project, and share one row when the project is hidden', () => {
		const selected = new Set(['workflow:w1']);
		const consumers = [{ project: { id: 'p1', name: 'Sales' }, workflows: [] }];
		const { getAllByTestId } = renderComponent({
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
				outsideAccess: [
					{ kind: 'workflow', name: 'Hidden one', consumers },
					{ kind: 'workflow', name: 'Known one', project: { id: 'o1', name: 'Ops' }, consumers },
					{ kind: 'workflow', name: 'Hidden two', consumers },
				],
			},
		});

		const names = getAllByTestId('promotion-preview-tree-outside-row').map((row) =>
			row.textContent?.trim(),
		);
		// Known projects first. The hidden ones share one row. Project rows are not counted.
		expect(names).toEqual(['Ops', 'Known one', 'Other projects', 'Hidden one', 'Hidden two']);
		const heading = getAllByTestId('promotion-preview-tree-group').find(
			(element) => element.dataset.groupId === 'section:workflows',
		) as HTMLElement;
		expect(within(heading).getByTestId('promotion-preview-group-total')).toHaveTextContent(
			/\(\d+\)/,
		);
	});

	describe('dependencies outside the access of the user', () => {
		const withBlockers = (blockers: Parameters<typeof indexBlockers>[0]) => {
			const selected = new Set(['workflow:w1']);
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
					blockers: indexBlockers(blockers),
				},
			});
		};

		it('should give the workflow a quiet marker that opens the issues, and no blocked row', async () => {
			const { getAllByTestId, emitted } = withBlockers([
				{ kind: 'outside', resourceKey: null, workflowKeys: ['workflow:w1', 'workflow:w1'] },
			]);

			const marker = row(getAllByTestId, 'workflow:w1').getByTestId(
				'promotion-preview-tree-outside',
			);
			expect(marker).toHaveAccessibleName(
				'This workflow uses 1 dependency that is outside your access. You can promote it without it.',
			);
			expect(
				row(getAllByTestId, 'workflow:w1').queryByTestId('promotion-preview-tree-blocker'),
			).toBeNull();

			await userEvent.click(marker);
			expect(emitted('showBlockers')).toHaveLength(1);
		});

		it('should count them in the marker of a workflow that also has an issue to resolve', () => {
			const { getAllByTestId } = withBlockers([
				{ kind: 'conflict', resourceKey: null, workflowKeys: ['workflow:w1'] },
				{ kind: 'outside', resourceKey: null, workflowKeys: ['workflow:w1'] },
				{ kind: 'outside', resourceKey: null, workflowKeys: ['workflow:w1'] },
			]);

			const workflow = row(getAllByTestId, 'workflow:w1');
			expect(workflow.getByTestId('promotion-preview-tree-blocker')).toHaveAccessibleName(
				'1 issue needs your action. 2 are outside your access.',
			);
			expect(workflow.queryByTestId('promotion-preview-tree-outside')).toBeNull();
		});
	});
});
