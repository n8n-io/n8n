import type { Folder, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { jsonParse } from 'n8n-workflow';

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
	const exporter = new FolderExporter(finder, new FolderSerializer());
	return { exporter, finder };
}

function readJson(writer: CapturingWriter, path: string): Record<string, unknown> {
	const file = writer.files.find((f) => f.path === path);
	if (!file) {
		throw new Error(
			`no file written at ${path}; got ${writer.files.map((f) => f.path).join(', ')}`,
		);
	}
	return jsonParse<Record<string, unknown>>(file.content);
}

describe('FolderExporter', () => {
	it('asks the finder for the folders using the folder:read scope', async () => {
		const { exporter, finder } = makeExporter([makeFolder()]);

		await exporter.export({ user, folderIds: ['fld-1'], writer: new CapturingWriter() });

		expect(finder.findFolderSubtreesForUser).toHaveBeenCalledWith(['fld-1'], user, ['folder:read']);
	});

	it('writes a single empty folder as a shell with a manifest entry', async () => {
		const { exporter } = makeExporter([makeFolder()]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({ user, folderIds: ['fld-1'], writer });

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ id: 'fld-1', name: 'to_production' });
		expect(entries[0].target).toMatch(/^folders\//);
		const { target } = entries[0];
		expect(writer.directories).toContain(target);
		expect(readJson(writer, `${target}/folder.json`)).toEqual({
			id: 'fld-1',
			name: 'to_production',
			parentFolderId: null,
		});
	});

	it('aborts the whole export when a requested folder is missing or inaccessible', async () => {
		const { exporter } = makeExporter([makeFolder({ id: 'present' })]);

		await expect(
			exporter.export({ user, folderIds: ['present', 'gone'], writer: new CapturingWriter() }),
		).rejects.toThrow(/1 folder\(s\) not found or not accessible/);
	});

	it('nests a sub-folder directly under its parent and keeps the in-package parent id', async () => {
		const parent = makeFolder({ id: 'parent', name: 'in_progress' });
		const child = makeFolder({ id: 'child', name: 'nested', parentFolderId: 'parent' });
		const { exporter } = makeExporter([parent, child]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			folderIds: ['parent'],
			writer,
		});

		const parentEntry = entries.find((e) => e.id === 'parent')!;
		const childEntry = entries.find((e) => e.id === 'child')!;
		// Child sits one segment below the parent dir — no repeated "folders/" segment.
		expect(childEntry.target).toMatch(new RegExp(`^${parentEntry.target}/[^/]+$`));
		expect(readJson(writer, `${parentEntry.target}/folder.json`).parentFolderId).toBeNull();
		expect(readJson(writer, `${childEntry.target}/folder.json`).parentFolderId).toBe('parent');
	});

	it('re-roots a folder whose parent is outside the exported set to null', async () => {
		const orphan = makeFolder({ id: 'child', name: 'nested', parentFolderId: 'not-in-export' });
		const { exporter } = makeExporter([orphan]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({ user, folderIds: ['child'], writer });

		expect(readJson(writer, `${entries[0].target}/folder.json`).parentFolderId).toBeNull();
	});

	it('orders same-named siblings by createdAt so the oldest keeps the bare slug', async () => {
		const older = makeFolder({
			id: 'older',
			name: 'in_progress',
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
		});
		const newer = makeFolder({
			id: 'newer',
			name: 'in_progress',
			createdAt: new Date('2026-02-01T00:00:00.000Z'),
		});
		// Finder returns them newest-first; the exporter must still sort oldest-first.
		const { exporter } = makeExporter([newer, older]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({ user, folderIds: ['older', 'newer'], writer });

		expect(entries.find((e) => e.id === 'older')!.target).toBe('folders/inprogress');
		expect(entries.find((e) => e.id === 'newer')!.target).toBe('folders/inprogress-2');
	});

	it('honors basePrefix so the tree composes under a project namespace', async () => {
		const { exporter } = makeExporter([makeFolder()]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			folderIds: ['fld-1'],
			writer,
			basePrefix: 'projects/team-ligo',
		});

		expect(entries[0].target).toMatch(/^projects\/team-ligo\/folders\//);
	});
});
