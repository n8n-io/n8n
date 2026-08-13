/**
 * Integration test for the proxy the "Add file to project" node writes through.
 *
 * Runs against a real database and a real filesystem-backed `BinaryDataService`,
 * so the workflow attribution and the resolved project are read back from actual
 * rows rather than asserted on mock calls.
 */

import type { Logger } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectFilesConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataService, type BinaryDataConfig, type ErrorReporter } from 'n8n-core';
import { NodeOperationError, type INode, type Workflow } from 'n8n-workflow';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, type Readable as ReadableType } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ProjectFileProxyService } from '@/modules/project-files/project-file-proxy.service';
import { ProjectFileRepository } from '@/modules/project-files/project-file.repository';
import { ProjectFileService } from '@/modules/project-files/project-file.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { SourceControlPreferences } from '@/modules/source-control.ee/types/source-control-preferences';

import { createOwner } from '../shared/db/users';

const NODE: INode = {
	id: 'node-id',
	name: 'Add file to project',
	type: 'n8n-nodes-base.projectFile',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const sourceControl = { getPreferences: vi.fn<() => SourceControlPreferences>() };

async function readStream(stream: ReadableType): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks);
}

describe('ProjectFileProxyService', () => {
	let storagePath: string;
	let proxyService: ProjectFileProxyService;
	let fileService: ProjectFileService;
	let repository: ProjectFileRepository;
	let config: ProjectFilesConfig;
	let owner: User;
	let project: Project;
	let workflowId: string;

	/** The proxy only ever reads `workflow.id`. */
	function workflowRef(id: string) {
		return mock<Workflow>({ id });
	}

	/**
	 * Blobs stored for the project, excluding the companion `.metadata` entries the
	 * filesystem backend writes alongside them.
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

	async function addFile(
		content: string,
		options?: { overwrite?: boolean },
		file?: { name?: string; source?: 'buffer' | 'stream' },
	) {
		const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);
		const buffer = Buffer.from(content);

		return await proxy.addFile(
			{
				name: file?.name ?? 'report.csv',
				mimeType: 'text/csv',
				sizeBytes: buffer.length,
				source:
					file?.source === 'stream'
						? { type: 'stream', stream: Readable.from(buffer) }
						: { type: 'buffer', buffer },
			},
			options,
		);
	}

	beforeAll(async () => {
		await testModules.loadModules(['project-files']);
		await testDb.init();

		storagePath = await mkdtemp(join(tmpdir(), 'n8n-project-file-proxy-test-'));
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

		// Stubbed rather than constructed: the real service reaches for the instance's
		// ssh/git folders, and `branchReadOnly` is the only preference used here.
		Container.set(
			SourceControlPreferencesService,
			sourceControl as unknown as SourceControlPreferencesService,
		);

		proxyService = Container.get(ProjectFileProxyService);
		fileService = Container.get(ProjectFileService);
		repository = Container.get(ProjectFileRepository);
		config = Container.get(ProjectFilesConfig);

		owner = await createOwner();
	});

	afterAll(async () => {
		await rm(storagePath, { recursive: true, force: true });
		await testDb.terminate();
	});

	beforeEach(async () => {
		await testDb.truncate(['ProjectFile', 'WorkflowEntity']);
		config.maxFileSize = 100 * 1024 * 1024;
		config.projectMaxSize = 2 * 1024 * 1024 * 1024;
		config.personalTotalMaxSize = 1024 * 1024 * 1024;
		sourceControl.getPreferences.mockReturnValue(
			mock<SourceControlPreferences>({ branchReadOnly: false }),
		);

		project = await createTeamProject(undefined, owner);
		const workflow = await createWorkflow({}, project);
		workflowId = workflow.id;
	});

	describe('addFile', () => {
		it('stores a buffer and attributes the file to the workflow', async () => {
			const result = await addFile('a,b\n1,2\n');

			expect(result).toMatchObject({
				name: 'report.csv',
				mimeType: 'text/csv',
				fileSizeBytes: 8,
				projectId: project.id,
				overwritten: false,
			});

			// The binary data reference must never reach the node's output.
			expect(result).not.toHaveProperty('binaryDataId');

			const [rows] = await repository.findManyByProjectId(project.id, {}, {});
			expect(rows[0]).toMatchObject({
				createdByWorkflowId: workflowId,
				updatedByWorkflowId: workflowId,
				createdById: null,
				updatedById: null,
			});
		});

		it('stores a stream without buffering it first', async () => {
			const result = await addFile('streamed,content\n', undefined, { source: 'stream' });

			const { file, stream } = await fileService.getAsStream(project.id, result.id);
			expect(await readStream(stream)).toEqual(Buffer.from('streamed,content\n'));
			expect(file.fileSizeBytes).toBe(17);
		});

		it('replaces the content of an existing file by default', async () => {
			const first = await addFile('first\n');
			const second = await addFile('second-and-longer\n');

			expect(second.id).toBe(first.id);
			expect(second.overwritten).toBe(true);

			const [rows, count] = await repository.findManyByProjectId(project.id, {}, {});
			expect(count).toBe(1);
			expect(rows[0].fileSizeBytes).toBe(18);

			const { stream } = await fileService.getAsStream(project.id, second.id);
			expect(await readStream(stream)).toEqual(Buffer.from('second-and-longer\n'));
		});

		it('surfaces a name conflict as a node error naming the fix', async () => {
			await addFile('first\n');

			await expect(addFile('second\n', { overwrite: false })).rejects.toThrow(NodeOperationError);
			await expect(addFile('second\n', { overwrite: false })).rejects.toThrow(
				/already exists in this project/,
			);
		});

		it('surfaces an over-quota write as a node error', async () => {
			config.projectMaxSize = 4;

			await expect(addFile('more than four bytes\n')).rejects.toThrow(NodeOperationError);
			await expect(addFile('more than four bytes\n')).rejects.toThrow(
				/Storage limit for this project reached/,
			);
		});

		it('surfaces an oversized file as a node error', async () => {
			config.maxFileSize = 4;

			await expect(addFile('more than four bytes\n')).rejects.toThrow(NodeOperationError);
			await expect(addFile('more than four bytes\n')).rejects.toThrow(/exceeds the maximum/);
		});

		it('refuses to write on a read-only instance', async () => {
			sourceControl.getPreferences.mockReturnValue(
				mock<SourceControlPreferences>({ branchReadOnly: true }),
			);

			await expect(addFile('blocked\n')).rejects.toThrow(ForbiddenError);
		});

		it('writes to the project owning the workflow, not another project', async () => {
			const otherProject = await createTeamProject(undefined, owner);

			const result = await addFile('a,b\n1,2\n');

			expect(result.projectId).toBe(project.id);

			const [, otherCount] = await repository.findManyByProjectId(otherProject.id, {}, {});
			expect(otherCount).toBe(0);
		});
	});

	describe('getFile', () => {
		it('returns the stored bytes, addressed by id', async () => {
			const stored = await addFile('a,b\n1,2\n');
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			const { file, stream } = await proxy.getFile({ by: 'id', id: stored.id });

			expect(await readStream(stream)).toEqual(Buffer.from('a,b\n1,2\n'));
			expect(file).toMatchObject({ id: stored.id, name: 'report.csv', mimeType: 'text/csv' });
		});

		it('returns the stored bytes, addressed by name', async () => {
			await addFile('by-name\n');
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			const { stream } = await proxy.getFile({ by: 'name', name: 'report.csv' });

			expect(await readStream(stream)).toEqual(Buffer.from('by-name\n'));
		});

		it('never exposes the stored binary reference to the node', async () => {
			// `GET /rest/binary-data?id=` has no ownership check, so this reference
			// reaching execution data would be a cross-project read.
			const stored = await addFile('a,b\n1,2\n');
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			const { file } = await proxy.getFile({ by: 'id', id: stored.id });

			expect(file).not.toHaveProperty('binaryDataId');
			expect(JSON.stringify(file)).not.toContain('filesystem-v2');
		});

		it('resolves a name the same way the write path sanitized it', async () => {
			await addFile('trimmed\n', undefined, { name: 'spaced name.csv' });
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			const { stream } = await proxy.getFile({ by: 'name', name: '  spaced name.csv  ' });

			expect(await readStream(stream)).toEqual(Buffer.from('trimmed\n'));
		});

		it('raises a node error for a file that does not exist', async () => {
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			await expect(proxy.getFile({ by: 'name', name: 'missing.csv' })).rejects.toThrow(
				NodeOperationError,
			);
			await expect(proxy.getFile({ by: 'id', id: 'nope' })).rejects.toThrow(
				/No file with ID 'nope' exists in this project/,
			);
		});

		it('is allowed on a read-only instance', async () => {
			const stored = await addFile('readable\n');
			sourceControl.getPreferences.mockReturnValue(
				mock<SourceControlPreferences>({ branchReadOnly: true }),
			);
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			const { stream } = await proxy.getFile({ by: 'id', id: stored.id });

			expect(await readStream(stream)).toEqual(Buffer.from('readable\n'));
		});
	});

	describe('deleteFile', () => {
		it('removes the row and the stored bytes', async () => {
			const stored = await addFile('doomed\n');
			expect(await listStoredBlobs()).toHaveLength(1);

			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);
			const result = await proxy.deleteFile({ by: 'id', id: stored.id });

			expect(result).toEqual({ id: stored.id, name: 'report.csv' });

			const [, count] = await repository.findManyByProjectId(project.id, {}, {});
			expect(count).toBe(0);
			expect(await listStoredBlobs()).toHaveLength(0);
		});

		it('deletes by name', async () => {
			await addFile('doomed\n');
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			await proxy.deleteFile({ by: 'name', name: 'report.csv' });

			const [, count] = await repository.findManyByProjectId(project.id, {}, {});
			expect(count).toBe(0);
		});

		it('raises a node error for a file that does not exist', async () => {
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			await expect(proxy.deleteFile({ by: 'name', name: 'missing.csv' })).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('is refused on a read-only instance', async () => {
			const stored = await addFile('protected\n');
			sourceControl.getPreferences.mockReturnValue(
				mock<SourceControlPreferences>({ branchReadOnly: true }),
			);
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			await expect(proxy.deleteFile({ by: 'id', id: stored.id })).rejects.toThrow(ForbiddenError);
		});
	});

	describe('listFiles', () => {
		it('lists only the files of the project owning the workflow', async () => {
			await addFile('mine\n', undefined, { name: 'mine.csv' });

			const otherProject = await createTeamProject(undefined, owner);
			const otherWorkflow = await createWorkflow({}, otherProject);
			const otherProxy = await proxyService.getProjectFileProxy(
				workflowRef(otherWorkflow.id),
				NODE,
			);
			await otherProxy.addFile({
				name: 'theirs.csv',
				mimeType: 'text/csv',
				sizeBytes: 3,
				source: { type: 'buffer', buffer: Buffer.from('a,b') },
			});

			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);
			const { count, data } = await proxy.listFiles();

			expect(count).toBe(1);
			expect(data.map((file) => file.name)).toEqual(['mine.csv']);
		});

		it('filters by name', async () => {
			await addFile('a\n', undefined, { name: 'rates-latest.csv' });
			await addFile('b\n', undefined, { name: 'invoice.pdf' });
			const proxy = await proxyService.getProjectFileProxy(workflowRef(workflowId), NODE);

			const { data } = await proxy.listFiles({ search: 'rates' });

			expect(data.map((file) => file.name)).toEqual(['rates-latest.csv']);
		});
	});

	describe('getProjectFileProxy', () => {
		it('rejects a node type that is not the project file node', async () => {
			await expect(
				proxyService.getProjectFileProxy(workflowRef(workflowId), {
					...NODE,
					type: 'n8n-nodes-base.httpRequest',
				}),
			).rejects.toThrow('This proxy is only available for the Project File node');
		});

		it('asks the user to save an unsaved workflow', async () => {
			await expect(
				proxyService.getProjectFileProxy(workflowRef('unsaved-workflow-id'), NODE),
			).rejects.toThrow(/Could not find the project this workflow belongs to/);
		});
	});
});
