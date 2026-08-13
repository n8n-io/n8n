import { mock } from 'vitest-mock-extended';

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
	const parser = new N8nPackageParser(mock<WorkflowSerializer>());

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
});
