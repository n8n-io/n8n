import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readExportTree } from '../export-tree';

describe('readExportTree', () => {
	let root: string;

	const writeTree = async (files: Record<string, string>) => {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(root, filePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};
	const entity = (id: string, name: string) => JSON.stringify({ id, name });

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'n8n-export-tree-'));
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it('reads one entry per entity file, keyed by the directory that holds it', async () => {
		await writeTree({
			'manifest.json': '{"packageFormatVersion":"1"}',
			'projects/alpha/project.json': entity('p1', 'Alpha'),
			'projects/alpha/folders/sales/folder.json': entity('f1', 'Sales'),
			'projects/alpha/folders/sales/workflows/invoice/workflow.json': entity('w1', 'Invoice'),
			'projects/alpha/credentials/stripe/credential.json': entity('c1', 'Stripe'),
			'projects/alpha/data-tables/leads/data-table.json': entity('d1', 'Leads'),
			'tags/urgent/tag.json': entity('t1', 'Urgent'),
		});

		const tree = await readExportTree(root);

		expect(tree).toEqual({
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

		const tree = await readExportTree(root);

		expect(tree.variables).toEqual([
			{
				id: 'projects/alpha/variables/api-key',
				name: 'API_KEY',
				target: 'projects/alpha/variables/api-key',
			},
		]);
	});

	it('sorts entries by target, so the same tree always yields the same order', async () => {
		await writeTree({
			'projects/alpha/workflows/c/workflow.json': entity('w3', 'C'),
			'projects/alpha/workflows/a/workflow.json': entity('w1', 'A'),
			'projects/alpha/workflows/b/workflow.json': entity('w2', 'B'),
		});

		const tree = await readExportTree(root);

		expect(tree.workflows?.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
	});

	it('ignores files that do not mark an entity', async () => {
		await writeTree({
			'projects/alpha/project.json': entity('p1', 'Alpha'),
			'projects/alpha/README.md': '# Alpha',
			'projects/alpha/workflows/invoice/workflow.json': entity('w1', 'Invoice'),
			'projects/alpha/workflows/invoice/notes.json': '{"id":"nope","name":"Nope"}',
		});

		const tree = await readExportTree(root);

		expect(tree.workflows).toEqual([
			{ id: 'w1', name: 'Invoice', target: 'projects/alpha/workflows/invoice' },
		]);
	});

	it('does not follow a symbolic link out of the working copy', async () => {
		const outside = path.join(root, '..', path.basename(root) + '-outside');
		await mkdir(path.join(outside, 'workflows/secret'), { recursive: true });
		await writeFile(
			path.join(outside, 'workflows/secret/workflow.json'),
			entity('w-secret', 'Secret'),
		);
		await mkdir(path.join(root, 'projects/alpha'), { recursive: true });
		await symlink(path.join(outside, 'workflows'), path.join(root, 'projects/alpha/workflows'));

		try {
			expect((await readExportTree(root)).workflows).toEqual([]);
		} finally {
			await rm(outside, { recursive: true, force: true });
		}
	});

	it('rejects an entity file it cannot read an identity from', async () => {
		await writeTree({ 'projects/alpha/workflows/broken/workflow.json': '{ not json' });

		await expect(readExportTree(root)).rejects.toThrow(
			'The branch holds an unreadable export file at "projects/alpha/workflows/broken"',
		);
	});

	it('rejects an entity file that has no id, unless it is a variable', async () => {
		await writeTree({
			'projects/alpha/workflows/nameless/workflow.json': JSON.stringify({ name: 'Nameless' }),
		});

		await expect(readExportTree(root)).rejects.toThrow(
			'The branch holds an unreadable export file at "projects/alpha/workflows/nameless"',
		);
	});
});
