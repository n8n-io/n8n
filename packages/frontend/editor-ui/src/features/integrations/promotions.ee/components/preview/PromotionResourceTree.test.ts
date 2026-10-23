import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import { billingPreview } from '../../__tests__/preview.fixtures';
import { indexBlockers } from '../../promotionOperation';
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

	it('should show a folder as partly selected and toggle the workflows inside it', async () => {
		const { getAllByTestId, emitted } = render(['workflow:w1']);

		const folder = row(getAllByTestId, 'folder:f1').getByRole('checkbox');
		expect(folder).toHaveAttribute('data-state', 'indeterminate');

		await userEvent.click(folder);
		expect(emitted('toggleContainer')).toEqual([['folder:f1']]);
	});
});
