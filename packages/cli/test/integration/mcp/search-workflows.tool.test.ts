import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	mockInstance,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import type { Folder, Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_ROOT } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { searchWorkflows } from '@/modules/mcp/tools/search-workflows.tool';
import { FolderFinderService } from '@/services/folder-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { createFolder } from '@test-integration/db/folders';
import { LicenseMocker } from '@test-integration/license';

import { createMember, createOwner } from '../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(ActiveWorkflowManager);

/**
 * Exercises the folder filter against a real database: the folder subtree is
 * resolved with a recursive query and fed into the workflow list query, so a
 * mocked workflow service would assert the wiring while telling us nothing about
 * which workflows actually come back.
 */
describe('searchWorkflows folder filter', () => {
	let workflowService: WorkflowService;
	let folderFinderService: FolderFinderService;
	let owner: User;
	let ownerProject: Project;
	let triggers: Folder;
	let nested: Folder;

	const names = async (params: Parameters<typeof searchWorkflows>[3], user: User = owner) => {
		const result = await searchWorkflows(user, workflowService, folderFinderService, params);
		return { names: result.data.map((workflow) => workflow.name).sort(), count: result.count };
	};

	beforeAll(async () => {
		await testDb.init();

		const license = new LicenseMocker();
		license.mock(Container.get(License));
		license.mockLicenseState(Container.get(LicenseState));

		workflowService = Container.get(WorkflowService);
		folderFinderService = Container.get(FolderFinderService);

		owner = await createOwner();
		ownerProject = await getPersonalProject(owner);

		// Triggers/ ── Nested/
		//   plus one workflow at the project root and one in an unrelated folder.
		triggers = await createFolder(ownerProject, { name: 'Triggers' });
		nested = await createFolder(ownerProject, { name: 'Nested', parentFolder: triggers });
		const other = await createFolder(ownerProject, { name: 'Other' });

		await createWorkflow({ name: 'Root flow' }, ownerProject);
		await createWorkflow({ name: 'Slack trigger', parentFolder: triggers }, ownerProject);
		await createWorkflow({ name: 'Nested slack trigger', parentFolder: nested }, ownerProject);
		await createWorkflow({ name: 'Other flow', parentFolder: other }, ownerProject);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('returns every workflow when no folder is given', async () => {
		expect(await names({})).toEqual({
			names: ['Nested slack trigger', 'Other flow', 'Root flow', 'Slack trigger'],
			count: 4,
		});
	});

	test('returns the folder and its subfolders by default', async () => {
		expect(await names({ folderId: triggers.id })).toEqual({
			names: ['Nested slack trigger', 'Slack trigger'],
			count: 2,
		});
	});

	test('returns only the folder itself when includeSubfolders is false', async () => {
		expect(await names({ folderId: triggers.id, includeSubfolders: false })).toEqual({
			names: ['Slack trigger'],
			count: 1,
		});
	});

	test('returns the workflows of a subfolder when it is the search target', async () => {
		expect(await names({ folderId: nested.id })).toEqual({
			names: ['Nested slack trigger'],
			count: 1,
		});
	});

	test('returns only project-root workflows for the root sentinel', async () => {
		expect(await names({ folderId: PROJECT_ROOT })).toEqual({
			names: ['Root flow'],
			count: 1,
		});
	});

	test('narrows a name query to the folder subtree', async () => {
		expect(await names({ folderId: triggers.id, query: 'Nested' })).toEqual({
			names: ['Nested slack trigger'],
			count: 1,
		});
	});

	test('reports the folder each workflow lives in', async () => {
		const result = await searchWorkflows(owner, workflowService, folderFinderService, {});
		const byName = new Map(result.data.map((workflow) => [workflow.name, workflow.parentFolderId]));

		expect(byName.get('Slack trigger')).toBe(triggers.id);
		expect(byName.get('Nested slack trigger')).toBe(nested.id);
		expect(byName.get('Root flow')).toBeNull();
	});

	// A workflow shared into a member's personal project keeps the parent folder of
	// its *home* project, which the member has no relation to. Filtering by the
	// parentFolderId the search just handed them has to keep working: the folder ids
	// only narrow a result set the workflow ACL already gates.
	test('filters by a folder in a project the user is not a member of', async () => {
		const member = await createMember();
		const memberProject = await getPersonalProject(member);
		const teamProject = await createTeamProject('Team', owner);
		const teamFolder = await createFolder(teamProject, { name: 'Team triggers' });

		const shared = await createWorkflow(
			{ name: 'Shared team flow', parentFolder: teamFolder },
			teamProject,
		);
		await createWorkflow({ name: 'Unshared team flow', parentFolder: teamFolder }, teamProject);
		await shareWorkflowWithProjects(shared, [{ project: memberProject }]);

		const found = await searchWorkflows(member, workflowService, folderFinderService, {});
		expect(found.data.map((workflow) => workflow.name)).toEqual(['Shared team flow']);
		const reportedFolderId = found.data[0].parentFolderId;
		expect(reportedFolderId).toBe(teamFolder.id);
		// Narrow for the round trip below; the assertion above is the real check.
		if (reportedFolderId === null) throw new Error('expected a folder id to feed back');

		// The id the tool just reported must be usable as a filter, and must not
		// widen the member's view to the workflow they cannot read.
		const filtered = await searchWorkflows(member, workflowService, folderFinderService, {
			folderId: reportedFolderId,
		});
		expect(filtered.data.map((workflow) => workflow.name)).toEqual(['Shared team flow']);
		expect(filtered.count).toBe(1);
	});

	test('rejects an unknown folder id', async () => {
		await expect(
			searchWorkflows(owner, workflowService, folderFinderService, { folderId: 'does-not-exist' }),
		).rejects.toThrow(FolderNotFoundError);
	});
});
