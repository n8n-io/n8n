import { buildUninstalledNodeWarnings } from '../tools/workflow-builder/uninstalled-node-warnings';

const FIRECRAWL = '@mendable/n8n-nodes-firecrawl.firecrawl';

describe('buildUninstalledNodeWarnings', () => {
	const nodes = [
		{ name: 'Scrape', type: FIRECRAWL },
		{ name: 'Set Fields', type: 'n8n-nodes-base.set' },
	];

	const finder = (uninstalled: Array<{ nodeType: string; packageName: string }>) =>
		vi.fn().mockResolvedValue(uninstalled);

	test('warns per node, naming the package that ships it', async () => {
		const warnings = await buildUninstalledNodeWarnings(
			nodes,
			finder([{ nodeType: FIRECRAWL, packageName: '@mendable/n8n-nodes-firecrawl' }]),
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatchObject({
			code: 'UNINSTALLED_COMMUNITY_NODE',
			nodeName: 'Scrape',
		});
		expect(warnings[0].message).toContain('@mendable/n8n-nodes-firecrawl');
		expect(warnings[0].message).toContain('install_community_node');
	});

	test('warns once per node, not once per type', async () => {
		const warnings = await buildUninstalledNodeWarnings(
			[
				{ name: 'Scrape A', type: FIRECRAWL },
				{ name: 'Scrape B', type: FIRECRAWL },
			],
			finder([{ nodeType: FIRECRAWL, packageName: '@mendable/n8n-nodes-firecrawl' }]),
		);

		expect(warnings.map((w) => w.nodeName)).toEqual(['Scrape A', 'Scrape B']);
	});

	test('stays quiet when every node type is installed', async () => {
		expect(await buildUninstalledNodeWarnings(nodes, finder([]))).toEqual([]);
	});

	test('stays quiet on a surface that does not offer discovery', async () => {
		expect(await buildUninstalledNodeWarnings(nodes, undefined)).toEqual([]);
	});

	test('does not consult the catalog for an empty node list', async () => {
		const find = finder([]);

		expect(await buildUninstalledNodeWarnings([], find)).toEqual([]);
		expect(find).not.toHaveBeenCalled();
	});

	test('asks about every node type in one call', async () => {
		const find = finder([]);

		await buildUninstalledNodeWarnings(nodes, find);

		expect(find).toHaveBeenCalledWith([FIRECRAWL, 'n8n-nodes-base.set']);
	});
});
