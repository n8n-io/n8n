import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import {
	CredentialsFinderService,
	RoleService,
	WorkflowFinderService,
} from '@n8n/backend-services';
import type { CredentialsEntity, Project, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { saveCredential, shareCredentialWithUsers } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';

import { getWorkflowDetails } from '../tools/get-workflow-details.tool';

const HEADER_NAME = 'X-Team-Header';
const nodeTypes = mock<INodeTypes>();
const endpoints = { webhook: 'webhook', webhookTest: 'webhook-test' };

const headerAuthPayload = {
	name: 'Header Auth',
	type: 'httpHeaderAuth',
	data: { name: HEADER_NAME, value: 'header-value' },
};

let owner: User;
let editor: User;
let viewer: User;
let teamProject: Project;

const createHeaderAuthWorkflow = async (credential: CredentialsEntity) => {
	const webhookNode: INode = {
		id: 'webhook-node',
		name: 'Secured Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [0, 0],
		parameters: { authentication: 'headerAuth', path: 'secured', httpMethod: 'POST' },
		credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
	};
	return await createWorkflow(
		{ settings: { availableInMCP: true }, nodes: [webhookNode] },
		teamProject,
	);
};

const triggerInfoFor = async (workflowId: string, user: User) => {
	const payload = await getWorkflowDetails(
		user,
		'https://example.test',
		Container.get(WorkflowFinderService),
		Container.get(CredentialsService),
		Container.get(CredentialsFinderService),
		nodeTypes,
		endpoints,
		Container.get(RoleService),
		Container.get(ProjectService),
		{ workflowId },
	);
	return payload.triggerInfo;
};

beforeAll(async () => {
	await testDb.init();

	owner = await createOwner();
	teamProject = await createTeamProject('Team', owner);
	editor = await createMember();
	viewer = await createMember();
	await linkUserToProject(editor, teamProject, 'project:editor');
	await linkUserToProject(viewer, teamProject, 'project:viewer');
});

afterAll(async () => {
	await testDb.terminate();
});

describe('get_workflow_details webhook credentials against a real database', () => {
	test('shows the header name to a team editor when the credential is in the team project', async () => {
		const credential = await saveCredential(headerAuthPayload, {
			project: teamProject,
			role: 'credential:owner',
		});
		const workflow = await createHeaderAuthWorkflow(credential);

		const triggerInfo = await triggerInfoFor(workflow.id, editor);

		expect(triggerInfo).toContain(`requires a header with name "${HEADER_NAME}"`);
	});

	test('shows the header name to the instance owner', async () => {
		const credential = await saveCredential(headerAuthPayload, {
			project: teamProject,
			role: 'credential:owner',
		});
		const workflow = await createHeaderAuthWorkflow(credential);

		const triggerInfo = await triggerInfoFor(workflow.id, owner);

		expect(triggerInfo).toContain(`requires a header with name "${HEADER_NAME}"`);
	});

	test('hides the header name from a team viewer', async () => {
		const credential = await saveCredential(headerAuthPayload, {
			project: teamProject,
			role: 'credential:owner',
		});
		const workflow = await createHeaderAuthWorkflow(credential);

		const triggerInfo = await triggerInfoFor(workflow.id, viewer);

		expect(triggerInfo).toContain('requires header authentication');
		expect(triggerInfo).not.toContain(HEADER_NAME);
	});

	test('hides the header name when the credential is in the personal project of another user', async () => {
		const credential = await saveCredential(headerAuthPayload, {
			user: owner,
			role: 'credential:owner',
		});
		const workflow = await createHeaderAuthWorkflow(credential);

		const triggerInfo = await triggerInfoFor(workflow.id, editor);

		expect(triggerInfo).toContain('Node name: Secured Webhook');
		expect(triggerInfo).toContain('requires header authentication');
		expect(triggerInfo).not.toContain(HEADER_NAME);
	});

	test('hides the header name when the credential is only shared for use', async () => {
		const credential = await saveCredential(headerAuthPayload, {
			user: owner,
			role: 'credential:owner',
		});
		await shareCredentialWithUsers(credential, [editor]);
		const workflow = await createHeaderAuthWorkflow(credential);

		const triggerInfo = await triggerInfoFor(workflow.id, editor);

		expect(triggerInfo).toContain('requires header authentication');
		expect(triggerInfo).not.toContain(HEADER_NAME);
	});

	test('hides the header name of a global credential from a member', async () => {
		const credential = await saveCredential(
			{ ...headerAuthPayload, isGlobal: true },
			{ user: owner, role: 'credential:owner' },
		);
		const workflow = await createHeaderAuthWorkflow(credential);

		const triggerInfo = await triggerInfoFor(workflow.id, editor);

		expect(triggerInfo).toContain('requires header authentication');
		expect(triggerInfo).not.toContain(HEADER_NAME);
	});

	test('keeps the header authentication requirement when the credential was deleted', async () => {
		const credential = await saveCredential(headerAuthPayload, {
			project: teamProject,
			role: 'credential:owner',
		});
		const workflow = await createHeaderAuthWorkflow(credential);
		await Container.get(CredentialsRepository).delete(credential.id);

		const triggerInfo = await triggerInfoFor(workflow.id, owner);

		expect(triggerInfo).toContain('requires header authentication');
		expect(triggerInfo).not.toContain('No credentials required');
	});
});
