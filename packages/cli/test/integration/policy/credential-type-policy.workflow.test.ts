/**
 * Pins what a real credential type policy decides for a workflow: a save that grandfathers
 * what is stored, and a publish, a run and a transfer that do not.
 *
 * The check's unit tests mock the policy store, so they prove the diff logic but not that a
 * node's `credentials` map reaches the real host paths — which is the whole mechanism here,
 * since nothing about the node types involved is blocked.
 */
import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithHistory,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	ExecutionRepository,
	WorkflowRepository,
	type IWorkflowDb,
	type Project,
	type User,
} from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createRunExecutionData, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowRunner } from '@/workflow-runner';

import { saveCredential } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { denyRule, putCredentialTypePolicy } from './shared/credential-type-policy';
import { clearPolicyCache } from './shared/policy-cache';

const CHECK_ID = 'credential-type-availability';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const SCHEDULE_TRIGGER = 'n8n-nodes-base.scheduleTrigger';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

// Both are credential types `initCredentialsTypes` registers, and neither belongs to the node
// type asking for it — the case a node policy alone cannot catch.
const BLOCKED = 'githubApi';
const ALLOWED = 'httpBasicAuth';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'activeWorkflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [
		LICENSE_FEATURES.NODE_TYPE_POLICIES,
		LICENSE_FEATURES.SHARING,
		LICENSE_FEATURES.ADVANCED_PERMISSIONS,
	],
});

let owner: User;
let projectAdmin: User;
let ownerAgent: SuperAgentTest;
let adminAgent: SuperAgentTest;
let project: Project;
let otherProject: Project;
let activeWorkflowManager: ActiveWorkflowManager;
let ownerCredentials: Record<string, string>;
let projectCredentials: Record<string, string>;
let workflowRepository: WorkflowRepository;
let executionRepository: ExecutionRepository;

const workflowsConfig = Container.get(WorkflowsConfig);
const originalUsePublicationService = workflowsConfig.useWorkflowPublicationService;

const node = (type: string, name = type): INode => ({
	id: uuid(),
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

/**
 * A real credential is referenced, not a made-up id: with sharing licensed, every workflow
 * write rejects a credential the workflow's own project cannot reach before any policy runs.
 * So each case asks for a credential in the project holding the workflow.
 */
const nodeWith = (
	credentialType: string,
	ids: Record<string, string> = ownerCredentials,
	name = credentialType,
): INode => ({
	...node(HTTP_REQUEST, name),
	credentials: {
		[credentialType]: { id: ids[credentialType], name: `${credentialType} account` },
	},
});

const violationFor = (
	credentialType: string,
	scope: 'instance' | 'project',
	matchedRuleId: string,
) => ({
	kind: 'credential-type-unavailable',
	checkId: CHECK_ID,
	message: `Credential type "${credentialType}" is blocked by ${scope === 'instance' ? 'an instance policy' : "this project's policy"}`,
	subject: credentialType,
	subjectType: 'credentialType',
	scope,
	matchedRuleId,
});

type CredentialOwner = Parameters<typeof saveCredential>[1];

const credentialsFor = async (options: CredentialOwner) =>
	Object.fromEntries(
		await Promise.all(
			[BLOCKED, ALLOWED].map(async (type) => {
				const credential = await saveCredential(randomCredentialPayload({ type }), options);
				return [type, credential.id];
			}),
		),
	) as Record<string, string>;

const denyBlockedAtInstanceScope = async () =>
	await putCredentialTypePolicy(null, { rules: [denyRule('deny-github', BLOCKED)] });

beforeAll(async () => {
	// Asserted by id, not by importing the class: the import would register the check itself,
	// and every allowed case below would pass with the module no longer registering it.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain(CHECK_ID);

	await utils.initNodeTypes();
	await utils.initCredentialsTypes();
	await utils.initBinaryDataService();

	owner = await createOwner();
	projectAdmin = await createMember();
	ownerAgent = testServer.authAgentFor(owner);
	adminAgent = testServer.authAgentFor(projectAdmin);

	project = await createTeamProject('Policy project', projectAdmin);
	otherProject = await createTeamProject('Other project', projectAdmin);

	// Shared by every case, and never truncated: what each case changes is the policy.
	[ownerCredentials, projectCredentials] = await Promise.all([
		credentialsFor({ user: owner, role: 'credential:owner' }),
		credentialsFor({ project: otherProject, role: 'credential:owner' }),
	]);

	Container.get(InstanceSettings).markAsLeader();
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	workflowRepository = Container.get(WorkflowRepository);
	executionRepository = Container.get(ExecutionRepository);

	// Activation is asserted through `ActiveWorkflowManager`; the publication applier enforces
	// the same point in its own tests.
	workflowsConfig.useWorkflowPublicationService = false;
});

afterAll(() => {
	workflowsConfig.useWorkflowPublicationService = originalUsePublicationService;
});

afterEach(async () => {
	await activeWorkflowManager.removeAll();
	await activeWorkflowManager.clearAllActivationErrors();

	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'ExecutionEntity',
		'WorkflowEntity',
		'SharedWorkflow',
		'WebhookEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
	]);
	await clearPolicyCache();
});

