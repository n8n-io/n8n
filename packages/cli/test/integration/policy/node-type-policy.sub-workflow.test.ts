/**
 * Pins whose project a sub-workflow refusal names. The child is checked against its own
 * project's policy, and that refusal travels up to the parent's execution unchanged.
 */
import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ExecutionRepository, type IWorkflowDb, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { loadNodesFromDist } from '../shared/utils/node-types-data';
import { createParentWorkflowFixture, createSubWorkflowFixture } from '../shared/workflow-fixtures';
import { clearPolicyCache } from './shared/policy-cache';

const SET = 'n8n-nodes-base.set';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'executions', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let childProject: Project;
let executionRepository: ExecutionRepository;

beforeAll(async () => {
	await utils.initNodeTypes(
		loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			SET,
		]),
	);
	await utils.initBinaryDataService();

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
	executionRepository = Container.get(ExecutionRepository);
});

beforeEach(async () => {
	childProject = await createTeamProject('Child project', owner);
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'ExecutionEntity',
		'WorkflowEntity',
		'SharedWorkflow',
	]);
	await clearPolicyCache();
});

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

test("names the sub-workflow's project when that project blocks a node", async () => {
	const childFixture = createSubWorkflowFixture();
	const child = await createWorkflow(
		{
			name: 'Child',
			...childFixture,
			// Unconnected: the check reads the node list, so the node never has to run.
			nodes: [
				...childFixture.nodes,
				{
					id: uuid(),
					name: 'Set',
					type: SET,
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {},
				},
			],
			settings: { callerPolicy: 'any' },
		} as unknown as IWorkflowDb,
		childProject,
	);
	const parent = await createWorkflow(
		{ name: 'Parent', ...createParentWorkflowFixture(child.id) } as unknown as IWorkflowDb,
		owner,
	);

	await ownerAgent
		.put(`/projects/${childProject.id}/node-type-policies/project`)
		.send({
			rules: [{ id: 'deny-set', action: 'deny', selector: { kind: 'name', value: SET } }],
			defaultAction: 'allow',
			version: 0,
		})
		.expect(200);

	const response = await ownerAgent
		.post(`/workflows/${parent.id}/run`)
		.send({ triggerToStartFrom: { name: 'Trigger' } })
		.expect(200);
	const parentExecutionId = response.body.data.executionId as string;

	const execution = await waitForFinalStatus(parentExecutionId);
	expect(execution.status).toBe('error');

	const stored = await executionRepository.findSingleExecution(parentExecutionId, {
		includeData: true,
		unflattenData: true,
	});
	const error = stored?.data.resultData.error as unknown as { violations?: unknown[] };

	expect(error?.violations).toEqual([
		expect.objectContaining({
			subject: SET,
			scope: 'project',
			projectId: childProject.id,
			optInAvailable: false,
		}),
	]);
});
