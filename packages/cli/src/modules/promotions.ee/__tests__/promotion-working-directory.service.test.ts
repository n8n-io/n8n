import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import {
	moveToTrash,
	PromotionWorkingDirectoryService,
} from '../promotion-working-directory.service';

describe('PromotionWorkingDirectoryService', () => {
	const ENVIRONMENT_ID = '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';

	let n8nFolder: string;
	let workingDirectory: PromotionWorkingDirectoryService;

	const trashFolder = () => path.join(n8nFolder, 'promotions', 'trash');

	const exists = async (target: string) =>
		await stat(target).then(
			() => true,
			() => false,
		);

	/** A checkout with pinned host keys, as a clone leaves it. */
	const createCheckout = async () => {
		const paths = workingDirectory.paths(ENVIRONMENT_ID);
		await mkdir(paths.repositoryFolder, { recursive: true });
		await writeFile(path.join(paths.repositoryFolder, 'marker'), 'repository');
		await mkdir(paths.nextRepositoryFolder, { recursive: true });
		await mkdir(paths.sshDir, { recursive: true });
		await writeFile(path.join(paths.sshDir, 'known_hosts'), 'github.com ssh-ed25519 AAAA');
		await workingDirectory.writeDescriptor({
			schemaVersion: 1,
			environmentId: ENVIRONMENT_ID,
			remoteUrl: 'git@github.com:o/r.git',
			checkoutBranchName: 'main',
		});
		return paths;
	};

	/** A file where the trash folder should be, so every move to trash fails. */
	const blockTrash = async () => {
		await mkdir(path.dirname(trashFolder()), { recursive: true });
		await writeFile(trashFolder(), 'not a folder');
	};

	beforeEach(async () => {
		n8nFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-working-directory-'));
		workingDirectory = new PromotionWorkingDirectoryService(mock<InstanceSettings>({ n8nFolder }));
	});

	afterEach(async () => {
		await rm(n8nFolder, { recursive: true, force: true });
	});

	it('puts the trash beside the environments folder', () => {
		expect(workingDirectory.paths(ENVIRONMENT_ID).trashFolder).toBe(trashFolder());
	});

	describe('resetCheckout', () => {
		it('moves the checkout to trash and keeps the host keys', async () => {
			const paths = await createCheckout();

			const trashed = await workingDirectory.resetCheckout(ENVIRONMENT_ID);

			expect(trashed).toHaveLength(2);
			for (const folder of trashed) expect(path.dirname(folder)).toBe(trashFolder());
			// The repository goes first, so the first trash folder holds its files.
			expect(await readFile(path.join(trashed[0], 'marker'), 'utf8')).toBe('repository');
			expect(await exists(paths.repositoryFolder)).toBe(false);
			expect(await exists(paths.nextRepositoryFolder)).toBe(false);
			expect(await exists(paths.descriptorFile)).toBe(false);
			expect(await readFile(path.join(paths.sshDir, 'known_hosts'), 'utf8')).toBe(
				'github.com ssh-ed25519 AAAA',
			);
		});

		it('removes the descriptor before it moves the folders', async () => {
			const paths = await createCheckout();
			await blockTrash();

			await expect(workingDirectory.resetCheckout(ENVIRONMENT_ID)).rejects.toThrow();

			expect(await exists(paths.descriptorFile)).toBe(false);
			expect(await exists(paths.repositoryFolder)).toBe(true);
		});

		it('returns no trash folder when there is no checkout', async () => {
			await expect(workingDirectory.resetCheckout(ENVIRONMENT_ID)).resolves.toEqual([]);
		});
	});

	describe('purge', () => {
		it('moves the whole environment folder to trash', async () => {
			const paths = await createCheckout();

			const trashed = await workingDirectory.purge(ENVIRONMENT_ID);

			expect(trashed).toHaveLength(1);
			expect(path.dirname(trashed[0])).toBe(trashFolder());
			expect(await readFile(path.join(trashed[0], 'repository', 'marker'), 'utf8')).toBe(
				'repository',
			);
			expect(await exists(paths.rootFolder)).toBe(false);
		});

		it('removes the descriptor before it moves the folder', async () => {
			const paths = await createCheckout();
			await blockTrash();

			await expect(workingDirectory.purge(ENVIRONMENT_ID)).rejects.toThrow();

			expect(await exists(paths.descriptorFile)).toBe(false);
			expect(await exists(paths.sshDir)).toBe(true);
		});

		it('returns no trash folder when the environment has no folder', async () => {
			await expect(workingDirectory.purge(ENVIRONMENT_ID)).resolves.toEqual([]);
		});
	});

	describe('deleteTrash', () => {
		it('deletes the folders that a removal moved to trash', async () => {
			await createCheckout();
			const trashed = await workingDirectory.purge(ENVIRONMENT_ID);

			await workingDirectory.deleteTrash(trashed);

			expect(await readdir(trashFolder())).toEqual([]);
		});
	});

	describe('emptyTrash', () => {
		it('deletes everything in the trash', async () => {
			await mkdir(path.join(trashFolder(), 'leftover', '.git'), { recursive: true });
			await writeFile(path.join(trashFolder(), 'leftover', '.git', 'index.lock'), '');

			await workingDirectory.emptyTrash();

			expect(await readdir(trashFolder())).toEqual([]);
		});

		it('does nothing when there is no trash', async () => {
			await expect(workingDirectory.emptyTrash()).resolves.toBeUndefined();
		});
	});

	describe('listEnvironmentIds', () => {
		it('never lists a trash folder, even one with a generated ID', async () => {
			await createCheckout();
			await mkdir(path.join(trashFolder(), '0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c'), {
				recursive: true,
			});

			await expect(workingDirectory.listEnvironmentIds()).resolves.toEqual([ENVIRONMENT_ID]);
		});
	});

	describe('moveToTrash', () => {
		it('returns undefined when the folder does not exist', async () => {
			await expect(
				moveToTrash(path.join(n8nFolder, 'missing'), trashFolder()),
			).resolves.toBeUndefined();
		});

		it('gives each move a unique name', async () => {
			await mkdir(path.join(n8nFolder, 'a'));
			await mkdir(path.join(n8nFolder, 'b'));

			const first = await moveToTrash(path.join(n8nFolder, 'a'), trashFolder());
			const second = await moveToTrash(path.join(n8nFolder, 'b'), trashFolder());

			expect(first).not.toBe(second);
			expect((await readdir(trashFolder())).sort()).toEqual(
				[path.basename(first!), path.basename(second!)].sort(),
			);
		});
	});
});
