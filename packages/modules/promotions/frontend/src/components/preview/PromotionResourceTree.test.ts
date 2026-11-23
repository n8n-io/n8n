import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import {
	archivedWorkflow,
	notOnBranchWorkflow,
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
	unreachableWorkflow,
} from '../../__tests__/missingDependencies.fixtures';
import { billingPreview } from '../../__tests__/preview.fixtures';
import { crossProjectMoveBlockers, indexBlockers, indexByWorkflow } from '../../promotionOperation';
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

		// The row of a workflow with an issue has a warning triangle, and no highlight.
		expect(marker.querySelector('[data-icon]')).toHaveAttribute('data-icon', 'triangle-alert');
		expect(marker.closest('li')?.className).not.toMatch(/blocked/);
		expect(marker).toHaveAttribute('tabindex', '0');
		marker.focus();

		expect(await findByTestId('tooltip-content')).toHaveTextContent(
			'moved to Ops on this instance',
		);
	});

	describe('missing dependencies', () => {
		const renderWithMissing = (
			dependencies = [
				otherProjectCredential,
				outsideAccessWorkflow,
				{ ...personalCredential, consumers: otherProjectCredential.consumers },
			],
			direction: 'promote' | 'apply' = 'promote',
		) => {
			const selected = new Set(['workflow:w1', 'workflow:w3']);
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
					direction,
					blockers: indexBlockers([]),
					missingDependencies: indexByWorkflow(dependencies),
				},
			});
		};

		it('should mark a workflow that uses missing dependencies, and keep its checkbox active', async () => {
			const { getAllByTestId, emitted } = renderWithMissing();

			// "Weekly KPI report" (w3) uses only the sub-workflow that the user cannot access.
			const outside = row(getAllByTestId, 'workflow:w3');
			const marker = outside.getByTestId('promotion-preview-tree-dependencies');
			expect(marker).toHaveAccessibleName(
				'This workflow uses 1 dependency that is outside your access. You can promote it without it.',
			);
			expect(outside.queryByTestId('promotion-preview-tree-blocker')).not.toBeInTheDocument();
			expect(outside.getByRole('checkbox')).toBeChecked();
			expect(outside.getByRole('checkbox')).toBeEnabled();

			await userEvent.click(marker);
			expect(emitted('showBlockers')).toHaveLength(1);
		});

		it('should count every missing dependency of a workflow when not all are outside the access of the user', () => {
			const { getAllByTestId } = renderWithMissing();

			expect(
				row(getAllByTestId, 'workflow:w1').getByTestId('promotion-preview-tree-dependencies'),
			).toHaveAccessibleName('3 dependencies are not included in this Promote.');
		});

		// "Invoice reconciliation" (w1) uses each of these dependencies.
		it.each([
			[
				'every dependency is outside the access of the user',
				[outsideAccessWorkflow, { ...outsideAccessWorkflow, id: 'w9', name: 'Notify finance' }],
				'This workflow uses 2 dependencies that are outside your access. You can promote it without them.',
			],
			[
				'only some dependencies are outside the access of the user',
				[otherProjectCredential, outsideAccessWorkflow],
				'2 dependencies are not included in this Promote.',
			],
			[
				'the user can access the project of the dependency',
				[otherProjectCredential],
				'1 dependency is not included in this Promote.',
			],
		])(
			'should show a warning triangle with its reason when %s',
			async (_case, dependencies, text) => {
				const { getAllByTestId, findByTestId } = renderWithMissing(dependencies);

				const marker = row(getAllByTestId, 'workflow:w1').getByTestId(
					'promotion-preview-tree-dependencies',
				);
				expect(marker.querySelector('[data-icon]')).toHaveAttribute('data-icon', 'triangle-alert');
				await userEvent.hover(marker);
				expect(await findByTestId('tooltip-content')).toHaveTextContent(text);
			},
		);

		it('should show an amber triangle for an issue that stops a workflow, and a muted one for dependencies that the Promote leaves out', () => {
			const base = billingPreview();
			const preview = {
				...base,
				resources: base.resources.map((resource) =>
					resource.key === 'workflow:w2'
						? { ...resource, movedToProject: { id: 'p2', name: 'Ops' } }
						: resource,
				),
			};
			const movedGraph = buildSelectionGraph(preview, 'promote');
			const selected = new Set(['workflow:w1']);
			const { getAllByTestId } = renderComponent({
				pinia: createTestingPinia(),
				// The stub shows the color of an icon, which the test DOM does not keep.
				global: {
					stubs: {
						N8nIcon: {
							props: ['icon', 'color'],
							template: '<i :data-icon="icon" :data-color="color" />',
						},
					},
				},
				props: {
					tree: buildPreviewTree(preview, { workflows: 'workflows', group: (id) => id }),
					graph: movedGraph,
					selected,
					inclusion: resolveInclusion(movedGraph, selected),
					includedChanges: 0,
					totalChanges: 0,
					disabled: new Set(['workflow:w2']),
					locked: false,
					direction: 'promote',
					blockers: indexBlockers(crossProjectMoveBlockers(movedGraph)),
					missingDependencies: indexByWorkflow([otherProjectCredential]),
				},
			});

			const icon = (key: string, marker: string) =>
				row(getAllByTestId, key).getByTestId(marker).querySelector('[data-icon]');
			expect(icon('workflow:w2', 'promotion-preview-tree-blocker')).toHaveAttribute(
				'data-color',
				'warning',
			);
			expect(icon('workflow:w1', 'promotion-preview-tree-dependencies')).toHaveAttribute(
				'data-color',
				'text-light',
			);
			for (const marker of [
				icon('workflow:w2', 'promotion-preview-tree-blocker'),
				icon('workflow:w1', 'promotion-preview-tree-dependencies'),
			]) {
				expect(marker).toHaveAttribute('data-icon', 'triangle-alert');
			}
		});

		// "Weekly KPI report" (w3) uses each of these dependencies of an Apply.
		const anotherNotOnBranch = { ...notOnBranchWorkflow, id: 'w13', name: 'Close ledger' };
		const usedByKpiReport = { ...archivedWorkflow, consumers: notOnBranchWorkflow.consumers };
		it.each([
			[
				'no dependency is on the branch',
				[notOnBranchWorkflow, anotherNotOnBranch],
				'2 dependencies are not on the branch.',
			],
			[
				'every dependency is outside the access of the user',
				[unreachableWorkflow],
				'This workflow uses 1 dependency that is outside your access. You can apply it without it.',
			],
			[
				'only some dependencies are outside the access of the user',
				[unreachableWorkflow, notOnBranchWorkflow],
				'2 dependencies are not usable on this instance.',
			],
			[
				'the user can resolve one of the dependencies',
				[usedByKpiReport, notOnBranchWorkflow],
				'2 dependencies are not usable on this instance.',
			],
		])('should mark a workflow of an Apply when %s', (_case, dependencies, message) => {
			const { getAllByTestId } = renderWithMissing(dependencies, 'apply');

			const marker = row(getAllByTestId, 'workflow:w3').getByTestId(
				'promotion-preview-tree-dependencies',
			);
			expect(marker).toHaveAccessibleName(message);
			expect(marker.querySelector('[data-icon]')).toHaveAttribute('data-icon', 'triangle-alert');
		});

		it('should show no marker on a workflow without missing dependencies', () => {
			const { getAllByTestId, queryAllByTestId } = renderWithMissing();

			expect(
				row(getAllByTestId, 'workflow:w2').queryByTestId('promotion-preview-tree-dependencies'),
			).not.toBeInTheDocument();
			expect(queryAllByTestId('promotion-preview-tree-dependencies')).toHaveLength(2);
		});
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
