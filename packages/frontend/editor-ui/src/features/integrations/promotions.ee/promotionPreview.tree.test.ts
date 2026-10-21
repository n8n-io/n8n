import { billingPreview } from './__tests__/preview.fixtures';
import { buildSelectionGraph } from './promotionPreview.selection';
import { buildPreviewTree, cardOrder, type PreviewTreeItem } from './promotionPreview.tree';

const labels = { workflows: 'workflows', group: (id: string) => id };
const tree = buildPreviewTree(billingPreview(), labels);

type Outline = string | { [id: string]: Outline[] };
const outline = (items: PreviewTreeItem[]): Outline[] =>
	items.map((item) => (item.children ? { [item.id]: outline(item.children) } : item.id));

describe('promotion preview tree', () => {
	it('should place workflows in their project and folders, and each dependency once under its type', () => {
		expect(outline(tree)).toEqual([
			{
				'section:workflows': [
					{
						'project:p1': [
							{ 'folder:f1': ['workflow:w1', 'workflow:w2'] },
							{ 'folder:f2': ['workflow:w3'] },
							'workflow:w4',
						],
					},
				],
			},
			{ 'group:subWorkflow': ['workflow:w9'] },
			{ 'group:credential': ['credential:c2', 'credential:c1'] },
			{ 'group:variable': ['variable:global:API_URL'] },
			{ 'group:dataTable': ['dataTable:t1'] },
			{ 'group:tag': ['tag:g1'] },
		]);
	});

	it('should order the cards like the tree and give unchanged projects and folders no card', () => {
		const { resources } = buildSelectionGraph(billingPreview(), 'promote');

		expect(cardOrder(tree, resources)).toEqual([
			'folder:f1',
			'workflow:w1',
			'workflow:w2',
			'workflow:w3',
			'workflow:w4',
			'workflow:w9',
			'credential:c2',
			'credential:c1',
			'variable:global:API_URL',
			'dataTable:t1',
			'tag:g1',
		]);
	});
});
