import { computeSnapshotDiff } from './diff';
import type { TreeNode } from './types';

function makeTree(nodes: Array<{ role: string; name: string; ref?: string }>): TreeNode[] {
	return nodes.map(({ role, name, ref }) => ({ role, name, ref, children: [] }));
}

/** Build a large tree where diff will be shorter than full content */
function makeLargeTree(count: number, prefix = 'Item'): TreeNode[] {
	return Array.from({ length: count }, (_, i) => ({
		role: 'button',
		name: `${prefix} ${i + 1}`,
		ref: `btn-${prefix.toLowerCase()}-${i + 1}`,
		children: [],
	}));
}

describe('computeSnapshotDiff', () => {
	it('returns full on empty previous (first call)', () => {
		const next = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff([], next);
		expect(result.diffType).toBe('full');
		expect(result.content).toBe('- button "Save" [ref=btn-save]');
	});

	it('returns no-change for identical trees', () => {
		const nodes = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff(nodes, [...nodes.map((n) => ({ ...n }))]);
		expect(result.diffType).toBe('no-change');
		expect(result.content).toBe('');
	});

	it('returns full when all content changed', () => {
		const prev = makeTree([
			{ role: 'button', name: 'A', ref: 'btn-a' },
			{ role: 'button', name: 'B', ref: 'btn-b' },
			{ role: 'button', name: 'C', ref: 'btn-c' },
		]);
		const next = makeTree([
			{ role: 'button', name: 'X', ref: 'btn-x' },
			{ role: 'button', name: 'Y', ref: 'btn-y' },
			{ role: 'button', name: 'Z', ref: 'btn-z' },
		]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('full');
	});

	it('returns unified diff with +/- lines for small change in large tree', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[15] = { role: 'button', name: 'MODIFIED', ref: 'btn-modified', children: [] };

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('--- snapshot (previous)');
		expect(result.content).toContain('+++ snapshot (current)');
		expect(result.content).toContain('@@');
		expect(result.content).toContain('-- button "Item 16" [ref=btn-item-16]');
		expect(result.content).toContain('+- button "MODIFIED" [ref=btn-modified]');
	});

	it('includes context lines around changes', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[15] = { role: 'button', name: 'CHANGED', ref: 'btn-changed', children: [] };

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		// Context lines (3 lines before/after the change)
		expect(result.content).toContain(' - button "Item 14"');
		expect(result.content).toContain(' - button "Item 15"');
		expect(result.content).toContain(' - button "Item 17"');
		expect(result.content).toContain(' - button "Item 18"');
	});

	it('shows added node as + line', () => {
		const prev = makeLargeTree(20);
		const next = [
			...makeLargeTree(20),
			{ role: 'button', name: 'New', ref: 'btn-new', children: [] as TreeNode[] },
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('+- button "New" [ref=btn-new]');
	});

	it('shows removed node as - line', () => {
		const prev = [
			...makeLargeTree(20),
			{ role: 'button', name: 'Old', ref: 'btn-old', children: [] as TreeNode[] },
		];
		const next = makeLargeTree(20);

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('-- button "Old" [ref=btn-old]');
	});

	it('shows nested change with tree context', () => {
		const prev: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Main',
				children: [
					{ role: 'link', name: 'Home', ref: 'lnk-home', children: [] },
					{ role: 'link', name: 'About', ref: 'lnk-about', children: [] },
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Main',
				children: [
					{ role: 'link', name: 'Home', ref: 'lnk-home', children: [] },
					{ role: 'link', name: 'About us', ref: 'lnk-about-us', children: [] },
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toContain('-  - link "About" [ref=lnk-about]');
		expect(result.content).toContain('+  - link "About us" [ref=lnk-about-us]');
		// Parent context preserved
		expect(result.content).toContain(' - navigation "Main"');
	});

	it('produces multiple hunks for changes in distant locations', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[2] = { role: 'button', name: 'Changed Near Start', ref: 'btn-start', children: [] };
		next[27] = { role: 'button', name: 'Changed Near End', ref: 'btn-end', children: [] };

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects attribute-only changes (checkbox toggled)', () => {
		const prev: TreeNode[] = [
			...makeLargeTree(15),
			{ role: 'checkbox', name: 'Accept terms', ref: 'chk1', children: [] },
			...makeLargeTree(15, 'Other'),
		];
		const next: TreeNode[] = [
			...makeLargeTree(15),
			{ role: 'checkbox', name: 'Accept terms', checked: true, ref: 'chk1', children: [] },
			...makeLargeTree(15, 'Other'),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects children added to a nested parent', () => {
		const prev: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Sidebar',
				ref: 'nav1',
				children: [
					{ role: 'link', name: 'Home', ref: 'lnk1', children: [] },
					{ role: 'link', name: 'Settings', ref: 'lnk2', children: [] },
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Sidebar',
				ref: 'nav1',
				children: [
					{ role: 'link', name: 'Home', ref: 'lnk1', children: [] },
					{ role: 'link', name: 'Dashboard', ref: 'lnk-new', children: [] },
					{ role: 'link', name: 'Settings', ref: 'lnk2', children: [] },
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects children removed from a nested parent', () => {
		const prev: TreeNode[] = [
			{
				role: 'form',
				name: 'Login',
				children: [
					{ role: 'textbox', name: 'Username', ref: 'txt1', children: [] },
					{ role: 'textbox', name: 'Password', ref: 'txt2', children: [] },
					{ role: 'checkbox', name: 'Remember me', ref: 'chk1', children: [] },
					{ role: 'button', name: 'Submit', ref: 'btn1', children: [] },
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'form',
				name: 'Login',
				children: [
					{ role: 'textbox', name: 'Username', ref: 'txt1', children: [] },
					{ role: 'textbox', name: 'Password', ref: 'txt2', children: [] },
					{ role: 'button', name: 'Submit', ref: 'btn1', children: [] },
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects textbox value changes', () => {
		const prev: TreeNode[] = [
			...makeLargeTree(10),
			{ role: 'textbox', name: 'Email', ref: 'txt1', value: 'old@test.com', children: [] },
			...makeLargeTree(10, 'Other'),
		];
		const next: TreeNode[] = [
			...makeLargeTree(10),
			{ role: 'textbox', name: 'Email', ref: 'txt1', value: 'new@test.com', children: [] },
			...makeLargeTree(10, 'Other'),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('handles simultaneous additions and removals', () => {
		const prev: TreeNode[] = [
			{ role: 'button', name: 'Delete', ref: 'btn-del', children: [] },
			...makeLargeTree(25),
			{ role: 'button', name: 'Old Action', ref: 'btn-old', children: [] },
		];
		const next: TreeNode[] = [
			{ role: 'button', name: 'Create', ref: 'btn-create', children: [] },
			...makeLargeTree(25),
			{ role: 'button', name: 'New Action', ref: 'btn-new', children: [] },
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('returns full when change ratio is exactly at threshold', () => {
		const prev = makeTree([
			{ role: 'button', name: 'A', ref: 'btn-a' },
			{ role: 'button', name: 'B', ref: 'btn-b' },
		]);
		const next = makeTree([
			{ role: 'button', name: 'A', ref: 'btn-a' },
			{ role: 'button', name: 'X', ref: 'btn-x' },
		]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('full');
	});

	it('returns diff when change ratio is just below threshold', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[0] = { role: 'button', name: 'Changed', ref: 'btn-changed', children: [] };
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
	});

	it('respects custom threshold parameter', () => {
		const prev = makeLargeTree(30);
		const next = makeLargeTree(30);
		next[15] = { role: 'button', name: 'Modified', ref: 'btn-mod', children: [] };

		const lowThreshold = computeSnapshotDiff(prev, next, 0.01);
		expect(lowThreshold.diffType).toBe('full');

		const highThreshold = computeSnapshotDiff(prev, next, 0.99);
		expect(highThreshold.diffType).toBe('diff');
	});

	it('detects deeply nested structural changes', () => {
		const prev: TreeNode[] = [
			{
				role: 'main',
				name: '',
				children: [
					{
						role: 'section',
						name: 'Content',
						children: [
							{
								role: 'list',
								name: '',
								children: [
									{
										role: 'listitem',
										name: '',
										children: [{ role: 'link', name: 'Item 1', ref: 'lnk1', children: [] }],
									},
									{
										role: 'listitem',
										name: '',
										children: [{ role: 'link', name: 'Item 2', ref: 'lnk2', children: [] }],
									},
								],
							},
						],
					},
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'main',
				name: '',
				children: [
					{
						role: 'section',
						name: 'Content',
						children: [
							{
								role: 'list',
								name: '',
								children: [
									{
										role: 'listitem',
										name: '',
										children: [{ role: 'link', name: 'Item 1', ref: 'lnk1', children: [] }],
									},
									{
										role: 'listitem',
										name: '',
										children: [
											{
												role: 'link',
												name: 'Item 2 (updated)',
												ref: 'lnk2',
												children: [],
											},
										],
									},
									{
										role: 'listitem',
										name: '',
										children: [{ role: 'link', name: 'Item 3', ref: 'lnk3', children: [] }],
									},
								],
							},
						],
					},
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects reordered nodes as removals and additions', () => {
		const prev: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Tabs',
				children: [
					{ role: 'tab', name: 'First', ref: 'tab1', children: [] },
					{ role: 'tab', name: 'Second', ref: 'tab2', children: [] },
					{ role: 'tab', name: 'Third', ref: 'tab3', children: [] },
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'navigation',
				name: 'Tabs',
				children: [
					{ role: 'tab', name: 'Third', ref: 'tab3', children: [] },
					{ role: 'tab', name: 'First', ref: 'tab1', children: [] },
					{ role: 'tab', name: 'Second', ref: 'tab2', children: [] },
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('handles prop changes on links (href updated)', () => {
		const prev: TreeNode[] = [
			...makeLargeTree(10),
			{
				role: 'link',
				name: 'Profile',
				ref: 'lnk1',
				props: { href: '/user/123' },
				children: [],
			},
			...makeLargeTree(10, 'Other'),
		];
		const next: TreeNode[] = [
			...makeLargeTree(10),
			{
				role: 'link',
				name: 'Profile',
				ref: 'lnk1',
				props: { href: '/user/456' },
				children: [],
			},
			...makeLargeTree(10, 'Other'),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('returns full when diff string is longer than full content', () => {
		const prev = makeLargeTree(10);
		const next = makeLargeTree(10).map((node, i) =>
			i % 2 === 0 ? { ...node, name: `Changed ${i}`, ref: `btn-c${i}` } : node,
		);

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('full');
		expect(result.content).toMatchSnapshot();
	});

	it('handles complete subtree replacement', () => {
		const prev: TreeNode[] = [
			{
				role: 'main',
				name: '',
				children: [
					{
						role: 'section',
						name: 'Old Section',
						children: [
							{ role: 'button', name: 'Old Button 1', ref: 'btn1', children: [] },
							{ role: 'button', name: 'Old Button 2', ref: 'btn2', children: [] },
						],
					},
				],
			},
			...makeLargeTree(20),
		];
		const next: TreeNode[] = [
			{
				role: 'main',
				name: '',
				children: [
					{
						role: 'form',
						name: 'New Form',
						children: [
							{ role: 'textbox', name: 'Name', ref: 'txt1', children: [] },
							{ role: 'button', name: 'Save', ref: 'btn-save', children: [] },
						],
					},
				],
			},
			...makeLargeTree(20),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('handles multiple attribute changes on same node', () => {
		const prev: TreeNode[] = [
			...makeLargeTree(15),
			{
				role: 'button',
				name: 'Submit',
				ref: 'btn-submit',
				disabled: true,
				children: [],
			},
			...makeLargeTree(15, 'Other'),
		];
		const next: TreeNode[] = [
			...makeLargeTree(15),
			{
				role: 'button',
				name: 'Submit',
				ref: 'btn-submit',
				pressed: true,
				children: [],
			},
			...makeLargeTree(15, 'Other'),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects combobox opening (expanded false→true with new children)', () => {
		const prev: TreeNode[] = [
			...makeLargeTree(10),
			{
				role: 'combobox',
				name: 'Country',
				ref: 'cmb1',
				expanded: false,
				children: [],
			},
			...makeLargeTree(10, 'Other'),
		];
		const next: TreeNode[] = [
			...makeLargeTree(10),
			{
				role: 'combobox',
				name: 'Country',
				ref: 'cmb1',
				expanded: true,
				children: [
					{ role: 'option', name: 'United States', ref: 'opt1', children: [] },
					{ role: 'option', name: 'United Kingdom', ref: 'opt2', children: [] },
					{ role: 'option', name: 'Germany', ref: 'opt3', children: [] },
				],
			},
			...makeLargeTree(10, 'Other'),
		];

		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});
});
