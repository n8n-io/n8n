import { billingPreview, resource } from './__tests__/preview.fixtures';
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

	describe('a project without workflows', () => {
		const project = resource({ key: 'project:p1', name: 'Platform', change: 'modified' });
		const folder = resource({ key: 'folder:f1', name: 'Shared', parentKey: 'project:p1' });
		const crmKey = resource({
			key: 'credential:c1',
			name: 'CRM key',
			parentKey: 'project:p1',
			change: 'added',
			selectable: true,
		});

		it('should show the project as its own row and not under "Workflows"', () => {
			expect(outline(buildPreviewTree({ resources: [project, crmKey] }, labels))).toEqual([
				'project:p1',
				{ 'group:credential': ['credential:c1'] },
			]);
		});

		it('should keep the folders below the project row', () => {
			expect(outline(buildPreviewTree({ resources: [project, folder] }, labels))).toEqual([
				{ 'project:p1': ['folder:f1'] },
			]);
		});

		it('should list the project row first in the cards when the project has a change', () => {
			const preview = { ...billingPreview(), resources: [project, crmKey] };
			const { resources } = buildSelectionGraph(preview, 'promote');

			expect(cardOrder(buildPreviewTree(preview, labels), resources)).toEqual([
				'project:p1',
				'credential:c1',
			]);
		});
	});
});
