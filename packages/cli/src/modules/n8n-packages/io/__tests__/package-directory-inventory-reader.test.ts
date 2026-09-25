import { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import {
	PackageDirectoryInventoryReader,
	type PackageFileSource,
} from '../directory/package-directory-inventory-reader';

/** A package held in memory: relative path to file content. */
function sourceOf(files: Record<string, unknown>): PackageFileSource {
	return {
		listEntries: async () => Object.keys(files),
		readFile: async (path) => {
			const content = files[path];
			return Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
		},
	};
}

const project = (id: string, name = id) => ({ id, name });

const workflow = (id: string, name = id) => ({
	id,
	name,
	nodes: [],
	connections: {},
	versionId: 'v1',
	parentFolderId: null,
	isArchived: false,
});

const credential = (id: string, type = 'githubApi') => ({ id, name: id, type });

const variable = (name: string) => ({ name, type: 'string' });

describe('PackageDirectoryInventoryReader', () => {
	const reader = new PackageDirectoryInventoryReader(new WorkflowSerializer());

	it('reads projects, nested workflows, credentials and variables from their files and ignores other files', async () => {
		const inventory = await reader.read(
			sourceOf({
				'manifest.json': 'not json {',
				'projects/alpha-p1/project.json': project('p1', 'Alpha'),
				'projects/alpha-p1/workflows/root-w1/workflow.json': workflow('w1', 'Root'),
				'projects/alpha-p1/workflows/root-w1/workflow-metadata.json': { publishedVersionId: null },
				'projects/alpha-p1/folders/f1/folder.json': { id: 'f1', name: 'F1' },
				'projects/alpha-p1/folders/f1/folders/f2/workflows/deep-w2/workflow.json': workflow(
					'w2',
					'Deep',
				),
				'projects/alpha-p1/credentials/gh-c1/credential.json': credential('c1'),
				'projects/alpha-p1/variables/region/variable.json': variable('REGION'),
				'credentials/gh-c2/credential.json': credential('c2'),
				'variables/region/variable.json': variable('REGION'),
				'README.md': 'ignored',
			}),
		);

		expect(inventory.projects).toEqual([{ path: 'projects/alpha-p1', id: 'p1', name: 'Alpha' }]);
		expect(inventory.workflows.map(({ content, ...rest }) => rest)).toEqual([
			{
				path: 'projects/alpha-p1/folders/f1/folders/f2/workflows/deep-w2/workflow.json',
				projectId: 'p1',
				id: 'w2',
				name: 'Deep',
			},
			{
				path: 'projects/alpha-p1/workflows/root-w1/workflow.json',
				projectId: 'p1',
				id: 'w1',
				name: 'Root',
			},
		]);
		expect(inventory.workflows[0].content.nodes).toEqual([]);
		expect(inventory.credentials).toEqual([
			{ path: 'credentials/gh-c2/credential.json', projectId: null, credential: credential('c2') },
			{
				path: 'projects/alpha-p1/credentials/gh-c1/credential.json',
				projectId: 'p1',
				credential: credential('c1'),
			},
		]);
		expect(inventory.variables).toEqual([
			{
				path: 'projects/alpha-p1/variables/region/variable.json',
				projectId: 'p1',
				variable: variable('REGION'),
			},
			{ path: 'variables/region/variable.json', projectId: null, variable: variable('REGION') },
		]);
	});

	it("accepts a workflow nested two folders deep in the export's flat layout", async () => {
		// The export nests deeper folders as bare slugs (`folders/<a>/<b>/...`), so
		// the reader must not require a repeated `folders/` segment per level.
		const inventory = await reader.read(
			sourceOf({
				'projects/alpha-p1/project.json': project('p1', 'Alpha'),
				'projects/alpha-p1/folders/ops-f1/folder.json': { id: 'f1', name: 'Ops' },
				'projects/alpha-p1/folders/ops-f1/orders-f2/folder.json': { id: 'f2', name: 'Orders' },
				'projects/alpha-p1/folders/ops-f1/orders-f2/workflows/deep-w1/workflow.json': workflow(
					'w1',
					'Deep',
				),
			}),
		);

		expect(inventory.workflows.map(({ content, ...rest }) => rest)).toEqual([
			{
				path: 'projects/alpha-p1/folders/ops-f1/orders-f2/workflows/deep-w1/workflow.json',
				projectId: 'p1',
				id: 'w1',
				name: 'Deep',
			},
		]);
	});

	it('retains project metadata from the package', async () => {
		const metadata = {
			...project('p1'),
			icon: { type: 'icon', value: '' },
			description: '',
			customTelemetryTags: [{ key: ' team ', value: ' Sales ' }],
		};
		const inventory = await reader.read(sourceOf({ 'projects/p1/project.json': metadata }));
		expect(inventory.projects).toEqual([{ path: 'projects/p1', ...metadata }]);
	});

	it('returns an empty inventory for a directory without entity files', async () => {
		expect(await reader.read(sourceOf({ 'manifest.json': '{}' }))).toEqual({
			projects: [],
			workflows: [],
			credentials: [],
			variables: [],
		});
	});

	it('rejects a workflow that is not inside a project', async () => {
		await expect(
			reader.read(sourceOf({ 'workflows/w1/workflow.json': workflow('w1') })),
		).rejects.toThrow(
			'Package workflow file at workflows/w1/workflow.json is not inside a project.',
		);
	});

	it('rejects a file inside a project directory that has no project.json', async () => {
		await expect(
			reader.read(sourceOf({ 'projects/orphan/workflows/w1/workflow.json': workflow('w1') })),
		).rejects.toThrow('is inside "projects/orphan", which has no project.json');
	});

	it.each([
		['projects/p1/project.json', 'projects/p1/nested/project.json', project('p2')],
		['projects/p1/project.json', 'projects/p1/workflow.json', workflow('w1')],
		['projects/p1/project.json', 'projects/p1/folders/f1/workflow.json', workflow('w1')],
		// `folders/` with no folder entry before `workflows/` is malformed.
		['projects/p1/project.json', 'projects/p1/folders/workflows/w1/workflow.json', workflow('w1')],
		['projects/p1/project.json', 'projects/p1/credentials/credential.json', credential('c1')],
		['projects/p1/project.json', 'variables/a/b/variable.json', variable('A')],
	])(
		'rejects an entity file in an unsupported location (%s, %s)',
		async (projectPath, path, content) => {
			await expect(
				reader.read(sourceOf({ [projectPath]: project('p1'), [path]: content })),
			).rejects.toThrow(`file at ${path} is not in a supported location.`);
		},
	);

	it('rejects duplicate ids across the package', async () => {
		await expect(
			reader.read(
				sourceOf({
					'projects/a/project.json': project('p1'),
					'projects/b/project.json': project('p2'),
					'projects/a/workflows/x/workflow.json': workflow('w1'),
					'projects/b/workflows/y/workflow.json': workflow('w1'),
				}),
			),
		).rejects.toThrow('Package contains a duplicate workflow id: w1');
	});

	it('rejects the same variable name twice in one scope but allows it in different scopes', async () => {
		// The package schema permits '/' in IDs and names, so joined keys can collide.
		const shared = {
			'projects/a/project.json': project('p1'),
			'projects/a/variables/x/variable.json': variable('REGION'),
			'projects/a/variables/y/variable.json': variable('a/REGION'),
			'projects/b/project.json': project('p1/a'),
			'projects/b/variables/x/variable.json': variable('REGION'),
			'variables/x/variable.json': variable('REGION'),
		};

		await expect(reader.read(sourceOf(shared))).resolves.toHaveProperty('variables.length', 4);
		await expect(
			reader.read(sourceOf({ ...shared, 'variables/y/variable.json': variable('REGION') })),
		).rejects.toThrow('Package contains a duplicate variable name in one scope: /REGION');
	});

	it.each([
		['is not valid JSON', 'not json'],
		['failed schema validation', { id: 'w1', name: 'No nodes' }],
	])('rejects a recognized file that %s', async (message, content) => {
		await expect(
			reader.read(
				sourceOf({
					'projects/a/project.json': project('p1'),
					'projects/a/workflows/x/workflow.json': content,
				}),
			),
		).rejects.toThrow(`Package workflow file at projects/a/workflows/x/workflow.json ${message}`);
	});
});
