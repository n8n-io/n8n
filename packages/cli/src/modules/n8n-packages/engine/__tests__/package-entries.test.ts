import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DirectoryPackageReader } from '../../io/directory/directory-package-reader';
import { readPackageEntries } from '../package-entries';

const limits = {
	maxUncompressedBytes: 10 * 1024 * 1024,
	maxEntryBytes: 1024 * 1024,
	maxEntries: 1000,
	maxPathLength: 1024,
};

describe('readPackageEntries', () => {
	let root: string;

	const writeTree = async (files: Record<string, string>) => {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(root, filePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};
	const entity = (id: string, name: string) => JSON.stringify({ id, name });
	const readEntries = async () =>
		await readPackageEntries(new DirectoryPackageReader(root, limits));

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'n8n-package-entries-'));
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

		expect(await readEntries()).toEqual({
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

		expect((await readEntries()).variables).toEqual([
			{
				id: 'projects/alpha/variables/api-key',
				name: 'API_KEY',
				target: 'projects/alpha/variables/api-key',
			},
		]);
	});

	it('sorts entries by target, so the same package always yields the same order', async () => {
		await writeTree({
			'projects/alpha/workflows/c/workflow.json': entity('w3', 'C'),
			'projects/alpha/workflows/a/workflow.json': entity('w1', 'A'),
			'projects/alpha/workflows/b/workflow.json': entity('w2', 'B'),
		});

		expect((await readEntries()).workflows.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
	});

	it('ignores files that do not hold an entity', async () => {
		await writeTree({
			'projects/alpha/README.md': '# Alpha',
			'projects/alpha/workflows/invoice/workflow.json': entity('w1', 'Invoice'),
			'projects/alpha/workflows/invoice/notes.json': entity('nope', 'Nope'),
		});

		expect((await readEntries()).workflows).toEqual([
			{ id: 'w1', name: 'Invoice', target: 'projects/alpha/workflows/invoice' },
		]);
	});

	it('rejects a symbolic link instead of reading through it', async () => {
		const outside = await mkdtemp(path.join(tmpdir(), 'n8n-package-outside-'));
		await mkdir(path.join(outside, 'secret'), { recursive: true });
		await writeFile(path.join(outside, 'secret/workflow.json'), entity('w-secret', 'Secret'));
		await mkdir(path.join(root, 'projects/alpha'), { recursive: true });
		await symlink(outside, path.join(root, 'projects/alpha/workflows'));

		try {
			await expect(readEntries()).rejects.toThrow('disallowed entry type');
		} finally {
			await rm(outside, { recursive: true, force: true });
		}
	});

	it('rejects an entity file it cannot read an identity from', async () => {
		await writeTree({ 'projects/alpha/workflows/broken/workflow.json': '{ not json' });

		await expect(readEntries()).rejects.toThrow(
			'Package holds an entity without an id or a name at "projects/alpha/workflows/broken"',
		);
	});

	it('rejects an entity file that has no id, unless it is a variable', async () => {
		await writeTree({
			'projects/alpha/workflows/nameless/workflow.json': JSON.stringify({ name: 'Nameless' }),
		});

		await expect(readEntries()).rejects.toThrow(
			'Package holds an entity without an id or a name at "projects/alpha/workflows/nameless"',
		);
	});
});
