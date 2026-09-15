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
				icon: 'folder',
				children: [
					{
						id: 'src/components',
						label: 'components',
						icon: 'folder',
						children: [{ id: 'src/components/Button.vue', label: 'Button.vue', icon: 'file-code' }],
					},
					{ id: 'src/main.ts', label: 'main.ts', icon: 'file-code' },
				],
			},
			{ id: 'index.html', label: 'index.html', icon: 'file-code' },
		]);
	});

	it('gives directories a folder icon and files a file icon', () => {
		const tree = buildFileTree(['src/main.ts']);

		expect(tree[0].icon).toBe('folder');
		expect(tree[0].children?.[0].icon).toBe('file-code');
	});

	it('orders directories before files, alphabetically within each', () => {
		const tree = buildFileTree(['z.txt', 'a.txt', 'zdir/x.txt', 'adir/x.txt']);

		expect(tree.map((node) => node.id)).toEqual(['adir', 'zdir', 'a.txt', 'z.txt']);
	});
});
