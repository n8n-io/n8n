/**
 * Pins what an `extends` rule decides for real host paths: a rule on a base credential type
 * refuses a workflow that asks for a type built on it, exactly as a rule on that type would.
 */
import { createWorkflow, randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import type { PolicyRule } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ExecutionRepository, WorkflowRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createRunExecutionData, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { WorkflowRunner } from '@/workflow-runner';

import { saveCredential } from '../shared/db/credentials';
import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { putCredentialTypePolicy } from './shared/credential-type-policy';
import { clearPolicyCache } from './shared/policy-cache';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

const BASE = 'oAuth2Api';
const DERIVED = 'googleSheetsOAuth2Api';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES, LICENSE_FEATURES.SHARING],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let derivedCredentialId: string;
let workflowRepository: WorkflowRepository;
let executionRepository: ExecutionRepository;

const denyFamily: PolicyRule = {
	id: 'deny-oauth2-family',
	action: 'deny',
	selector: { kind: 'extends', value: BASE },
};

const node = (type: string): INode => ({
	id: uuid(),
	name: type,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const workflowBody = () => ({
	name: 'Sheets workflow',
	nodes: [
		node(MANUAL_TRIGGER),
		{
			...node(HTTP_REQUEST),
			credentials: { [DERIVED]: { id: derivedCredentialId, name: 'Sheets account' } },
		},
	],
	connections: {},
});

const derivedViolation = {
	kind: 'credential-type-unavailable',
	checkId: 'credential-type-availability',
	message: `Credential type "${DERIVED}" is blocked by an instance policy`,
	subject: DERIVED,
	subjectType: 'credentialType',
	scope: 'instance',
	matchedRuleId: 'deny-oauth2-family',
};

beforeAll(async () => {
	await utils.initNodeTypes();
	await utils.initCredentialsTypes();
	await utils.initBinaryDataService();

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
	workflowRepository = Container.get(WorkflowRepository);
	executionRepository = Container.get(ExecutionRepository);

	const credential = await saveCredential(randomCredentialPayload({ type: DERIVED }), {
		user: owner,
		role: 'credential:owner',
	});
	derivedCredentialId = credential.id;
});

// Per test: the shared setup restores every mock after each one.
beforeEach(() => {
	vi.spyOn(Container.get(LoadNodesAndCredentials), 'knownCredentials', 'get').mockReturnValue({
		[BASE]: { className: '', sourcePath: '' },
		googleOAuth2Api: { className: '', sourcePath: '', extends: [BASE] },
		[DERIVED]: { className: '', sourcePath: '', extends: ['googleOAuth2Api'] },
	});
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'ExecutionEntity',
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
	]);
	await clearPolicyCache();
});

describe('a rule on a base credential type', () => {
	test('refuses saving a workflow that asks for a type built on it', async () => {
		await putCredentialTypePolicy(ownerAgent, null, { rules: [denyFamily] });

		const response = await ownerAgent.post('/workflows').send(workflowBody()).expect(403);

		expect(response.body.meta.violations).toEqual([derivedViolation]);
		await expect(workflowRepository.count()).resolves.toBe(0);
	});

	test('fails a run of a workflow that asks for a type built on it', async () => {
		const workflow = await createWorkflow(workflowBody(), owner);
		await putCredentialTypePolicy(ownerAgent, null, { rules: [denyFamily] });

		const executionId = await Container.get(WorkflowRunner).run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			true,
		);

		await vi.waitFor(
			async () => {
				const execution = await executionRepository.findOneBy({ id: executionId });
				expect(execution?.status).toBe('error');
			},
			{ timeout: 20000, interval: 50 },
		);
		const stored = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		const error = stored?.data.resultData.error as unknown as { violations?: unknown[] };

		expect(error?.violations).toEqual([derivedViolation]);
	});

	test('lets an earlier allow for the derived type win over the family deny', async () => {
		await putCredentialTypePolicy(ownerAgent, null, {
			rules: [
				{ id: 'allow-sheets', action: 'allow', selector: { kind: 'name', value: DERIVED } },
				denyFamily,
			],
		});

		await ownerAgent.post('/workflows').send(workflowBody()).expect(200);
	});

	test('leaves a type built on the base allowed when the rule names the base exactly', async () => {
		await putCredentialTypePolicy(ownerAgent, null, {
			rules: [{ id: 'deny-generic', action: 'deny', selector: { kind: 'name', value: BASE } }],
		});

		await ownerAgent.post('/workflows').send(workflowBody()).expect(200);
	});
});

describe('writing an extends rule', () => {
	test('rejects a base credential type that is not installed', async () => {
		const response = await ownerAgent.put('/credential-type-policies/instance').send({
			rules: [
				{ id: 'r1', action: 'deny', selector: { kind: 'extends', value: 'notInstalledApi' } },
			],
			defaultAction: 'allow',
			version: 0,
		});

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(
			'Extends rule names a credential type that is not installed: notInstalledApi',
		);
	});

	test('rejects the rule in a node type policy request', async () => {
		const response = await ownerAgent.put('/node-type-policies/instance').send({
			rules: [denyFamily],
			defaultAction: 'allow',
			version: 0,
		});

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe("Invalid discriminator value. Expected 'name' | 'package'");
	});
});
