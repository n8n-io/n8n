import { discoverPluginGroups } from '../sources/github/plugin-discovery';

const discover = (files: Record<string, unknown>, folders: string[], root = '') => {
	const text = new Map(
		Object.entries(files).map(([path, value]) => [
			path,
			typeof value === 'string' ? value : JSON.stringify(value),
		]),
	);
	return discoverPluginGroups({ paths: [...text.keys()], text }, folders, root);
};

describe('plugin grouping', () => {
	it.each(['.claude-plugin', '.cursor-plugin'])(
		'groups local marketplace entries from %s',
		(format) => {
			const result = discover(
				{
					[`${format}/marketplace.json`]: {
						plugins: [
							{ name: 'writing', source: './plugins/writing' },
							{ name: 'engineering', source: './plugins/engineering' },
						],
					},
				},
				['plugins/writing/skills/brand', 'plugins/engineering/skills/review', 'other'],
			);
			expect(result.groups).toEqual([
				expect.objectContaining({ name: 'writing', paths: ['plugins/writing/skills/brand'] }),
				expect.objectContaining({
					name: 'engineering',
					paths: ['plugins/engineering/skills/review'],
				}),
			]);
			expect(result.groupingWarnings).toEqual([]);
		},
	);

	it.each(['.claude-plugin/plugin.json', '.cursor-plugin/plugin.json', 'plugin.json'])(
		'reads a standalone manifest at %s',
		(manifest) => {
			const result = discover(
				{ [`plugin/${manifest}`]: { name: 'writing', skills: ['./custom'] } },
				['plugin/custom/brand', 'plugin/unlisted'],
			);
			expect(result.groups).toEqual([
				expect.objectContaining({ name: 'writing', paths: ['plugin/custom/brand'] }),
			]);
		},
	);

	it('groups a single-skill plugin', () => {
		expect(
			discover({ 'plugin/.claude-plugin/plugin.json': { name: 'writing' } }, ['plugin']).groups,
		).toEqual([expect.objectContaining({ name: 'writing', paths: ['plugin'] })]);
	});

	it('keeps the default skills directory alongside custom skill paths', () => {
		const result = discover(
			{ 'plugin/.claude-plugin/plugin.json': { name: 'writing', skills: './custom' } },
			['plugin/custom/brand', 'plugin/skills/review'],
		);
		expect(result.groups).toEqual([
			expect.objectContaining({ paths: ['plugin/custom/brand', 'plugin/skills/review'] }),
		]);
	});

	it.each([
		{
			manifest: 'plugin/.cursor-plugin/plugin.json',
			value: { name: 'writing', skills: './custom' },
		},
		{
			manifest: '.cursor-plugin/marketplace.json',
			value: { plugins: [{ name: 'writing', source: './plugin', skills: './custom' }] },
		},
	])('uses only explicit Cursor skill paths from $manifest', ({ manifest, value }) => {
		const result = discover({ [manifest]: value }, ['plugin/custom/brand', 'plugin/skills/legacy']);
		expect(result.groups).toEqual([
			expect.objectContaining({ name: 'writing', paths: ['plugin/custom/brand'] }),
		]);
		expect(result.groupingWarnings).toEqual([]);
	});

	it.each(['.', './'])(
		'keeps Claude source %s at the marketplace root with pluginRoot',
		(source) => {
			const result = discover(
				{
					'.claude-plugin/marketplace.json': {
						metadata: { pluginRoot: './plugins' },
						plugins: [{ name: 'documents', source, skills: ['./skills/pdf'] }],
					},
				},
				['skills/pdf', 'plugins/skills/pdf'],
			);
			expect(result.groups).toEqual([
				expect.objectContaining({ name: 'documents', paths: ['skills/pdf'] }),
			]);
			expect(result.groupingWarnings).toEqual([]);
		},
	);

	it('uses explicit skill paths to distinguish plugins sharing the repository root', () => {
		const result = discover(
			{
				'.claude-plugin/marketplace.json': {
					plugins: [
						{ name: 'documents', source: './', skills: ['./skills/pdf', './skills/docx'] },
						{ name: 'design', source: './', skills: ['./skills/design'] },
					],
				},
			},
			['skills/pdf', 'skills/docx', 'skills/design'],
		);
		expect(result.groups.map(({ name, paths }) => ({ name, paths }))).toEqual([
			{ name: 'documents', paths: ['skills/pdf', 'skills/docx'] },
			{ name: 'design', paths: ['skills/design'] },
		]);
	});

	it('resolves bare sources under pluginRoot and explicit sources from the marketplace root', () => {
		const result = discover(
			{
				'.claude-plugin/marketplace.json': {
					metadata: { pluginRoot: './plugins' },
					plugins: [
						{ name: 'writing', source: 'writing' },
						{ name: 'review', source: './review' },
					],
				},
			},
			['plugins/writing/skills/brand', 'review/skills/code'],
		);
		expect(result.groups.map(({ paths }) => paths)).toEqual([
			['plugins/writing/skills/brand'],
			['review/skills/code'],
		]);
	});

	it('reads Cursor source objects and pluginRoot', () => {
		expect(
			discover(
				{
					'.cursor-plugin/marketplace.json': {
						metadata: { pluginRoot: 'plugins' },
						plugins: [{ name: 'writing', source: { path: 'writing' } }],
					},
				},
				['plugins/writing/a'],
			).groups,
		).toEqual([expect.objectContaining({ name: 'writing', paths: ['plugins/writing/a'] })]);
	});

	it('lists external entries without treating them as local groups', () => {
		const result = discover(
			{
				'.claude-plugin/marketplace.json': {
					plugins: [
						{ name: 'external', source: { source: 'github', repo: 'acme/external' } },
						{
							name: 'remote-folder',
							source: { source: 'git-subdir', url: 'https://example.com/repo', path: 'skills' },
						},
					],
				},
			},
			[],
		);
		expect(result.groups).toEqual([]);
		expect(result.externalPlugins).toEqual([
			{ name: 'external', manifestPath: '.claude-plugin/marketplace.json' },
			{ name: 'remote-folder', manifestPath: '.claude-plugin/marketplace.json' },
		]);
	});

	it.each([
		'{bad json',
		{ plugins: null },
		{ plugins: [{ name: 'bad', source: '../outside' }] },
		{ plugins: [{ name: 'bad', source: './', skills: '/outside' }] },
	])('falls back to a flat list for an unreadable manifest: %j', (value) => {
		const result = discover(
			{ '.claude-plugin/marketplace.json': value, 'good/plugin.json': { name: 'good' } },
			['good/a'],
		);
		expect(result.groups).toEqual([]);
		expect(result.groupingWarnings).toEqual(['.claude-plugin/marketplace.json']);
	});

	it('reports a manifest whose text was not retained', () => {
		expect(
			discoverPluginGroups(
				{ paths: ['.claude-plugin/marketplace.json'], text: new Map() },
				['a'],
				'',
			).groupingWarnings,
		).toEqual(['.claude-plugin/marketplace.json']);
	});

	it('ignores ancestor manifests, including broken ones, for a folder link', () => {
		const result = discover(
			{
				'.claude-plugin/marketplace.json': '{bad',
				'plugins/writing/.claude-plugin/plugin.json': { name: 'writing' },
			},
			['plugins/writing/skills/brand'],
			'plugins/writing/skills',
		);
		expect(result).toEqual({ groups: [], groupingWarnings: [], externalPlugins: [] });
	});

	it('uses manifests inside the linked folder and ignores dependencies', () => {
		const result = discover(
			{
				'plugins/writing/.claude-plugin/plugin.json': { name: 'writing' },
				'plugins/writing/node_modules/bad/plugin.json': '{bad',
			},
			['plugins/writing/skills/brand'],
			'plugins/writing',
		);
		expect(result.groups).toEqual([
			expect.objectContaining({ name: 'writing', paths: ['plugins/writing/skills/brand'] }),
		]);
		expect(result.groupingWarnings).toEqual([]);
	});
});
