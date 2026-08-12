/**
 * Integration test for the project-files backend module.
 *
 * Runs against a real database and a real filesystem-backed
 * `BinaryDataService`, so the assertions about stored bytes and orphaned blobs
 * are about actual files on disk rather than mock calls.
 */

import type { Logger } from '@n8n/backend-common';
import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectFilesConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataService, type BinaryDataConfig, type ErrorReporter } from 'n8n-core';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { ProjectFileConcurrentModificationError } from '@/modules/project-files/errors/project-file-concurrent-modification.error';
import { ProjectFileNameConflictError } from '@/modules/project-files/errors/project-file-name-conflict.error';
import { ProjectFileNotFoundError } from '@/modules/project-files/errors/project-file-not-found.error';
import { ProjectFileQuotaExceededError } from '@/modules/project-files/errors/project-file-quota-exceeded.error';
import { ProjectFileTooLargeError } from '@/modules/project-files/errors/project-file-too-large.error';
import { ProjectFileRepository } from '@/modules/project-files/project-file.repository';
import { ProjectFileService } from '@/modules/project-files/project-file.service';
import type { ProjectFileActor } from '@/modules/project-files/project-files.types';

import { createOwner } from '../shared/db/users';

const ACTOR: ProjectFileActor = { type: 'user', userId: '' };

async function readStream(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks);
}

