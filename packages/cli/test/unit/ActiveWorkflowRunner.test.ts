import { v4 as uuid } from 'uuid';
import { mocked } from 'jest-mock';

import {
	ICredentialTypes,
	INodesAndCredentials,
	LoggerProxy,
	NodeOperationError,
	Workflow,
} from 'n8n-workflow';

import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { Role } from '@db/entities/Role';
import { User } from '@db/entities/User';
import { getLogger } from '@/Logger';
import { randomEmail, randomName } from '../integration/shared/random';
import * as Helpers from './Helpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';

import { WorkflowRunner } from '@/WorkflowRunner';
import { mock } from 'jest-mock-extended';
import { ExternalHooks } from '@/ExternalHooks';
import { Container } from 'typedi';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { mockInstance } from '../integration/shared/utils';
import { Push } from '@/push';
import { ActiveExecutions } from '@/ActiveExecutions';
import { NodeTypes } from '@/NodeTypes';

/**
 * TODO:
 * - test workflow webhooks activation (that trigger `executeWebhook`and other webhook methods)
 * - test activation error catching and getters such as `getActivationError` (requires building a workflow that fails to activate)
 * - test queued workflow activation functions (might need to create a non-working workflow to test this)
 */

let databaseActiveWorkflowsCount = 0;
let databaseActiveWorkflowsList: WorkflowEntity[] = [];

const generateWorkflows = (count: number): WorkflowEntity[] => {
	const workflows: WorkflowEntity[] = [];
	const ownerRole = new Role();
	ownerRole.scope = 'workflow';
	ownerRole.name = 'owner';
	ownerRole.id = '1';

	const owner = new User();
	owner.id = uuid();
	owner.firstName = randomName();
	owner.lastName = randomName();
	owner.email = randomEmail();

	for (let i = 0; i < count; i++) {
		const workflow = new WorkflowEntity();
		Object.assign(workflow, {
			id: i + 1,
			name: randomName(),
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: [
				{
					parameters: {
						rule: {
							interval: [{}],
						},
					},
					id: uuid(),
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [900, 460],
				},
			],
			connections: {},
			tags: [],
		});
		const sharedWorkflow = new SharedWorkflow();
		sharedWorkflow.workflowId = workflow.id;
		sharedWorkflow.role = ownerRole;
		sharedWorkflow.user = owner;

		workflow.shared = [sharedWorkflow];

		workflows.push(workflow);
	}
	databaseActiveWorkflowsList = workflows;
	return workflows;
};

const MOCK_NODE_TYPES_DATA = Helpers.mockNodeTypesData(['scheduleTrigger'], {
	addTrigger: true,
});

jest.mock('@/Db', () => {
	return {
		collections: {
			Workflow: {
				find: jest.fn(async () => Promise.resolve(generateWorkflows(databaseActiveWorkflowsCount))),
				findOne: jest.fn(async (searchParams) => {
					const foundWorkflow = databaseActiveWorkflowsList.find(
						(workflow) => workflow.id.toString() === searchParams.where.id.toString(),
					);
					return Promise.resolve(foundWorkflow);
				}),
				update: jest.fn(),
				createQueryBuilder: jest.fn(() => {
					const fakeQueryBuilder = {
						update: () => fakeQueryBuilder,
						set: () => fakeQueryBuilder,
						where: () => fakeQueryBuilder,
						execute: () => Promise.resolve(),
					};
					return fakeQueryBuilder;
				}),
			},
			Webhook: {
				clear: jest.fn(),
				delete: jest.fn(),
			},
			Variables: {
				find: jest.fn(() => []),
			},
		},
	};
});

const workflowCheckIfCanBeActivated = jest.fn(() => true);

jest
	.spyOn(Workflow.prototype, 'checkIfWorkflowCanBeActivated')
	.mockImplementation(workflowCheckIfCanBeActivated);

const removeFunction = jest.spyOn(ActiveWorkflowRunner.prototype, 'remove');
const removeWebhooksFunction = jest.spyOn(ActiveWorkflowRunner.prototype, 'removeWorkflowWebhooks');
const workflowRunnerRun = jest.spyOn(WorkflowRunner.prototype, 'run');
const workflowExecuteAdditionalDataExecuteErrorWorkflowSpy = jest.spyOn(
	WorkflowExecuteAdditionalData,
	'executeErrorWorkflow',
);

