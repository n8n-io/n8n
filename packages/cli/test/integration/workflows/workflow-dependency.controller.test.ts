import { randomUUID } from 'node:crypto';

import {
	createWorkflow,
	randomCredentialPayload,
	shareWorkflowWithUsers,
} from '@n8n/backend-test-utils';
import { ModuleRegistry } from '@n8n/backend-common';
import { ProjectRepository, WorkflowDependencyRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentCredentialDependency } from '@/modules/agents/entities/agent-credential-dependency.entity';
import { AgentHistory } from '@/modules/agents/entities/agent-history.entity';
import { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentCredentialDependencyRepository } from '@/modules/agents/repositories/agent-credential-dependency.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { saveCredential } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';

let testServer: ReturnType<typeof utils.setupTestServer>;
let depRepo: WorkflowDependencyRepository;
let agentDepRepo: AgentCredentialDependencyRepository;
let agentHistoryRepo: AgentHistoryRepository;
let agentRepo: AgentRepository;
let projectRepo: ProjectRepository;

beforeAll(() => {
	const moduleRegistry = Container.get(ModuleRegistry);
	moduleRegistry.entities.push(Agent, AgentHistory, AgentCredentialDependency);
	moduleRegistry.getActiveModules().push('agents');
});

testServer = utils.setupTestServer({
	endpointGroups: ['workflowDependencies'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions'],
});

beforeAll(() => {
	depRepo = Container.get(WorkflowDependencyRepository);
	agentDepRepo = Container.get(AgentCredentialDependencyRepository);
	agentHistoryRepo = Container.get(AgentHistoryRepository);
	agentRepo = Container.get(AgentRepository);
	projectRepo = Container.get(ProjectRepository);
});

/** Seed a workflow_dependency row (draft). */
async function seedDep(workflowId: string, dependencyType: string, dependencyKey: string) {
	await depRepo.save(
		depRepo.create({
			workflowId,
			workflowVersionId: 1,
			publishedVersionId: null,
			dependencyType: dependencyType as 'credentialId',
			dependencyKey,
			dependencyInfo: null,
			indexVersionId: 1,
		}),
	);
}

async function seedAgentCredentialDependencies(
	user: User,
	credentialId: string,
	name = 'Support Agent',
) {
	const project = await projectRepo.getPersonalProjectForUserOrFail(user.id);
	const agent = agentRepo.create({
		name,
		projectId: project.id,
		schema: {
			name,
			model: 'openai/gpt-4.1-mini',
			instructions: 'Help the user',
			credential: credentialId,
			tools: [],
			skills: [],
		},
		integrations: [],
		tools: {},
		skills: {},
		versionId: 'draft-version-1',
	});
	await agentRepo.save(agent);

	const publishedVersionId = randomUUID();
	await agentHistoryRepo.saveVersion({
		versionId: publishedVersionId,
		agentId: agent.id,
		schema: agent.schema,
		tools: agent.tools,
		skills: agent.skills,
		publishedBy: user,
	});
	agent.activeVersionId = publishedVersionId;
	await agentRepo.save(agent);
	await agentDepRepo.refreshForAgent(agent.id);

	return agent;
}

describe('POST /workflow-dependencies/counts', () => {
	it('should return counts only for workflows the user owns', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const ownerWorkflow = await createWorkflow({}, owner);
		const memberWorkflow = await createWorkflow({}, member);

		await seedDep(ownerWorkflow.id, 'credentialId', 'cred-1');
		await seedDep(memberWorkflow.id, 'credentialId', 'cred-2');

		// Member queries both workflows — should only see their own
		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/counts')
			.send({
				resourceIds: [ownerWorkflow.id, memberWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).not.toHaveProperty(ownerWorkflow.id);
		expect(resp.body.data).toHaveProperty(memberWorkflow.id);
		expect(resp.body.data[memberWorkflow.id].credentialId).toBe(1);
	});

	it('should return counts for credential resources the user owns', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const ownerCred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const memberCred = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});

		// Create a workflow that uses both credentials
		const wf = await createWorkflow({}, owner);
		await seedDep(wf.id, 'credentialId', ownerCred.id);
		await seedDep(wf.id, 'credentialId', memberCred.id);

		// Member queries dependency counts for both credentials
		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/counts')
			.send({
				resourceIds: [ownerCred.id, memberCred.id],
				resourceType: 'credential',
			});

		expect(resp.statusCode).toBe(200);
		// Member can only see their own credential
		expect(resp.body.data).not.toHaveProperty(ownerCred.id);
		expect(resp.body.data).toHaveProperty(memberCred.id);
		expect(resp.body.data[memberCred.id].workflowParent).toBe(1);
	});

	it('should count an agent once when draft and published versions use the credential', async () => {
		const owner = await createOwner();
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		await seedAgentCredentialDependencies(owner, credential.id);

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/counts')
			.send({ resourceIds: [credential.id], resourceType: 'credential' });

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data[credential.id].agentUsage).toBe(1);
	});

	it('should include counts for dependencies the user cannot access', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const memberWorkflow = await createWorkflow({}, member);
		const ownerCred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		// memberWorkflow uses a credential owned by the owner
		await seedDep(memberWorkflow.id, 'credentialId', ownerCred.id);

		// Member queries counts for their own workflow
		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/counts')
			.send({
				resourceIds: [memberWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		// The credential count should include the inaccessible credential
		expect(resp.body.data[memberWorkflow.id].credentialId).toBe(1);
	});

	it('should count multiple dependency types on the same workflow', async () => {
		const owner = await createOwner();

		const workflow = await createWorkflow({}, owner);
		const subWorkflow = await createWorkflow({}, owner);
		const cred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await seedDep(workflow.id, 'credentialId', cred.id);
		await seedDep(workflow.id, 'workflowCall', subWorkflow.id);

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/counts')
			.send({
				resourceIds: [workflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data[workflow.id]).toMatchObject({
			credentialId: 1,
			workflowCall: 1,
			dataTableId: 0,
			workflowParent: 0,
		});
	});

	it('should return zero counts for an accessible resource with no dependencies', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({}, owner);

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/counts')
			.send({
				resourceIds: [workflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		// Accessible but no deps → empty object (no entry)
		expect(resp.body.data).not.toHaveProperty(workflow.id);
	});

	it('owner can see all workflows', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const ownerWorkflow = await createWorkflow({}, owner);
		const memberWorkflow = await createWorkflow({}, member);

		await seedDep(ownerWorkflow.id, 'credentialId', 'cred-1');
		await seedDep(memberWorkflow.id, 'credentialId', 'cred-2');

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/counts')
			.send({
				resourceIds: [ownerWorkflow.id, memberWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toHaveProperty(ownerWorkflow.id);
		expect(resp.body.data).toHaveProperty(memberWorkflow.id);
	});
});

describe('POST /workflow-dependencies/details', () => {
	it('should filter out inaccessible input resourceIds', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const memberWorkflow = await createWorkflow({}, member);
		const ownerWorkflow = await createWorkflow({}, owner);

		await seedDep(memberWorkflow.id, 'credentialId', 'cred-1');
		await seedDep(ownerWorkflow.id, 'credentialId', 'cred-2');

		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [memberWorkflow.id, ownerWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toHaveProperty(memberWorkflow.id);
		expect(resp.body.data).not.toHaveProperty(ownerWorkflow.id);
	});

	it('should resolve names for accessible dependencies', async () => {
		const owner = await createOwner();

		const workflow1 = await createWorkflow({ name: 'Main WF' }, owner);
		const workflow2 = await createWorkflow({ name: 'Sub WF' }, owner);

		const cred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		await seedDep(workflow1.id, 'workflowCall', workflow2.id);
		await seedDep(workflow1.id, 'credentialId', cred.id);

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [workflow1.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		const result = resp.body.data[workflow1.id];
		expect(result.dependencies).toHaveLength(2);
		expect(result.inaccessibleCount).toBe(0);

		const subWf = result.dependencies.find((d: { type: string }) => d.type === 'workflowCall');
		expect(subWf).toMatchObject({ id: workflow2.id, name: 'Sub WF', type: 'workflowCall' });

		const credDep = result.dependencies.find((d: { type: string }) => d.type === 'credentialId');
		expect(credDep).toMatchObject({ id: cred.id, name: cred.name, type: 'credentialId' });
	});

	it('should return empty object when no resourceIds pass access filtering', async () => {
		const member = await createMember();
		const otherMember = await createMember();

		const otherWorkflow = await createWorkflow({}, otherMember);
		await seedDep(otherWorkflow.id, 'credentialId', 'cred-1');

		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [otherWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toEqual({});
	});

	it('should return parent workflows for a credential resource', async () => {
		const owner = await createOwner();

		const cred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const parentWf = await createWorkflow({ name: 'Parent WF' }, owner);
		await seedDep(parentWf.id, 'credentialId', cred.id);

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [cred.id],
				resourceType: 'credential',
			});

		expect(resp.statusCode).toBe(200);
		const result = resp.body.data[cred.id];
		expect(result.dependencies).toHaveLength(1);
		expect(result.inaccessibleCount).toBe(0);
		expect(result.dependencies[0]).toMatchObject({
			id: parentWf.id,
			name: 'Parent WF',
			type: 'workflowParent',
		});
	});

	it('should resolve an accessible agent using a credential', async () => {
		const owner = await createOwner();
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const agent = await seedAgentCredentialDependencies(owner, credential.id, 'Support Agent');

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/details')
			.send({ resourceIds: [credential.id], resourceType: 'credential' });

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data[credential.id]).toEqual({
			dependencies: [
				{
					id: agent.id,
					name: 'Support Agent',
					type: 'agentUsage',
					projectId: agent.projectId,
				},
			],
			inaccessibleCount: 0,
		});
	});

	it('should report an inaccessible agent without exposing its details', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});
		await seedAgentCredentialDependencies(owner, credential.id, 'Private Agent');

		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/details')
			.send({ resourceIds: [credential.id], resourceType: 'credential' });

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data[credential.id]).toEqual({
			dependencies: [],
			inaccessibleCount: 1,
		});
	});

	it('should exclude inaccessible deps and report inaccessibleCount', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const memberWorkflow = await createWorkflow({ name: 'Member WF' }, member);
		const ownerWorkflow = await createWorkflow({ name: 'Owner WF' }, owner);
		const memberSubWorkflow = await createWorkflow({ name: 'Member Sub' }, member);

		// memberWorkflow calls both an accessible and an inaccessible sub-workflow
		await seedDep(memberWorkflow.id, 'workflowCall', ownerWorkflow.id);
		await seedDep(memberWorkflow.id, 'workflowCall', memberSubWorkflow.id);

		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [memberWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		const result = resp.body.data[memberWorkflow.id];
		expect(result.dependencies).toHaveLength(1);
		expect(result.inaccessibleCount).toBe(1);

		expect(result.dependencies[0]).toMatchObject({
			id: memberSubWorkflow.id,
			name: 'Member Sub',
			type: 'workflowCall',
		});
	});

	it('should drop dependencies referencing deleted resources instead of counting them as inaccessible', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const memberWorkflow = await createWorkflow({}, member);
		const memberCred = await saveCredential(randomCredentialPayload(), {
			user: member,
			role: 'credential:owner',
		});
		const ownerCred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		// One accessible credential, one existing but inaccessible credential,
		// and one index entry left behind by a deleted credential
		await seedDep(memberWorkflow.id, 'credentialId', memberCred.id);
		await seedDep(memberWorkflow.id, 'credentialId', ownerCred.id);
		await seedDep(memberWorkflow.id, 'credentialId', 'deleted-cred-id');

		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [memberWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		const result = resp.body.data[memberWorkflow.id];
		expect(result.dependencies).toHaveLength(1);
		expect(result.dependencies[0]).toMatchObject({ id: memberCred.id, type: 'credentialId' });
		expect(result.inaccessibleCount).toBe(1);
	});

	it('should drop workflow call dependencies referencing deleted workflows', async () => {
		const owner = await createOwner();

		const workflow = await createWorkflow({ name: 'Main WF' }, owner);
		const subWorkflow = await createWorkflow({ name: 'Sub WF' }, owner);

		await seedDep(workflow.id, 'workflowCall', subWorkflow.id);
		await seedDep(workflow.id, 'workflowCall', 'deleted-wf-id');

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [workflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		const result = resp.body.data[workflow.id];
		expect(result.dependencies).toHaveLength(1);
		expect(result.dependencies[0]).toMatchObject({
			id: subWorkflow.id,
			name: 'Sub WF',
			type: 'workflowCall',
		});
		expect(result.inaccessibleCount).toBe(0);
	});

	it('should return details for a shared workflow', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const sharedWorkflow = await createWorkflow({ name: 'Shared WF' }, owner);
		await shareWorkflowWithUsers(sharedWorkflow, [member]);

		const cred = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		await seedDep(sharedWorkflow.id, 'credentialId', cred.id);

		// Member can access the shared workflow
		const resp = await testServer
			.authAgentFor(member)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: [sharedWorkflow.id],
				resourceType: 'workflow',
			});

		expect(resp.statusCode).toBe(200);
		expect(resp.body.data).toHaveProperty(sharedWorkflow.id);
		// Member can access the shared workflow but not the owner's credential,
		// so the credential shows up as inaccessible rather than a resolved dependency
		expect(resp.body.data[sharedWorkflow.id].dependencies).toHaveLength(0);
		expect(resp.body.data[sharedWorkflow.id].inaccessibleCount).toBe(1);
	});

	it('should require resourceType in the request body', async () => {
		const owner = await createOwner();

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: ['some-id'],
			});

		expect(resp.statusCode).toBe(400);
	});

	it('should reject invalid resourceType', async () => {
		const owner = await createOwner();

		const resp = await testServer
			.authAgentFor(owner)
			.post('/workflow-dependencies/details')
			.send({
				resourceIds: ['some-id'],
				resourceType: 'invalid',
			});

		expect(resp.statusCode).toBe(400);
	});

	it('should reject empty resourceIds array', async () => {
		const owner = await createOwner();

		const resp = await testServer.authAgentFor(owner).post('/workflow-dependencies/details').send({
			resourceIds: [],
			resourceType: 'workflow',
		});

		expect(resp.statusCode).toBe(400);
	});
});
