import {
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
} from './__tests__/missingDependencies.fixtures';
import { billingPreview, resource } from './__tests__/preview.fixtures';
import { buildSelectionGraph } from './promotionPreview.selection';
import { buildPreviewTree, cardOrder, type PreviewTreeItem } from './promotionPreview.tree';

const labels = { workflows: 'workflows', group: (id: string) => id };
const tree = buildPreviewTree(billingPreview(), labels);

type Outline = string | { [id: string]: Outline[] };
const outline = (items: PreviewTreeItem[]): Outline[] =>
	items.map((item) => (item.children ? { [item.id]: outline(item.children) } : item.id));

describe('promotion preview tree', () => {
	it('should add a locked row, last in its group, for a credential that a Promote cannot carry', () => {
		const locked = buildPreviewTree(billingPreview(), labels, [
			personalCredential,
			otherProjectCredential,
		]);

		const group = locked.find((item) => item.id === 'group:credential');
		expect(group?.children?.map((item) => item.id)).toEqual([
			'credential:c2',
			'credential:c1',
			'locked:credential:c7',
			'locked:credential:c8',
		]);
		expect(group?.children?.slice(0, 2).every((item) => !item.locked)).toBe(true);
		expect(group?.children?.[2].locked).toMatchObject({ group: 'other-project', accessible: true });
		expect(group?.children?.[3].locked).toMatchObject({ group: 'personal', accessible: true });
		// A locked row is not a resource, so the selection of the group does not count it.
		expect(group?.memberKeys).toEqual(['credential:c1', 'credential:c2']);
	});

	it('should lock a workflow of another project, under its project or under "Other projects"', () => {
		const named = { id: 'p7', name: 'Finance' };
		const withProjects = buildPreviewTree(
			billingPreview(),
			{ ...labels, otherProjects: 'Other projects' },
			[
				{
					...outsideAccessWorkflow,
					id: 'w20',
					name: 'Close ledger',
					group: 'other-project',
					accessible: true,
					project: named,
				},
				{ ...outsideAccessWorkflow, id: 'w21', name: 'Audit log' },
			],
		);

		const section = withProjects.find((item) => item.id === 'section:workflows');
		const rows = section?.children?.slice(1);
		expect(rows?.map((row) => [row.id, row.label, row.children?.map((child) => child.id)])).toEqual(
			[
				['locked-project:p7', 'Finance', ['locked:workflow:w20']],
				['locked-project:other', 'Other projects', ['locked:workflow:w21', 'workflow:w9']],
			],
		);
		expect(rows?.every((row) => row.plain)).toBe(true);
		expect(rows?.[0].children?.[0].locked).toMatchObject({
			group: 'other-project',
			accessible: true,
		});
		expect(rows?.[1].children?.[1].locked).toMatchObject({
			group: 'outside-access',
			accessible: false,
		});
	});

	it('should not lock a credential that the project owns', () => {
		const group = tree.find((item) => item.id === 'group:credential');

		expect(group?.children?.every((item) => !item.locked)).toBe(true);
	});

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
					// The workflow of another project is the last item of the group.
					{ 'locked-project:other': ['workflow:w9'] },
				],
			},
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