describe('ActiveWorkflowRunner', () => {
	let externalHooks: ExternalHooks;
	let activeWorkflowRunner: ActiveWorkflowRunner;

	beforeAll(async () => {
		LoggerProxy.init(getLogger());
		const nodesAndCredentials: INodesAndCredentials = {
			loaded: {
				nodes: MOCK_NODE_TYPES_DATA,
				credentials: {},
			},
			known: { nodes: {}, credentials: {} },
			credentialTypes: {} as ICredentialTypes,
		};
		Container.set(LoadNodesAndCredentials, nodesAndCredentials);
		mockInstance(Push);
	});

	beforeEach(() => {
		externalHooks = mock();
		activeWorkflowRunner = new ActiveWorkflowRunner(
			new ActiveExecutions(),
			externalHooks,
			Container.get(NodeTypes),
		);
	});

	afterEach(async () => {
		await activeWorkflowRunner.removeAll();
		databaseActiveWorkflowsCount = 0;
		databaseActiveWorkflowsList = [];
		jest.clearAllMocks();
	});

	test('Should initialize activeWorkflowRunner with empty list of active workflows and call External Hooks', async () => {
		await activeWorkflowRunner.init();
		expect(await activeWorkflowRunner.getActiveWorkflows()).toHaveLength(0);
		expect(mocked(Db.collections.Workflow.find)).toHaveBeenCalled();
		expect(mocked(Db.collections.Webhook.clear)).toHaveBeenCalled();
		expect(externalHooks.run).toHaveBeenCalledTimes(1);
	});

	test('Should initialize activeWorkflowRunner with one active workflow', async () => {
		databaseActiveWorkflowsCount = 1;
		await activeWorkflowRunner.init();
		expect(await activeWorkflowRunner.getActiveWorkflows()).toHaveLength(
			databaseActiveWorkflowsCount,
		);
		expect(mocked(Db.collections.Workflow.find)).toHaveBeenCalled();
		expect(mocked(Db.collections.Webhook.clear)).toHaveBeenCalled();
		expect(externalHooks.run).toHaveBeenCalled();
	});

	test('Should make sure function checkIfWorkflowCanBeActivated was called for every workflow', async () => {
		databaseActiveWorkflowsCount = 2;
		await activeWorkflowRunner.init();
		expect(workflowCheckIfCanBeActivated).toHaveBeenCalledTimes(databaseActiveWorkflowsCount);
	});

	test('Call to removeAll should remove every workflow', async () => {
		databaseActiveWorkflowsCount = 2;
		await activeWorkflowRunner.init();
		expect(await activeWorkflowRunner.getActiveWorkflows()).toHaveLength(
			databaseActiveWorkflowsCount,
		);
		await activeWorkflowRunner.removeAll();
		expect(removeFunction).toHaveBeenCalledTimes(databaseActiveWorkflowsCount);
	});

	test('Call to remove should also call removeWorkflowWebhooks', async () => {
		databaseActiveWorkflowsCount = 1;
		await activeWorkflowRunner.init();
		expect(await activeWorkflowRunner.getActiveWorkflows()).toHaveLength(
			databaseActiveWorkflowsCount,
		);
		await activeWorkflowRunner.remove('1');
		expect(removeWebhooksFunction).toHaveBeenCalledTimes(1);
	});

	test('Call to isActive should return true for valid workflow', async () => {
		databaseActiveWorkflowsCount = 1;
		await activeWorkflowRunner.init();
		expect(await activeWorkflowRunner.isActive('1')).toBe(true);
	});

	test('Call to isActive should return false for invalid workflow', async () => {
		databaseActiveWorkflowsCount = 1;
		await activeWorkflowRunner.init();
		expect(await activeWorkflowRunner.isActive('2')).toBe(false);
	});

	test('Calling add should call checkIfWorkflowCanBeActivated', async () => {
		// Initialize with default (0) workflows
		await activeWorkflowRunner.init();
		generateWorkflows(1);
		await activeWorkflowRunner.add('1', 'activate');
		expect(workflowCheckIfCanBeActivated).toHaveBeenCalledTimes(1);
	});

	test('runWorkflow should call run method in WorkflowRunner', async () => {
		await activeWorkflowRunner.init();
		const workflow = generateWorkflows(1);
		const additionalData = await WorkflowExecuteAdditionalData.getBase('fake-user-id');

		workflowRunnerRun.mockImplementationOnce(() => Promise.resolve('invalid-execution-id'));

		await activeWorkflowRunner.runWorkflow(
			workflow[0],
			workflow[0].nodes[0],
			[[]],
			additionalData,
			'trigger',
		);

		expect(workflowRunnerRun).toHaveBeenCalledTimes(1);
	});

	test('executeErrorWorkflow should call function with same name in WorkflowExecuteAdditionalData', async () => {
		const workflowData = generateWorkflows(1)[0];
		const error = new NodeOperationError(workflowData.nodes[0], 'Fake error message');
		await activeWorkflowRunner.init();
		activeWorkflowRunner.executeErrorWorkflow(error, workflowData, 'trigger');
		expect(workflowExecuteAdditionalDataExecuteErrorWorkflowSpy).toHaveBeenCalledTimes(1);
	});
});