describe('saving a workflow', () => {
	test('saves a stored workflow whose blocked credential type it already asked for', async () => {
		const stored = await createWorkflow(
			{
				name: 'Stored workflow',
				nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED)],
				connections: {},
			},
			owner,
		);
		await denyBlockedAtInstanceScope();

		await ownerAgent
			.patch(`/workflows/${stored.id}`)
			.send({
				name: 'Renamed',
				nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED)],
				connections: {},
			})
			.expect(200);

		const after = await workflowRepository.findOneBy({ id: stored.id });
		expect(after?.name).toBe('Renamed');
	});

	test('reports the blocked credential type added to a stored workflow', async () => {
		const stored = await createWorkflow(
			{ name: 'Stored workflow', nodes: [node(MANUAL_TRIGGER)], connections: {} },
			owner,
		);
		await denyBlockedAtInstanceScope();

		const response = await ownerAgent
			.patch(`/workflows/${stored.id}`)
			.send({
				name: 'Renamed',
				nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED)],
				connections: {},
			})
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(BLOCKED, 'instance', 'deny-github')] },
		});

		const after = await workflowRepository.findOneBy({ id: stored.id });
		expect(after?.name).toBe('Stored workflow');
	});

	test('blocks a create that carries a blocked credential type and writes nothing', async () => {
		await denyBlockedAtInstanceScope();

		const response = await ownerAgent
			.post('/workflows')
			.send({
				name: 'New workflow',
				nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED)],
				connections: {},
			})
			.expect(403);

		expect(response.body.meta.violations).toEqual([
			violationFor(BLOCKED, 'instance', 'deny-github'),
		]);
		await expect(workflowRepository.count()).resolves.toBe(0);
	});

	test('saves as usual when no rule matches the credential types asked for', async () => {
		await denyBlockedAtInstanceScope();

		await ownerAgent
			.post('/workflows')
			.send({
				name: 'New workflow',
				nodes: [node(MANUAL_TRIGGER), nodeWith(ALLOWED)],
				connections: {},
			})
			.expect(200);
	});
});

describe('POST /workflows/:workflowId/activate', () => {
	test('refuses to publish a stored workflow that asks for a blocked credential type', async () => {
		const workflow = await createWorkflowWithHistory(
			{ name: 'Publishing', nodes: [node(SCHEDULE_TRIGGER), nodeWith(BLOCKED)], connections: {} },
			owner,
		);
		await denyBlockedAtInstanceScope();

		const response = await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(BLOCKED, 'instance', 'deny-github')] },
		});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBeNull();
		expect(activeWorkflowManager.allActiveInMemory()).not.toContain(workflow.id);
	});

	test('publishes as usual when no rule matches', async () => {
		const workflow = await createWorkflowWithHistory(
			{ name: 'Publishing', nodes: [node(SCHEDULE_TRIGGER), nodeWith(ALLOWED)], connections: {} },
			owner,
		);
		await denyBlockedAtInstanceScope();

		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(200);

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});
});

describe('starting a run', () => {
	const run = async (workflow: IWorkflowDb) =>
		await Container.get(WorkflowRunner).run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			true,
		);

	async function waitForFinalStatus(executionId: string, timeout = 20000) {
		const start = Date.now();

		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOne({ where: { id: executionId } });
			if (execution && ['error', 'success', 'crashed'].includes(execution.status)) {
				return execution;
			}
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		throw new Error(`Execution ${executionId} did not finish within ${timeout}ms`);
	}

	test('fails the run with the structured violation', async () => {
		const workflow = await createWorkflow(
			{ name: 'Running', nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED)], connections: {} },
			owner,
		);
		await denyBlockedAtInstanceScope();

		const execution = await waitForFinalStatus(await run(workflow));
		expect(execution.status).toBe('error');

		const stored = await executionRepository.findSingleExecution(execution.id, {
			includeData: true,
			unflattenData: true,
		});
		const error = stored?.data.resultData.error as unknown as { violations?: unknown[] };

		expect(error?.violations).toEqual([violationFor(BLOCKED, 'instance', 'deny-github')]);
	});

	test('runs as usual when no rule matches', async () => {
		const workflow = await createWorkflow(
			{ name: 'Running', nodes: [node(MANUAL_TRIGGER)], connections: {} },
			owner,
		);
		await denyBlockedAtInstanceScope();

		const execution = await waitForFinalStatus(await run(workflow));
		expect(execution.status).toBe('success');
	});
});

describe('PUT /workflows/:workflowId/transfer', () => {
	test('judges the workflow against the target project, with no grandfathering', async () => {
		const workflow = await createWorkflow(
			{
				name: 'Moving workflow',
				nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED, projectCredentials)],
				connections: {},
			},
			otherProject,
		);
		await putCredentialTypePolicy(project.id, { rules: [denyRule('deny-github', BLOCKED)] });

		const response = await adminAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: project.id })
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(BLOCKED, 'project', 'deny-github')] },
		});
	});

	test('allows the transfer when only the source project restricts the type', async () => {
		const workflow = await createWorkflow(
			{
				name: 'Moving workflow',
				nodes: [node(MANUAL_TRIGGER), nodeWith(BLOCKED, projectCredentials)],
				connections: {},
			},
			otherProject,
		);
		await putCredentialTypePolicy(otherProject.id, { rules: [denyRule('deny-github', BLOCKED)] });

		await adminAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: project.id })
			.expect(200);
	});
});
