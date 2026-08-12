/**
 * API tests for the project-files module.
 *
 * Runs against a real filesystem-backed `BinaryDataService`, so uploads and
 * downloads move actual bytes rather than exercising mocks.
 */

import type { Logger } from '@n8n/backend-common';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { ProjectFilesConfig } from '@n8n/config';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { BinaryDataService, type BinaryDataConfig, type ErrorReporter } from 'n8n-core';
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { ProjectFileCleanupService } from '@/modules/project-files/project-file-cleanup.service';
import { Telemetry } from '@/telemetry';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/**
 * Registered at module scope: the test server
 * instantiates controllers in its own `beforeAll`, and whatever
 * `BinaryDataService` the container holds at that moment is the one injected for
 * the run. Setting it later leaves the controller holding the default in-memory
 * service, which stores no durable reference and fails every upload.
 */
const storagePath = mkdtempSync(join(tmpdir(), 'n8n-project-files-api-'));
const binaryDataService = new BinaryDataService(
	mock<BinaryDataConfig>({
		mode: 'filesystem',
		availableModes: ['filesystem'],
		localStoragePath: storagePath,
	}),
	mock<ErrorReporter>(),
	mock<Logger>(),
);
Container.set(BinaryDataService, binaryDataService);

const testServer = utils.setupTestServer({
	endpointGroups: ['project-files'],
	modules: ['project-files'],
});

// After `setupTestServer`, which registers a Telemetry mock of its own and would
// otherwise replace this one.
const telemetry = mockInstance(Telemetry);

