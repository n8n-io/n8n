import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { N8N_VERSION } from '@/constants';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';

import { readLeftoverManifest, writeImportManifest } from '../import-manifest-bridge';

describe('import-manifest-bridge', () => {
	let exportFolder: string;

	beforeEach(async () => {
		exportFolder = await mkdtemp(path.join(tmpdir(), 'n8n-import-manifest-'));
	});

	afterEach(async () => {
		await rm(exportFolder, { recursive: true, force: true });
	});

	const writeTree = async (files: Record<string, string>) => {
		for (const [relative, content] of Object.entries(files)) {
			const fullPath = path.join(exportFolder, relative);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};

	const leftoverManifest = (overrides: Record<string, unknown> = {}) =>
		JSON.stringify(
			packageManifestSchema.parse({
				packageFormatVersion: '1',
				exportedAt: '2026-01-01T00:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'old',
				...overrides,
			}),
		);

	it('reads a leftover manifest and ignores a malformed file', async () => {
		await writeTree({
			'manifest.json': JSON.stringify(
				packageManifestSchema.parse({
					packageFormatVersion: '1',
					exportedAt: '2026-01-01T00:00:00.000Z',
					sourceN8nVersion: '1.0.0',
					sourceId: 'inst-1',
					workflows: [{ id: 'w1', name: 'W1', target: 'projects/alpha/workflows/w1' }],
				}),
			),
		});

		expect((await readLeftoverManifest(exportFolder))?.workflows).toEqual([
			{ id: 'w1', name: 'W1', target: 'projects/alpha/workflows/w1' },
		]);

		await writeFile(path.join(exportFolder, 'manifest.json'), '{not-json');
		expect(await readLeftoverManifest(exportFolder)).toBeUndefined();
	});

	it('writes an inventory of the files on disk, not only the staging selection', async () => {
		await writeTree({
			'manifest.json': leftoverManifest({
				variables: [{ id: 'v-old', name: 'API_KEY', target: 'projects/alpha/variables/api-key' }],
				workflows: [{ id: 'w1', name: 'W1', target: 'projects/alpha/workflows/w1' }],
			}),
			'projects/alpha/project.json': JSON.stringify({ id: 'p1', name: 'Alpha' }),
			'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ id: 'w1', name: 'W1' }),
			'projects/alpha/workflows/w2/workflow.json': JSON.stringify({ id: 'w2', name: 'W2' }),
			'projects/alpha/credentials/c1/credential.json': JSON.stringify({ id: 'c1', name: 'C1' }),
			'projects/alpha/variables/api-key/variable.json': JSON.stringify({ name: 'API_KEY' }),
		});

		await writeImportManifest({
			exportFolder,
			staging: packageManifestSchema.parse({
				packageFormatVersion: '1',
				exportedAt: '2026-01-01T00:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'inst-1',
				workflows: [{ id: 'w2', name: 'W2', target: 'projects/alpha/workflows/w2' }],
			}),
			sourceId: 'inst-test',
		});

		const written = packageManifestSchema.parse(
			JSON.parse(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')),
		);
		expect(written.sourceId).toBe('inst-test');
		expect(written.sourceN8nVersion).toBe(N8N_VERSION);
		expect(written.projects).toEqual([{ id: 'p1', name: 'Alpha', target: 'projects/alpha' }]);
		expect(written.workflows).toEqual(
			expect.arrayContaining([
				{ id: 'w1', name: 'W1', target: 'projects/alpha/workflows/w1' },
				{ id: 'w2', name: 'W2', target: 'projects/alpha/workflows/w2' },
			]),
		);
		expect(written.credentials).toEqual([
			{ id: 'c1', name: 'C1', target: 'projects/alpha/credentials/c1' },
		]);
		expect(written.variables).toEqual([
			{ id: 'v-old', name: 'API_KEY', target: 'projects/alpha/variables/api-key' },
		]);
	});

	it('unions usedByWorkflows when leftover and staging share a requirement key', async () => {
		await writeTree({
			'manifest.json': leftoverManifest({
				requirements: {
					tags: [
						{ id: 't-shared', name: 'prod', usedByWorkflows: ['w1', 'w2'] },
						{ id: 't-w1-only', name: 'draft', usedByWorkflows: ['w1'] },
					],
				},
			}),
			'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ id: 'w1', name: 'W1' }),
			'projects/alpha/workflows/w2/workflow.json': JSON.stringify({ id: 'w2', name: 'W2' }),
		});

		await writeImportManifest({
			exportFolder,
			staging: packageManifestSchema.parse({
				packageFormatVersion: '1',
				exportedAt: '2026-01-01T00:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'inst-1',
				requirements: {
					tags: [{ id: 't-shared', name: 'production', usedByWorkflows: ['w2'] }],
				},
			}),
			sourceId: 'inst-test',
		});

		const written = packageManifestSchema.parse(
			JSON.parse(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')),
		);
		expect(written.requirements?.tags).toEqual([
			{ id: 't-shared', name: 'production', usedByWorkflows: ['w1', 'w2'] },
			{ id: 't-w1-only', name: 'draft', usedByWorkflows: ['w1'] },
		]);
	});

	it('drops leftover requirement users that the staging selection no longer lists', async () => {
		await writeTree({
			'manifest.json': leftoverManifest({
				requirements: {
					tags: [{ id: 't-dropped', name: 'prod', usedByWorkflows: ['w2'] }],
				},
			}),
			'projects/alpha/workflows/w2/workflow.json': JSON.stringify({ id: 'w2', name: 'W2' }),
		});

		await writeImportManifest({
			exportFolder,
			staging: packageManifestSchema.parse({
				packageFormatVersion: '1',
				exportedAt: '2026-01-01T00:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'inst-1',
				workflows: [{ id: 'w2', name: 'W2', target: 'projects/alpha/workflows/w2' }],
			}),
			sourceId: 'inst-test',
		});

		const written = packageManifestSchema.parse(
			JSON.parse(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')),
		);
		expect(written.requirements?.tags).toBeUndefined();
	});

	it('ignores a leftover variable target that escapes the export folder', async () => {
		const outsideDir = path.join(path.dirname(exportFolder), 'escape');
		await mkdir(outsideDir, { recursive: true });
		await writeFile(path.join(outsideDir, 'variable.json'), JSON.stringify({ name: 'LEAK' }));
		await writeTree({
			'manifest.json': leftoverManifest({
				variables: [{ id: 'v-leak', name: 'LEAK', target: '../escape' }],
			}),
			'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ id: 'w1', name: 'W1' }),
		});

		await writeImportManifest({
			exportFolder,
			staging: packageManifestSchema.parse({
				packageFormatVersion: '1',
				exportedAt: '2026-01-01T00:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'inst-1',
			}),
			sourceId: 'inst-test',
		});

		const written = packageManifestSchema.parse(
			JSON.parse(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')),
		);
		expect(written.variables).toBeUndefined();
	});

	it('ignores a leftover variable whose file is a symbolic link', async () => {
		const outside = path.join(path.dirname(exportFolder), 'outside-variable.json');
		await writeFile(outside, JSON.stringify({ name: 'LINK' }));
		const variableDir = path.join(exportFolder, 'projects', 'alpha', 'variables', 'api-key');
		await mkdir(variableDir, { recursive: true });
		await symlink(outside, path.join(variableDir, 'variable.json'));
		await writeTree({
			'manifest.json': leftoverManifest({
				variables: [{ id: 'v-link', name: 'LINK', target: 'projects/alpha/variables/api-key' }],
			}),
			'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ id: 'w1', name: 'W1' }),
		});

		await writeImportManifest({
			exportFolder,
			staging: packageManifestSchema.parse({
				packageFormatVersion: '1',
				exportedAt: '2026-01-01T00:00:00.000Z',
				sourceN8nVersion: '1.0.0',
				sourceId: 'inst-1',
			}),
			sourceId: 'inst-test',
		});

		const written = packageManifestSchema.parse(
			JSON.parse(await readFile(path.join(exportFolder, 'manifest.json'), 'utf-8')),
		);
		expect(written.variables).toBeUndefined();
	});
});
