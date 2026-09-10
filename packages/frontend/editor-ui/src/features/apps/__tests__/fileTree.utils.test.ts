import { buildFileTree } from '../fileTree.utils';

describe('buildFileTree', () => {
	it('returns an empty tree for an empty file list', () => {
		expect(buildFileTree([])).toEqual([]);
	});

	it('nests files under their directories, keyed by full path', () => {
		const tree = buildFileTree(['index.html', 'src/main.ts', 'src/components/Button.vue']);

		expect(tree).toEqual([
			{
				id: 'src',
				label: 'src',
				children: [
					{
						id: 'src/components',
						label: 'components',
						children: [{ id: 'src/components/Button.vue', label: 'Button.vue' }],
					},
					{ id: 'src/main.ts', label: 'main.ts' },
				],
			},
			{ id: 'index.html', label: 'index.html' },
		]);
	});

	it('orders directories before files, alphabetically within each', () => {
		const tree = buildFileTree(['z.txt', 'a.txt', 'zdir/x.txt', 'adir/x.txt']);

		expect(tree.map((node) => node.id)).toEqual(['adir', 'zdir', 'a.txt', 'z.txt']);
	});
});
