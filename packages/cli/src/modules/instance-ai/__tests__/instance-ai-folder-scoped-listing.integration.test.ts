import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { License } from '@/license';
import { Telemetry } from '@/telemetry';
import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

/**
 * Folder scoping runs real queries: the parent-folder join, the recursive
 * path CTE and the subtree expansion. A mocked repository cannot see the
 * constraints those queries carry (the prototype hit a SQLite-only DISTINCT
 * error here), so this suite runs against the real database.
 */
describe('Instance AI folder-scoped workflow listing (integration)', () => {
	mockInstance(ActiveWorkflowManager);
	mockInstance(Telemetry);
	const license = mockInstance(License);

	let owner: User;
	let member: User;
	let project: Project;
	let adapterService: InstanceAiAdapterService;

	const listFor = (user: User, projectId: string) =>
		adapterService.createContext(user, {
			threadId: 'thread-1',
			projectId,
			folderExplorationEnabled: true,
		}).workflowService;

	beforeAll(async () => {
		await testDb.init();
		license.isLicensed.mockReturnValue(true);
		// `workflowService.getMany` reads the license state, which needs a provider.
		Container.get(LicenseState).setLicenseProvider(Container.get(License));
		adapterService = Container.get(InstanceAiAdapterService);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'Folder']);
		owner = await createOwner();
		member = await createMember();
		project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id);

		const clients = await createFolder(project, { name: 'Clients' });
		const acme = await createFolder(project, { name: 'Acme', parentFolder: clients });
		const acmeArchive = await createFolder(project, { name: 'Archive', parentFolder: acme });

		await createWorkflow({ name: 'Slack inbound', parentFolder: acme }, owner);
		await createWorkflow({ name: 'Telegram inbound', parentFolder: acme }, owner);
		await createWorkflow({ name: 'Old inbound', parentFolder: acmeArchive }, owner);
		await createWorkflow({ name: 'Acme overview' }, owner); // same-named non-member at the root
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('lists folders and paths across pages', async () => {
		const workspace = adapterService.createContext(owner, {
			projectId: project.id,
		}).workspaceService;
		if (!workspace?.listFolders) throw new Error('Folder listing is unavailable.');
		const first = await workspace.listFolders(project.id, { limit: 2 });
		const second = await workspace.listFolders(project.id, { limit: 2, offset: 2 });
		if (Array.isArray(first) || Array.isArray(second)) {
			throw new Error('Folder listing did not return pagination metadata.');
		}
		expect(first).toMatchObject({ total: 3, hasMore: true });
		expect(second).toMatchObject({ total: 3, hasMore: false });
		const folders = [...first.folders, ...second.folders];
		expect(new Set(folders.map((folder) => folder.id)).size).toBe(3);
		expect(folders.map((folder) => folder.path).sort()).toEqual([
			'Clients',
			'Clients/Acme',
			'Clients/Acme/Archive',
		]);
	});

	it('returns only the folder members, not the same-named root workflow', async () => {
		const result = await listFor(owner, project.id).list({ folderPath: 'Clients/Acme' });

		expect(result.workflows.map((wf) => wf.name).sort()).toEqual([
			'Old inbound',
			'Slack inbound',
			'Telegram inbound',
		]);
		expect(result.folderResolution).toBeUndefined();
	});

	it('reads one level only with recursive: false', async () => {
		const result = await listFor(owner, project.id).list({
			folderPath: 'Acme',
			recursive: false,
		});

		expect(result.workflows.map((wf) => wf.name).sort()).toEqual([
			'Slack inbound',
			'Telegram inbound',
		]);
	});

	it('attributes rows with a root-relative path and leaves root rows unattributed', async () => {
		const result = await listFor(owner, project.id).list();

		const byName = new Map(result.workflows.map((wf) => [wf.name, wf]));
		expect(byName.has('Old inbound')).toBe(true);
		expect(byName.get('Old inbound')?.folder).toEqual(
			expect.objectContaining({ name: 'Archive', path: 'Clients/Acme/Archive' }),
		);
		expect(byName.has('Acme overview')).toBe(true);
		expect(byName.get('Acme overview')?.folder).toBeUndefined();
	});

	it('returns nothing to a user without access, even with a valid folderId', async () => {
		const acmeId = (await listFor(owner, project.id).list({ folderPath: 'Acme', recursive: false }))
			.workflows[0].folder?.id;
		expect(acmeId).toBeDefined();

		const result = await listFor(member, project.id).list({ folderId: acmeId });

		expect(result.workflows).toEqual([]);
		// The member cannot list folders in the owner's project, so the scan finds
		// nothing and the id is reported as a miss rather than silently widening.
		expect(result.folderResolution?.reason).toBe('not-found');
	});

	it('lists candidates from the scanned project when the folder does not resolve', async () => {
		const result = await listFor(owner, project.id).list({ folderPath: 'Globex' });

		expect(result.workflows).toEqual([]);
		expect(result.folderResolution).toEqual({
			requested: 'Globex',
			reason: 'not-found',
			candidates: ['Clients', 'Clients/Acme', 'Clients/Acme/Archive'],
		});
	});
});
