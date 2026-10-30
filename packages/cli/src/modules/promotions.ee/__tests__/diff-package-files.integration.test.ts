import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DirectoryPackageWriter } from '@/modules/n8n-packages/io/directory/directory-package-writer';
import { HashingPackageWriter } from '@/modules/n8n-packages/io/hashing-package-writer';
import { createManifestEntry, entityFilePath } from '@/modules/n8n-packages/io/manifest-entry';

import { parseBaseBranchFiles, parsePackageFiles } from '../base-branch-files';
import { diffPackageFiles } from '../diff-package-files';
import { createFixtureGit } from './utils/git-remote-fixture';

it('compares Git and writer output without losing scoped identities, and ignores workflow metadata', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'promotion-diff-'));
	try {
		const project = 'n8n/projects/orders-Project1';
		const base = [
			{ path: `${project}/workflows/same-Same/workflow.json`, content: 'same' },
			{ path: `${project}/workflows/edit-Edit/workflow.json`, content: 'before' },
			{ path: `${project}/workflows/move-Move/workflow.json`, content: 'move' },
			{ path: `${project}/workflows/both-Both/workflow.json`, content: 'before' },
			{ path: `${project}/workflows/delete-Delete/workflow.json`, content: 'delete' },
			{ path: `${project}/workflows/published-Published/workflow.json`, content: 'same' },
			{
				path: `${project}/workflows/published-Published/workflow-metadata.json`,
				content: 'before',
			},
			{ path: `${project}/variables/api-1/variable.json`, content: 'project' },
			{ path: 'n8n/variables/api-2/variable.json', content: 'global' },
			{ path: `${project}/credentials/shared-Edit/credential.json`, content: 'credential' },
		];
		const directoryWriter = new DirectoryPackageWriter(root);
		for (const file of base) await directoryWriter.writeFile(file.path, file.content);
		const git = createFixtureGit(root);
		await git.init(['--object-format=sha1']);
		await git.add('.');
		const tree = (await git.raw(['write-tree'])).trim();
		const baseFiles = parseBaseBranchFiles(await git.raw(['ls-tree', '-r', '-z', tree]), {
			exportRoot: 'n8n',
			projectId: 'Project1',
		});
		const writer = new HashingPackageWriter();
		for (const file of base.filter(({ path }) => !path.includes('delete-Delete'))) {
			writer.writeFile(
				file.path.replace('/move-Move/', '/renamed-Move/').replace('/both-Both/', '/renamed-Both/'),
				file.content === 'before' ? 'after' : file.content,
			);
		}
		writer.writeFile(`${project}/workflows/new-New/workflow.json`, 'new');
		writer.writeFile('n8n/variables/api-2/variable.json', 'changed global');
		writer.writeFile('n8n/manifest.json', 'ignored export metadata');
		const desiredFiles = parsePackageFiles(writer.finalize(), {
			exportRoot: 'n8n',
			projectId: 'Project1',
		});
		expect(baseFiles.filter(({ type }) => type === 'variable')).toEqual([
			expect.objectContaining({
				entityId: '1',
				slug: 'api',
				projectId: 'Project1',
				fileName: 'variable.json',
			}),
			expect.objectContaining({
				entityId: '2',
				slug: 'api',
				projectId: null,
				fileName: 'variable.json',
			}),
		]);
		expect(desiredFiles.filter(({ type }) => type === 'variable')).toEqual([
			expect.objectContaining({ entityId: '1', slug: 'api', projectId: 'Project1' }),
			expect.objectContaining({ entityId: '2', slug: 'api', projectId: null }),
		]);

		const changes = diffPackageFiles(baseFiles, desiredFiles);

		expect(
			changes.map((fileChange) => {
				const file = fileChange.change === 'deleted' ? fileChange.base : fileChange.desired;
				return { entityId: file.entityId, type: file.type, change: fileChange.change };
			}),
		).toEqual(
			expect.arrayContaining([
				{ entityId: 'Edit', type: 'workflow', change: 'modified' },
				{ entityId: 'Move', type: 'workflow', change: 'renamed' },
				{ entityId: 'Both', type: 'workflow', change: 'renamed-and-modified' },
				{ entityId: 'Delete', type: 'workflow', change: 'deleted' },
				{ entityId: 'New', type: 'workflow', change: 'added' },
				{ entityId: '2', type: 'variable', change: 'modified' },
			]),
		);
		expect(changes).toHaveLength(6);
		// The metadata file changed on both sides, but it never enters the listing.
		expect([...baseFiles, ...desiredFiles].map(({ path }) => path)).not.toContainEqual(
			expect.stringContaining('workflow-metadata.json'),
		);
		expect(diffPackageFiles(baseFiles, baseFiles)).toEqual([]);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

it('reads escaped ids back from Git paths', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'promotion-diff-'));
	try {
		const projectId = 'Equipo AI6401486';
		const project = createManifestEntry('projects', 'n8n/projects', {
			id: projectId,
			name: 'Equipo AI',
		});
		const workflow = createManifestEntry('workflows', `${project.target}/workflows`, {
			id: 'Ventas & Operación',
			name: 'Daily Report',
		});
		const directoryWriter = new DirectoryPackageWriter(root);
		await directoryWriter.writeFile(entityFilePath('projects', project.target), 'project');
		await directoryWriter.writeFile(entityFilePath('workflows', workflow.target), 'workflow');
		const git = createFixtureGit(root);
		await git.init(['--object-format=sha1']);
		await git.add('.');
		const tree = (await git.raw(['write-tree'])).trim();

		const files = parseBaseBranchFiles(await git.raw(['ls-tree', '-r', '-z', tree]), {
			exportRoot: 'n8n',
			projectId,
		});

		expect(files.map(({ entityId, slug, type }) => ({ entityId, slug, type }))).toEqual([
			{ entityId: projectId, slug: 'equipo-ai', type: 'project' },
			{ entityId: 'Ventas & Operación', slug: 'daily-report', type: 'workflow' },
		]);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
