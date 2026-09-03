import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CredentialRequirementsExtractor } from '../../entities/credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '../../entities/data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '../../entities/variable/variable-requirements.extractor';
import { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import { DirectoryPackageReader } from '../../io/directory/directory-package-reader';
import { PackageContentsReader } from '../package-contents';

const limits = {
	maxUncompressedBytes: 10 * 1024 * 1024,
	maxEntryBytes: 1024 * 1024,
	maxEntries: 1000,
	maxPathLength: 1024,
};

const entity = (id: string, name: string) => JSON.stringify({ id, name });

const node = (overrides: Record<string, unknown> = {}) => ({
	id: 'n1',
	name: 'Node',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

/** What an export writes for a workflow. */
const workflow = (id: string, name = id.toUpperCase(), overrides: Record<string, unknown> = {}) =>
	JSON.stringify({
		id,
		name,
		nodes: [],
		connections: {},
		versionId: `version-${id}`,
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
		...overrides,
	});

describe('PackageContentsReader', () => {
	let root: string;

	const reader = new PackageContentsReader(
		new WorkflowSerializer(),
		new CredentialRequirementsExtractor(),
		new DataTableRequirementsExtractor(),
		new VariableRequirementsExtractor(),
	);

	const writeTree = async (files: Record<string, string>) => {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(root, filePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};
	const read = async () => await reader.read(new DirectoryPackageReader(root, limits));

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'n8n-package-contents-'));
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	describe('entries', () => {
		it('reads one entry per entity file, keyed by the directory that holds it', async () => {
			await writeTree({
				'manifest.json': '{"packageFormatVersion":"1"}',
				'projects/alpha/project.json': entity('p1', 'Alpha'),
				'projects/alpha/folders/sales/folder.json': entity('f1', 'Sales'),
				'projects/alpha/folders/sales/workflows/invoice/workflow.json': workflow('w1', 'Invoice'),
				'projects/alpha/credentials/stripe/credential.json': entity('c1', 'Stripe'),
				'projects/alpha/data-tables/leads/data-table.json': entity('d1', 'Leads'),
				'tags/urgent/tag.json': entity('t1', 'Urgent'),
			});

			expect(await read()).toEqual({
				projects: [{ id: 'p1', name: 'Alpha', target: 'projects/alpha' }],
				folders: [{ id: 'f1', name: 'Sales', target: 'projects/alpha/folders/sales' }],
				workflows: [
					{ id: 'w1', name: 'Invoice', target: 'projects/alpha/folders/sales/workflows/invoice' },
				],
				credentials: [{ id: 'c1', name: 'Stripe', target: 'projects/alpha/credentials/stripe' }],
				dataTables: [{ id: 'd1', name: 'Leads', target: 'projects/alpha/data-tables/leads' }],
				variables: [],
				tags: [{ id: 't1', name: 'Urgent', target: 'tags/urgent' }],
			});
		});

		it('identifies a variable by its directory, because the file carries no id', async () => {
			await writeTree({
				'projects/alpha/variables/api-key/variable.json': JSON.stringify({
					name: 'API_KEY',
					type: 'string',
				}),
			});

			expect((await read()).variables).toEqual([
				{
					id: 'projects/alpha/variables/api-key',
					name: 'API_KEY',
					target: 'projects/alpha/variables/api-key',
				},
			]);
		});

		it('sorts entries by target, so the same package always yields the same order', async () => {
			await writeTree({
				'projects/alpha/workflows/c/workflow.json': workflow('w3'),
				'projects/alpha/workflows/a/workflow.json': workflow('w1'),
				'projects/alpha/workflows/b/workflow.json': workflow('w2'),
			});

			expect((await read()).workflows.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
		});

		it('ignores files that do not hold an entity', async () => {
			await writeTree({
				'projects/alpha/README.md': '# Alpha',
				'projects/alpha/workflows/invoice/workflow.json': workflow('w1', 'Invoice'),
				'projects/alpha/workflows/invoice/notes.json': entity('nope', 'Nope'),
			});

			expect((await read()).workflows).toEqual([
				{ id: 'w1', name: 'Invoice', target: 'projects/alpha/workflows/invoice' },
			]);
		});

		it('rejects a symbolic link instead of reading through it', async () => {
			const outside = await mkdtemp(path.join(tmpdir(), 'n8n-package-outside-'));
			await mkdir(path.join(outside, 'secret'), { recursive: true });
			await writeFile(path.join(outside, 'secret/workflow.json'), workflow('w-secret'));
			await mkdir(path.join(root, 'projects/alpha'), { recursive: true });
			await symlink(outside, path.join(root, 'projects/alpha/workflows'));

			try {
				await expect(read()).rejects.toThrow('disallowed entry type');
			} finally {
				await rm(outside, { recursive: true, force: true });
			}
		});

		it('rejects an entity file it cannot read an identity from', async () => {
			await writeTree({ 'projects/alpha/credentials/broken/credential.json': '{ not json' });

			await expect(read()).rejects.toThrow(
				'Package holds an entity without an id or a name at "projects/alpha/credentials/broken"',
			);
		});

		it('rejects an entity file that has no id, unless it is a variable', async () => {
			await writeTree({
				'projects/alpha/credentials/nameless/credential.json': JSON.stringify({
					name: 'Nameless',
				}),
			});

			await expect(read()).rejects.toThrow(
				'Package holds an entity without an id or a name at "projects/alpha/credentials/nameless"',
			);
		});

		it('rejects a workflow file that is not a valid export', async () => {
			await writeTree({
				'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ id: 'w1', name: 'W1' }),
			});

			await expect(read()).rejects.toThrow('failed validation at "projects/alpha/workflows/w1"');
		});
	});

	describe('requirements', () => {
		it('collects a credential from the node that references it', async () => {
			await writeTree({
				'projects/alpha/workflows/w1/workflow.json': workflow('w1', 'W1', {
					nodes: [node({ credentials: { httpBasicAuth: { id: 'c1', name: 'Stripe' } } })],
				}),
			});

			expect((await read()).requirements?.credentials).toEqual([
				{ id: 'c1', name: 'Stripe', type: 'httpBasicAuth', usedByWorkflows: ['w1'] },
			]);
		});

		it('folds one dependency used by two workflows into one requirement', async () => {
			const nodes = [node({ credentials: { httpBasicAuth: { id: 'c1', name: 'Stripe' } } })];
			await writeTree({
				'projects/alpha/workflows/a/workflow.json': workflow('w1', 'W1', { nodes }),
				'projects/alpha/workflows/b/workflow.json': workflow('w2', 'W2', { nodes }),
			});

			expect((await read()).requirements?.credentials).toEqual([
				{ id: 'c1', name: 'Stripe', type: 'httpBasicAuth', usedByWorkflows: ['w1', 'w2'] },
			]);
		});

		it('lists the users of a dependency in a stable order, whatever the reads do', async () => {
			const nodes = [node({ credentials: { httpBasicAuth: { id: 'c1', name: 'Stripe' } } })];
			await writeTree(
				Object.fromEntries(
					// More files than one read batch, to shuffle the completion order.
					Array.from({ length: 40 }, (_, i) => [
						`projects/alpha/workflows/w${String(i).padStart(2, '0')}/workflow.json`,
						workflow(`w${String(i).padStart(2, '0')}`, 'W', { nodes }),
					]),
				),
			);

			const first = (await read()).requirements?.credentials?.[0].usedByWorkflows;
			const second = (await read()).requirements?.credentials?.[0].usedByWorkflows;

			expect(first).toEqual(second);
			expect(first?.[0]).toBe('w00');
		});

		it('collects a variable from an expression, in a parameter and in the settings', async () => {
			await writeTree({
				'projects/alpha/workflows/w1/workflow.json': workflow('w1', 'W1', {
					nodes: [node({ parameters: { url: '={{ $vars.API_HOST }}/orders' } })],
					settings: { errorWorkflow: '={{ $vars["FALLBACK"] }}' },
				}),
			});

			expect((await read()).requirements?.variables).toEqual([
				{ name: 'API_HOST', usedByWorkflows: ['w1'] },
				{ name: 'FALLBACK', usedByWorkflows: ['w1'] },
			]);
		});

		it('names a tag from the bundled tag entry, and falls back to its id', async () => {
			await writeTree({
				'tags/urgent/tag.json': entity('t1', 'Urgent'),
				'projects/alpha/workflows/w1/workflow.json': workflow('w1', 'W1', {
					tagIds: ['t1', 't-unbundled'],
				}),
			});

			expect((await read()).requirements?.tags).toEqual([
				{ id: 't1', name: 'Urgent', usedByWorkflows: ['w1'] },
				{ id: 't-unbundled', name: 't-unbundled', usedByWorkflows: ['w1'] },
			]);
		});

		it('names a referenced workflow when the package holds it', async () => {
			await writeTree({
				'projects/alpha/workflows/child/workflow.json': workflow('w-child', 'Child'),
				'projects/alpha/workflows/w1/workflow.json': workflow('w1', 'W1', {
					nodes: [
						node({
							type: 'n8n-nodes-base.executeWorkflow',
							parameters: { workflowId: { __rl: true, mode: 'list', value: 'w-child' } },
						}),
					],
				}),
			});

			expect((await read()).requirements?.workflows).toEqual([
				{ id: 'w-child', name: 'Child', usedByWorkflows: ['w1'] },
			]);
		});

		it('folds node types into unique type and version pairs', async () => {
			await writeTree({
				'projects/alpha/workflows/w1/workflow.json': workflow('w1', 'W1', {
					nodes: [node(), node({ id: 'n2', typeVersion: 2 })],
				}),
			});

			expect((await read()).requirements?.nodeTypes).toEqual([
				{ type: 'n8n-nodes-base.httpRequest', typeVersion: 1, usedByWorkflows: ['w1'] },
				{ type: 'n8n-nodes-base.httpRequest', typeVersion: 2, usedByWorkflows: ['w1'] },
			]);
		});

		it('states nothing for a package whose workflows need nothing', async () => {
			await writeTree({ 'projects/alpha/workflows/w1/workflow.json': workflow('w1') });

			expect((await read()).requirements).toBeUndefined();
		});
	});
});
