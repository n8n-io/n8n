import type { Folder, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { FolderFinderService } from '@/services/folder-finder.service';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import { FolderExporter } from '../folder.exporter';
import { FolderSerializer } from '../folder.serializer';

const user = mock<User>({ id: 'user-1' });

function makeFolder(overrides: Partial<Folder> = {}): Folder {
	return {
		id: 'fld-1',
		name: 'to_production',
		parentFolderId: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides,
	} as unknown as Folder;
}

function makeExporter(found: Folder[]) {
	const finder = mock<FolderFinderService>();
	finder.findFolderSubtreesForUser.mockResolvedValue(found);
	return new FolderExporter(finder, new FolderSerializer());
}

// The folder-export behaviour (shells, nesting, re-rooting, sibling ordering,
// access control) is proven end-to-end in export-folder.integration.test.ts.
// Only `basePrefix` is left here: it's the composition seam a ProjectExporter
// uses (LIGO-685) and is unreachable through service.exportPackage, so the
// integration test cannot cover it.
describe('FolderExporter', () => {
	it('honors basePrefix so the tree composes under a project namespace', async () => {
		const exporter = makeExporter([makeFolder()]);

		const { entries } = await exporter.export({
			user,
			folderIds: ['fld-1'],
			writer: new CapturingWriter(),
			basePrefix: 'projects/team-ligo',
		});

		expect(entries[0].target).toMatch(/^projects\/team-ligo\/folders\//);
	});
});