describe('project files API', () => {
	let config: ProjectFilesConfig;
	let owner: User;
	let ownerAgent: SuperAgentTest;
	let viewer: User;
	let viewerAgent: SuperAgentTest;
	let project: Project;

	const url = (projectId: string, suffix = '') => `/projects/${projectId}/files${suffix}`;

	const upload = (
		agent: SuperAgentTest,
		projectId: string,
		name: string,
		content: string,
		query = '',
	) =>
		agent
			.post(url(projectId) + query)
			.attach('file', Buffer.from(content), { filename: name, contentType: 'text/plain' });

	beforeAll(async () => {
		await binaryDataService.init();

		config = Container.get(ProjectFilesConfig);

		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
		viewer = await createMember();
		viewerAgent = testServer.authAgentFor(viewer);
	});

	afterAll(async () => {
		// The module's init() started it; leaving it running keeps vitest alive.
		Container.get(ProjectFileCleanupService).shutdown();
		await rm(storagePath, { recursive: true, force: true });
	});

	beforeEach(async () => {
		await testDb.truncate(['ProjectFile']);
		telemetry.track.mockClear();
		config.maxFileSize = 100 * 1024 * 1024;
		config.projectMaxSize = 2 * 1024 * 1024 * 1024;
		config.personalTotalMaxSize = 1024 * 1024 * 1024;
		config.maxPreviewSize = 10 * 1024 * 1024;

		project = await createTeamProject(undefined, owner);
		await linkUserToProject(viewer, project, 'project:viewer');
	});

	describe('POST /projects/:projectId/files', () => {
		it('stores the file and returns its metadata without the binary reference', async () => {
			const response = await upload(ownerAgent, project.id, 'report.txt', 'hello').expect(201);

			expect(response.body.data).toMatchObject({
				name: 'report.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
				createdBy: { id: owner.id, email: owner.email },
				updatedBy: { id: owner.id },
			});
			expect(response.body.data.id).toEqual(expect.any(String));

			// A leaked reference is a cross-project read: /rest/binary-data has no
			// ownership check.
			expect(JSON.stringify(response.body)).not.toContain('filesystem-v2');
			expect(response.body.data).not.toHaveProperty('binaryDataId');
		});

		it('emits one upload telemetry event', async () => {
			await upload(ownerAgent, project.id, 'report.txt', 'hello').expect(201);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.PROJECT_FILES.USER_UPLOADED_PROJECT_FILE,
				{
					user_id: owner.id,
					project_id: project.id,
					project_type: 'team',
					mime_type: 'text/plain',
					file_size_bytes: 5,
					overwrote_existing: false,
					n8n_binary_data_mode: 'filesystem',
				},
			);
		});

		it('rejects a duplicate name with 409 and accepts it with ?overwrite=true', async () => {
			await upload(ownerAgent, project.id, 'logo.png', 'first').expect(201);
			await upload(ownerAgent, project.id, 'logo.png', 'second').expect(409);

			const replaced = await upload(
				ownerAgent,
				project.id,
				'logo.png',
				'second',
				'?overwrite=true',
			).expect(201);

			expect(replaced.body.data.fileSizeBytes).toBe(6);
			expect(telemetry.track).toHaveBeenLastCalledWith(
				TELEMETRY_EVENT.PROJECT_FILES.USER_UPLOADED_PROJECT_FILE,
				expect.objectContaining({ overwrote_existing: true }),
			);
		});

		it('returns 413 when the file exceeds the per-file cap', async () => {
			config.maxFileSize = 8;

			await upload(ownerAgent, project.id, 'big.txt', 'far too many bytes').expect(413);
		});

		it('returns 413 when the upload would exceed the project quota', async () => {
			config.projectMaxSize = 8;

			await upload(ownerAgent, project.id, 'a.txt', '12345').expect(201);
			await upload(ownerAgent, project.id, 'b.txt', '12345').expect(413);
		});

		it('returns 400 when no file is attached', async () => {
			await ownerAgent.post(url(project.id)).expect(400);
		});

		it('returns 404 for an unknown project', async () => {
			await upload(ownerAgent, 'does-not-exist', 'a.txt', 'x').expect(404);
		});

		it('returns 403 for a project viewer', async () => {
			await upload(viewerAgent, project.id, 'a.txt', 'x').expect(403);
		});

		it('returns 403 when the instance branch is read-only', async () => {
			const preferences = Container.get(SourceControlPreferencesService);
			const spy = vi
				.spyOn(preferences, 'getPreferences')
				.mockReturnValue({ branchReadOnly: true } as ReturnType<typeof preferences.getPreferences>);

			try {
				await upload(ownerAgent, project.id, 'a.txt', 'x').expect(403);
			} finally {
				spy.mockRestore();
			}
		});
	});

	describe('GET /projects/:projectId/files', () => {
		it('lists files with usage, and paginates', async () => {
			config.projectMaxSize = 500;
			await upload(ownerAgent, project.id, 'a.txt', 'aaa').expect(201);
			await upload(ownerAgent, project.id, 'b.txt', 'bb').expect(201);

			const response = await ownerAgent.get(url(project.id)).expect(200);

			expect(response.body.data.count).toBe(2);
			expect(response.body.data.data).toHaveLength(2);
			expect(response.body.data.usage).toEqual({
				usedBytes: 5,
				quotaBytes: 500,
				scope: 'project',
			});

			const page = await ownerAgent.get(url(project.id, '?take=1')).expect(200);
			expect(page.body.data.count).toBe(2);
			expect(page.body.data.data).toHaveLength(1);
		});

		it('searches case-insensitively', async () => {
			await upload(ownerAgent, project.id, 'Alpha.txt', 'a').expect(201);
			await upload(ownerAgent, project.id, 'beta.txt', 'b').expect(201);

			const response = await ownerAgent.get(url(project.id, '?search=ALPHA')).expect(200);

			expect(response.body.data.count).toBe(1);
			expect(response.body.data.data[0].name).toBe('Alpha.txt');
		});

		it('reports the shared instance-wide budget for a personal project', async () => {
			config.personalTotalMaxSize = 400;
			const personal = await getPersonalProject(owner);

			await upload(ownerAgent, personal.id, 'a.txt', 'aaa').expect(201);

			const response = await ownerAgent.get(url(personal.id)).expect(200);
			expect(response.body.data.usage).toEqual({
				usedBytes: 3,
				quotaBytes: 400,
				scope: 'personal',
			});
		});

		it('allows a project viewer to list', async () => {
			await upload(ownerAgent, project.id, 'a.txt', 'a').expect(201);

			const response = await viewerAgent.get(url(project.id)).expect(200);
			expect(response.body.data.count).toBe(1);
		});

		it('does not leak files from another project', async () => {
			await upload(ownerAgent, project.id, 'a.txt', 'a').expect(201);
			const other = await createTeamProject(undefined, owner);

			const response = await ownerAgent.get(url(other.id)).expect(200);
			expect(response.body.data.count).toBe(0);
		});
	});

	describe('GET /projects/:projectId/files/:fileId/content', () => {
		it('streams the bytes as an attachment', async () => {
			const created = await upload(ownerAgent, project.id, 'report.txt', 'hello').expect(201);

			const response = await ownerAgent
				.get(url(project.id, `/${created.body.data.id}/content`))
				.expect(200);

			expect(response.headers['content-type']).toContain('text/plain');
			expect(response.headers['content-length']).toBe('5');
			// Attachment unless `?action=view` explicitly opts into inline rendering.
			expect(response.headers['content-disposition']).toBe('attachment; filename="report.txt"');
			expect(response.text).toBe('hello');
		});

		it('rejects an unrecognised action instead of guessing', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'abc').expect(201);

			// Fail-closed: the enum rejects a junk value rather than falling back, so
			// there is no path where an unexpected action decides the disposition.
			await ownerAgent
				.get(url(project.id, `/${created.body.data.id}/content?action=nonsense`))
				.expect(400);
		});

		it('allows a project viewer to download', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'abc').expect(201);

			await viewerAgent.get(url(project.id, `/${created.body.data.id}/content`)).expect(200);
		});

		it('serves a previewable type inline, with sniffing disabled', async () => {
			const created = await upload(ownerAgent, project.id, 'notes.txt', 'hello').expect(201);

			const response = await ownerAgent
				.get(url(project.id, `/${created.body.data.id}/content?action=view`))
				.expect(200);

			expect(response.headers['content-disposition']).toBe('inline');
			// Without nosniff, text/plain bytes that are really HTML can be sniffed
			// and rendered as HTML, defeating the allowlist.
			expect(response.headers['x-content-type-options']).toBe('nosniff');
			expect(response.headers['content-security-policy']).toContain('sandbox');
			expect(response.text).toBe('hello');
		});

		it.each([
			['text/html', 'page.html'],
			['image/svg+xml', 'icon.svg'],
			['application/pdf', 'doc.pdf'],
		])('refuses to view %s inline', async (mimeType, fileName) => {
			const created = await ownerAgent
				.post(url(project.id))
				.attach('file', Buffer.from('<script>alert(1)</script>'), {
					filename: fileName,
					contentType: mimeType,
				})
				.expect(201);

			await ownerAgent
				.get(url(project.id, `/${created.body.data.id}/content?action=view`))
				.expect(400);
		});

		it('still allows downloading a type it refuses to preview', async () => {
			const created = await ownerAgent
				.post(url(project.id))
				.attach('file', Buffer.from('<h1>hi</h1>'), {
					filename: 'page.html',
					contentType: 'text/html',
				})
				.expect(201);

			await ownerAgent.get(url(project.id, `/${created.body.data.id}/content`)).expect(200);
		});

		it('returns 413 when the file is too large to preview', async () => {
			const created = await upload(ownerAgent, project.id, 'big.txt', 'more than four').expect(201);
			config.maxPreviewSize = 4;

			await ownerAgent
				.get(url(project.id, `/${created.body.data.id}/content?action=view`))
				.expect(413);
		});

		it('returns 404 for a file belonging to another project', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'abc').expect(201);
			const other = await createTeamProject(undefined, owner);

			await ownerAgent.get(url(other.id, `/${created.body.data.id}/content`)).expect(404);
		});
	});

	describe('PATCH /projects/:projectId/files/:fileId', () => {
		it('renames the file', async () => {
			const created = await upload(ownerAgent, project.id, 'before.txt', 'x').expect(201);

			const response = await ownerAgent
				.patch(url(project.id, `/${created.body.data.id}`))
				.send({ name: 'after.txt' })
				.expect(200);

			expect(response.body.data.name).toBe('after.txt');
		});

		it('returns 409 when renaming onto an existing name', async () => {
			await upload(ownerAgent, project.id, 'taken.txt', 'x').expect(201);
			const created = await upload(ownerAgent, project.id, 'free.txt', 'y').expect(201);

			await ownerAgent
				.patch(url(project.id, `/${created.body.data.id}`))
				.send({ name: 'taken.txt' })
				.expect(409);
		});

		it('returns 400 for a blank name', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'x').expect(201);

			await ownerAgent
				.patch(url(project.id, `/${created.body.data.id}`))
				.send({ name: '' })
				.expect(400);
		});

		it('returns 403 for a project viewer', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'x').expect(201);

			await viewerAgent
				.patch(url(project.id, `/${created.body.data.id}`))
				.send({ name: 'b.txt' })
				.expect(403);
		});
	});

	describe('DELETE /projects/:projectId/files/:fileId', () => {
		it('deletes the file', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'x').expect(201);

			await ownerAgent.delete(url(project.id, `/${created.body.data.id}`)).expect(200);

			const response = await ownerAgent.get(url(project.id)).expect(200);
			expect(response.body.data.count).toBe(0);
		});

		it('returns 404 for an unknown file', async () => {
			await ownerAgent.delete(url(project.id, '/nope')).expect(404);
		});

		it('returns 403 for a project viewer', async () => {
			const created = await upload(ownerAgent, project.id, 'a.txt', 'x').expect(201);

			await viewerAgent.delete(url(project.id, `/${created.body.data.id}`)).expect(403);
		});
	});
});