describe('project-files module', () => {
	let storagePath: string;
	let service: ProjectFileService;
	let repository: ProjectFileRepository;
	let config: ProjectFilesConfig;
	let owner: User;
	let actor: ProjectFileActor;
	let project: Project;

	/**
	 * Blobs stored for one project, excluding the companion `.metadata` entries the
	 * FS backend writes. Scoped to the project rather than the whole storage dir so
	 * files left by earlier tests can't be mistaken for orphans.
	 */
	async function listStoredBlobs(projectId: string = project.id): Promise<string[]> {
		const dir = join(storagePath, 'projects', projectId, 'files', 'binary_data');

		try {
			const entries = await readdir(dir, { withFileTypes: true });

			return entries
				.filter((entry) => entry.isFile() && !entry.name.endsWith('.metadata'))
				.map((entry) => entry.name);
		} catch {
			return []; // nothing was ever written for this project
		}
	}

	async function upload(name: string, content: string, options?: { overwrite?: boolean }) {
		const buffer = Buffer.from(content);
		const { file } = await service.store(
			project.id,
			actor,
			{
				name,
				mimeType: 'text/plain',
				sizeBytes: buffer.length,
				source: { type: 'buffer', buffer },
			},
			options,
		);

		return file;
	}

	beforeAll(async () => {
		await testModules.loadModules(['project-files']);
		await testDb.init();

		// A real FS-backed service on a temp dir. Mirrors the shared
		// `initBinaryDataService` helper, which pins the storage path to '' and would
		// scatter blobs relative to the cwd.
		storagePath = await mkdtemp(join(tmpdir(), 'n8n-project-files-test-'));
		const binaryDataService = new BinaryDataService(
			mock<BinaryDataConfig>({
				mode: 'filesystem',
				availableModes: ['filesystem'],
				localStoragePath: storagePath,
			}),
			mock<ErrorReporter>(),
			mock<Logger>(),
		);
		await binaryDataService.init();
		Container.set(BinaryDataService, binaryDataService);

		service = Container.get(ProjectFileService);
		repository = Container.get(ProjectFileRepository);
		config = Container.get(ProjectFilesConfig);

		owner = await createOwner();
		actor = { ...ACTOR, userId: owner.id };
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['ProjectFile']);
		config.maxFileSize = 100 * 1024 * 1024;
		config.projectMaxSize = 2 * 1024 * 1024 * 1024;
		config.personalTotalMaxSize = 1024 * 1024 * 1024;
		project = await createTeamProject(undefined, owner);
	});

	describe('store', () => {
		it('stores bytes through BinaryDataService and records the metadata', async () => {
			const file = await upload('report.txt', 'hello project files');

			expect(file).toMatchObject({
				projectId: project.id,
				name: 'report.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 19,
				createdById: owner.id,
				updatedById: owner.id,
				// Defined for the node PR; nothing writes them yet.
				createdByWorkflowId: null,
				updatedByWorkflowId: null,
			});

			// Mode-prefixed reference under a project-scoped path.
			expect(file.binaryDataId).toMatch(
				new RegExp(`^filesystem-v2:projects/${project.id}/files/binary_data/`),
			);

			const { stream } = await service.getAsStream(project.id, file.id);
			expect((await readStream(stream)).toString()).toBe('hello project files');
		});

		it('strips path separators from the stored name', async () => {
			// The name is metadata, never a storage path (blob keys are uuids), so the
			// guarantee is a safe display/Content-Disposition value, not traversal
			// defence.
			const file = await upload('../../etc/passwd', 'nope');

			expect(file.name).not.toMatch(/[/\\]/);
			expect(file.name).toBe('_.._etc_passwd');
		});

		it('rejects a blank name instead of silently renaming it', async () => {
			await expect(upload('   ', 'nope')).rejects.toThrow('File name is empty');
		});

		it('rejects a duplicate name without overwrite', async () => {
			await upload('logo.png', 'first');

			await expect(upload('logo.png', 'second')).rejects.toThrow(ProjectFileNameConflictError);

			// The rejected upload must not leave bytes behind.
			expect(await listStoredBlobs()).toHaveLength(1);
		});

		it('reports whether a store overwrote, and which budget it charged', async () => {
			const buffer = Buffer.from('bytes');
			const incoming = {
				name: 'once.txt',
				mimeType: 'text/plain',
				sizeBytes: buffer.length,
				source: { type: 'buffer' as const, buffer },
			};

			const fresh = await service.store(project.id, actor, incoming);
			expect(fresh).toMatchObject({ overwritten: false, projectType: 'team' });

			const replaced = await service.store(project.id, actor, incoming, { overwrite: true });
			expect(replaced).toMatchObject({ overwritten: true, projectType: 'team' });
		});

		it('replaces content in place with overwrite, deleting the previous bytes', async () => {
			const first = await upload('logo.png', 'first');
			const second = await upload('logo.png', 'second', { overwrite: true });

			expect(second.id).toBe(first.id);
			expect(second.binaryDataId).not.toBe(first.binaryDataId);
			expect(second.fileSizeBytes).toBe(6);

			const { stream } = await service.getAsStream(project.id, second.id);
			expect((await readStream(stream)).toString()).toBe('second');

			// Old blob reclaimed, exactly one left.
			expect(await listStoredBlobs()).toHaveLength(1);
		});

		it('rejects a file above the per-file cap', async () => {
			config.maxFileSize = 8;

			await expect(upload('big.txt', 'far too many bytes')).rejects.toThrow(
				ProjectFileTooLargeError,
			);
			expect(await listStoredBlobs()).toHaveLength(0);
		});

		it('rejects an upload that would exceed the project quota', async () => {
			config.projectMaxSize = 10;

			await upload('a.txt', '12345');
			await expect(upload('b.txt', '123456')).rejects.toThrow(ProjectFileQuotaExceededError);

			expect((await service.list(project.id)).count).toBe(1);
		});
	});

	describe('quota scope', () => {
		it('charges personal projects against one shared instance-wide budget', async () => {
			const personal = await getPersonalProject(owner);
			const secondUser = await createOwner();
			const otherPersonal = await getPersonalProject(secondUser);

			config.personalTotalMaxSize = 10;

			const put = async (target: Project, name: string, content: string) => {
				const buffer = Buffer.from(content);
				return await service.store(target.id, actor, {
					name,
					mimeType: 'text/plain',
					sizeBytes: buffer.length,
					source: { type: 'buffer', buffer },
				});
			};

			await put(personal, 'a.txt', '12345');

			// Another user's personal project draws on the same budget.
			await expect(put(otherPersonal, 'b.txt', '123456')).rejects.toThrow(
				ProjectFileQuotaExceededError,
			);

			const usage = await service.getUsage(personal.id);
			expect(usage).toEqual({ scope: 'personal', usedBytes: 5, quotaBytes: 10 });
		});

		it('reports team project usage against the per-project budget', async () => {
			config.projectMaxSize = 500;
			await upload('a.txt', '12345');

			expect(await service.getUsage(project.id)).toEqual({
				scope: 'project',
				usedBytes: 5,
				quotaBytes: 500,
			});
		});
	});

	describe('concurrent overwrite', () => {
		it('leaves one row, one reachable blob, and no orphans', async () => {
			await upload('shared.txt', 'original');

			const results = await Promise.allSettled([
				upload('shared.txt', 'writer-a', { overwrite: true }),
				upload('shared.txt', 'writer-b', { overwrite: true }),
			]);

			const fulfilled = results.filter((r) => r.status === 'fulfilled');
			const rejected = results.filter((r) => r.status === 'rejected');

			// Exactly one writer wins; the loser is told rather than silently dropped.
			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);
			expect(rejected[0].reason).toBeInstanceOf(ProjectFileConcurrentModificationError);

			const { count, data } = await service.list(project.id);
			expect(count).toBe(1);

			// The surviving row's bytes are readable, and nothing else is on disk:
			// the original and the loser's blob are both reclaimed.
			const { stream } = await service.getAsStream(project.id, data[0].id);
			expect(['writer-a', 'writer-b']).toContain((await readStream(stream)).toString());
			expect(await listStoredBlobs()).toHaveLength(1);
		});
	});

	describe('rename', () => {
		it('changes the name without touching the stored bytes', async () => {
			const file = await upload('before.txt', 'content');
			const renamed = await service.rename(project.id, file.id, 'after.txt', actor);

			expect(renamed.name).toBe('after.txt');
			expect(renamed.binaryDataId).toBe(file.binaryDataId);

			const { stream } = await service.getAsStream(project.id, file.id);
			expect((await readStream(stream)).toString()).toBe('content');
		});

		it('rejects a rename onto an existing name', async () => {
			await upload('taken.txt', 'a');
			const file = await upload('free.txt', 'b');

			await expect(service.rename(project.id, file.id, 'taken.txt', actor)).rejects.toThrow(
				ProjectFileNameConflictError,
			);
		});
	});

	describe('delete', () => {
		it('removes the row and the bytes', async () => {
			const file = await upload('gone.txt', 'bytes');

			await service.delete(project.id, file.id);

			expect((await service.list(project.id)).count).toBe(0);
			expect(await listStoredBlobs()).toHaveLength(0);
		});

		it('is scoped to the project', async () => {
			const file = await upload('mine.txt', 'bytes');
			const otherProject = await createTeamProject(undefined, owner);

			await expect(service.delete(otherProject.id, file.id)).rejects.toThrow(
				ProjectFileNotFoundError,
			);
		});

		it('still removes the row when the blob was stored under an unavailable mode', async () => {
			// A file written before a storage-mode switch: `deleteManyByBinaryDataId`
			// groups by mode prefix and skips modes with no registered manager, so the
			// row must still go.
			await repository.insertFile(
				{
					id: 'legacyfile0001',
					projectId: project.id,
					name: 'legacy.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 5,
					binaryDataId: 's3:projects/legacy/files/binary_data/abc',
					actor,
				},
				{},
			);

			await expect(service.delete(project.id, 'legacyfile0001')).resolves.not.toThrow();
			expect((await service.list(project.id)).count).toBe(0);
		});

		it('removes every file of a project, bytes included', async () => {
			await upload('a.txt', 'aaa');
			await upload('b.txt', 'bbb');

			await service.deleteAllByProjectId(project.id);

			expect((await service.list(project.id)).count).toBe(0);
			expect(await listStoredBlobs()).toHaveLength(0);
		});
	});

	describe('list', () => {
		it('paginates without repeating or skipping rows', async () => {
			await upload('Alpha.txt', 'a');
			await upload('beta.txt', 'b');
			await upload('gamma.txt', 'c');

			const all = await service.list(project.id);
			expect(all.count).toBe(3);

			// The three uploads share a millisecond, so the `updatedAt` sort alone is
			// ambiguous. Pages must still partition the set exactly once.
			const first = await service.list(project.id, { take: 2 });
			const second = await service.list(project.id, { take: 2, skip: 2 });

			expect(first.data).toHaveLength(2);
			expect(second.data).toHaveLength(1);
			expect([...first.data, ...second.data].map((f) => f.name).sort()).toEqual([
				'Alpha.txt',
				'beta.txt',
				'gamma.txt',
			]);
		});

		it('searches case-insensitively', async () => {
			await upload('Alpha.txt', 'a');
			await upload('beta.txt', 'b');

			const searched = await service.list(project.id, { search: 'ALPHA' });

			expect(searched.count).toBe(1);
			expect(searched.data[0].name).toBe('Alpha.txt');
		});

		it('does not leak files from another project', async () => {
			await upload('mine.txt', 'a');
			const otherProject = await createTeamProject(undefined, owner);

			expect((await service.list(otherProject.id)).count).toBe(0);
		});
	});
});
