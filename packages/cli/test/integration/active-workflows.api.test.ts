import {
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
	shareWorkflowWithProjects,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationTriggerStatusRepository } from '@n8n/db';
import type { TriggerStatusRow, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let owner: User;
let member: User;
let anotherMember: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['activeWorkflows'] });

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowPublicationTriggerStatus',
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'ProjectRelation',
		'Project',
		'User',
	]);

	owner = await createOwner();
	member = await createMember();
	anotherMember = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
});

describe('GET /active-workflows', () => {
	it('returns every active workflow id to a global owner', async () => {
		const firstWorkflow = await createActiveWorkflow({}, member);
		const secondWorkflow = await createActiveWorkflow({}, anotherMember);

		const response = await authOwnerAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toEqual(
			expect.arrayContaining([firstWorkflow.id, secondWorkflow.id]),
		);
		expect(response.body.data).toHaveLength(2);
	});

	it('returns only active workflow ids the member can list', async () => {
		const ownWorkflow = await createActiveWorkflow({}, member);

		const sharedWorkflow = await createActiveWorkflow({}, anotherMember);
		await shareWorkflowWithUsers(sharedWorkflow, [member]);

		const teamProject = await createTeamProject('Team Project', anotherMember);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const teamWorkflow = await createActiveWorkflow({}, teamProject);

		const inaccessiblePersonalWorkflow = await createActiveWorkflow({}, anotherMember);
		const inaccessibleProject = await createTeamProject('Other Team Project', anotherMember);
		const inaccessibleProjectWorkflow = await createActiveWorkflow({}, inaccessibleProject);

		const response = await authMemberAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toHaveLength(3);
		expect(response.body.data).toEqual(
			expect.arrayContaining([ownWorkflow.id, sharedWorkflow.id, teamWorkflow.id]),
		);
		expect(response.body.data).not.toContain(inaccessiblePersonalWorkflow.id);
		expect(response.body.data).not.toContain(inaccessibleProjectWorkflow.id);
	});

	// `project:chatUser` is the only built-in project role without `workflow:list`
	it('does not return active workflow ids from a project the member belongs to but cannot list', async () => {
		const chatOnlyProject = await createTeamProject('Chat Only Project', anotherMember);
		await linkUserToProject(member, chatOnlyProject, 'project:chatUser');
		const chatOnlyWorkflow = await createActiveWorkflow({}, chatOnlyProject);

		const response = await authMemberAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toEqual([]);
		expect(response.body.data).not.toContain(chatOnlyWorkflow.id);
	});

	it('returns an active workflow id once when it is shared with several projects the member can list', async () => {
		const workflow = await createActiveWorkflow({}, member);
		const teamProject = await createTeamProject('Team Project', member);
		await shareWorkflowWithProjects(workflow, [{ project: teamProject, role: 'workflow:editor' }]);

		const response = await authMemberAgent.get('/active-workflows').expect(200);

		expect(response.body.data).toEqual([workflow.id]);
	});
});

describe('with trigger status rows', () => {
	let originalFlag: boolean;

	beforeAll(() => {
		const workflowsConfig = Container.get(WorkflowsConfig);
		originalFlag = workflowsConfig.useWorkflowPublicationService;
		workflowsConfig.useWorkflowPublicationService = true;
	});

	afterAll(() => {
		Container.get(WorkflowsConfig).useWorkflowPublicationService = originalFlag;
	});

	const FAILED = { status: 'failed', errorMessage: 'Could not register trigger' } as const;
	const ACTIVATED = { status: 'activated', errorMessage: null } as const;

	async function createActiveWorkflowWithTriggerRows(
		user: User,
		rows: Array<Pick<TriggerStatusRow, 'status' | 'errorMessage'>>,
	) {
		const workflow = await createActiveWorkflow({}, user);
		await Container.get(WorkflowPublicationTriggerStatusRepository).replaceForWorkflow(
			workflow.id,
			rows.map((row, index) => ({
				nodeId: `node-${index}`,
				versionId: workflow.versionId,
				triggerKind: 'in-memory',
				...row,
			})),
		);
		return workflow;
	}

	describe('GET /active-workflows', () => {
		it('omits a workflow whose publication failed', async () => {
			const failed = await createActiveWorkflowWithTriggerRows(member, [FAILED]);
			const published = await createActiveWorkflowWithTriggerRows(member, [ACTIVATED]);
			const partial = await createActiveWorkflowWithTriggerRows(member, [ACTIVATED, FAILED]);
			const withoutRows = await createActiveWorkflow({}, anotherMember);

			const response = await authOwnerAgent.get('/active-workflows').expect(200);

			expect(response.body.data).toEqual(
				expect.arrayContaining([published.id, partial.id, withoutRows.id]),
			);
			expect(response.body.data).not.toContain(failed.id);
			expect(response.body.data).toHaveLength(3);
		});

		it('omits a failed publication from the ids a member can list', async () => {
			const failed = await createActiveWorkflowWithTriggerRows(member, [FAILED]);
			const published = await createActiveWorkflowWithTriggerRows(member, [ACTIVATED]);
			const partial = await createActiveWorkflowWithTriggerRows(member, [ACTIVATED, FAILED]);

			const response = await authMemberAgent.get('/active-workflows').expect(200);

			expect(response.body.data).toEqual(expect.arrayContaining([published.id, partial.id]));
			expect(response.body.data).not.toContain(failed.id);
			expect(response.body.data).toHaveLength(2);
		});
	});

	describe('GET /active-workflows/error/:id', () => {
		it('returns the trigger error of a failed publication', async () => {
			const failed = await createActiveWorkflowWithTriggerRows(owner, [FAILED]);

			const response = await authOwnerAgent.get(`/active-workflows/error/${failed.id}`).expect(200);

			expect(response.body.data).toBe('Could not register trigger');
		});

		it('rejects a member without access to the workflow', async () => {
			const failed = await createActiveWorkflowWithTriggerRows(owner, [FAILED]);

			await authMemberAgent.get(`/active-workflows/error/${failed.id}`).expect(400);
		});

		it('returns null for a partial publication', async () => {
			const partial = await createActiveWorkflowWithTriggerRows(owner, [ACTIVATED, FAILED]);

			const response = await authOwnerAgent
				.get(`/active-workflows/error/${partial.id}`)
				.expect(200);

			expect(response.body.data).toBeNull();
		});
	});
});
