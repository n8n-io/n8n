import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createFolder } from '../shared/db/folders';
import { createUser } from '../shared/db/users';

let owner: User;
let member: User;
let anotherMember: User;
let workflowFinderService: WorkflowFinderService;

beforeAll(async () => {
	await testDb.init();
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	member = await createUser({ role: GLOBAL_MEMBER_ROLE });
	anotherMember = await createUser({ role: GLOBAL_MEMBER_ROLE });
	workflowFinderService = Container.get(WorkflowFinderService);
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'Folder']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowFinderService', () => {
	describe('findOwnedWorkflowRemovalCandidates', () => {
		it('returns only requested unarchived workflows owned by the project', async () => {
			const project = await createTeamProject('Target', owner);
			const otherProject = await createTeamProject('Other', owner);
			const folder = await createFolder(project);
			const root = await createWorkflow({ name: 'Root' }, project);
			const nested = await createWorkflow({ name: 'Nested', parentFolder: folder }, project);
			const archived = await createWorkflow({ isArchived: true }, project);
			await createWorkflow({ name: 'Unrequested' }, project);
			const other = await createWorkflow({}, otherProject);
			const shared = await createWorkflow({}, otherProject);
			await shareWorkflowWithProjects(shared, [{ project, role: 'workflow:editor' }]);

			const candidates = await workflowFinderService.findOwnedWorkflowRemovalCandidates(
				project.id,
				[root.id, nested.id, archived.id, other.id, shared.id, 'missing', root.id],
			);

			expect(candidates).toHaveLength(2);
			expect(candidates).toEqual(
				expect.arrayContaining([
					{ id: root.id, name: 'Root', parentFolderId: null },
					{ id: nested.id, name: 'Nested', parentFolderId: folder.id },
				]),
			);
		});
	});

	describe('findWorkflowHeadForUser', () => {
		it('should return the workflow head for a user with a project-scoped role', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, member, [
				'workflow:publish',
			]);

			expect(head?.versionId).toBe(workflow.versionId);
			expect(head?.updatedAt).toBeInstanceOf(Date);
		});

		it('should return the workflow head for a user with a global scope', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, owner, [
				'workflow:publish',
			]);

			expect(head?.versionId).toBe(workflow.versionId);
			expect(head?.updatedAt).toBeInstanceOf(Date);
		});

		it('should report a null published version while the workflow is unpublished', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, owner, [
				'workflow:publish',
			]);

			expect(head?.activeVersionId).toBeNull();
		});

		it('should return the published version alongside the draft version', async () => {
			const workflow = await createActiveWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, owner, [
				'workflow:publish',
			]);

			expect(head?.activeVersionId).toBe(workflow.versionId);
			expect(head?.versionId).toBe(workflow.versionId);
		});

		it('should return null for a user without access to the workflow', async () => {
			const workflow = await createWorkflow({}, member);

			const head = await workflowFinderService.findWorkflowHeadForUser(workflow.id, anotherMember, [
				'workflow:publish',
			]);

			expect(head).toBeNull();
		});
	});
});
