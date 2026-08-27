import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import type { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import type { PackageReader } from '../../io/package-reader';
import { FORMAT_VERSION } from '../../spec/constants';
import type { PackageManifest } from '../../spec/manifest.schema';
import { N8nPackageParser } from '../n8n-package-parser';

function makeReader(manifest: PackageManifest, files: Record<string, unknown>): PackageReader {
	return {
		readManifest: async () => await Promise.resolve(manifest),
		readFile: async (path: string) => {
			if (!(path in files)) throw new Error(`missing file ${path}`);
			return await Promise.resolve(Buffer.from(JSON.stringify(files[path]), 'utf-8'));
		},
		listEntries: async () => await Promise.resolve(Object.keys(files)),
	};
}

function baseManifest(): PackageManifest {
	return {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: '2026-01-01T00:00:00.000Z',
		sourceN8nVersion: '1.0.0',
		sourceId: 'test-source',
		projects: [{ id: 'proj-1', name: 'billing', target: 'projects/billing' }],
	} as PackageManifest;
}

describe('N8nPackageParser.getProjects — custom span attributes', () => {
	const parser = new N8nPackageParser(
		mock<Logger>(),
		mock<NodeTypes>(),
		mock<WorkflowSerializer>(),
	);

	it('reads customTelemetryTags into the prepared project', async () => {
		const reader = makeReader(baseManifest(), {
			'projects/billing/project.json': {
				id: 'proj-1',
				name: 'billing',
				customTelemetryTags: [
					{ key: 'team', value: 'ligo' },
					{ key: 'env', value: 'prod' },
				],
			},
		});

		const [project] = await parser.getProjects(reader);

		expect(project.customTelemetryTags).toEqual([
			{ key: 'team', value: 'ligo' },
			{ key: 'env', value: 'prod' },
		]);
	});

	it('tolerates a project.json without the field (older packages)', async () => {
		const reader = makeReader(baseManifest(), {
			'projects/billing/project.json': { id: 'proj-1', name: 'billing' },
		});

		const [project] = await parser.getProjects(reader);

		expect(project.customTelemetryTags).toBeUndefined();
	});

	it('validates each package manifest only once', async () => {
		const reader = makeReader(baseManifest(), {});
		const readManifest = vi.spyOn(reader, 'readManifest');

		await parser.getManifest(reader);
		await parser.getManifest(reader);

		expect(readManifest).toHaveBeenCalledOnce();
	});

	it('reads and releases data table schemas only once', async () => {
		const path = 'data-tables/orders/data-table.json';
		const files: Record<string, unknown> = {
			[path]: { id: 'dtsource1', name: 'Orders', columns: [] },
		};
		const reader = {
			...makeReader(
				{
					...baseManifest(),
					dataTables: [{ id: 'dtsource1', name: 'Orders', target: 'data-tables/orders' }],
				},
				files,
			),
			releaseFile: vi.fn((releasedPath: string) => {
				delete files[releasedPath];
			}),
		};
		const readFile = vi.spyOn(reader, 'readFile');

		await parser.getDataTables(reader);
		await parser.getDataTables(reader);

		expect(readFile).toHaveBeenCalledOnce();
		expect(reader.releaseFile).toHaveBeenCalledExactlyOnceWith(path);
	});

	it('releases malformed JSON files', async () => {
		const path = 'projects/billing/project.json';
		const releaseFile = vi.fn();
		const reader: PackageReader = {
			readManifest: async () => await Promise.resolve(baseManifest()),
			readFile: async () => await Promise.resolve(Buffer.from('{not-json')),
			releaseFile,
			listEntries: async () => await Promise.resolve([path]),
		};

		await expect(parser.getProjects(reader)).rejects.toThrow(/not valid JSON/i);
		expect(releaseFile).toHaveBeenCalledExactlyOnceWith(path);
	});
});
