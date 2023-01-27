import { v4 as uuid } from 'uuid';
import { mocked } from 'jest-mock';

import { ICredentialTypes, LoggerProxy, Workflow } from 'n8n-workflow';

import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as Db from '@/Db';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { Role } from '@/databases/entities/Role';
import { User } from '@/databases/entities/User';
import { getLogger } from '@/Logger';
import { NodeTypes } from '@/NodeTypes';
import { CredentialTypes } from '@/CredentialTypes';
import { randomEmail, randomName } from '../integration/shared/random';
import * as Helpers from './Helpers';

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
				find: jest.fn(async () => {
					return Promise.resolve(generateWorkflows(databaseActiveWorkflowsCount));
				}),
				findOne: jest.fn(async (searchParams) => {
					const foundWorkflow = databaseActiveWorkflowsList.find(
						(workflow) => workflow.id.toString() === searchParams.where.id.toString(),
					);
					return Promise.resolve(foundWorkflow);
				}),
				update: jest.fn(),
			},
			Webhook: {
				clear: jest.fn(),
				delete: jest.fn(),
			},
		},
	};
});

const externalHooksRunFunction = jest.fn();

jest.mock('@/ExternalHooks', () => {
	return {
		ExternalHooks: () => {
			return {
				run: externalHooksRunFunction,
			};
		},
	};
});

describe('ActiveWorkflowRunner', () => {
	let activeWorkflowRunner: ActiveWorkflowRunner;

	beforeAll(async () => {
		LoggerProxy.init(getLogger());
		NodeTypes({
			loaded: {
				nodes: MOCK_NODE_TYPES_DATA,
				credentials: {},
			},
			known: { nodes: {}, credentials: {} },
			credentialTypes: {} as ICredentialTypes,
		});
		CredentialTypes({
			loaded: {
				nodes: MOCK_NODE_TYPES_DATA,
				credentials: {},
			},
			known: { nodes: {}, credentials: {} },
			credentialTypes: {} as ICredentialTypes,
		});
	});

	beforeEach(() => {
		activeWorkflowRunner = new ActiveWorkflowRunner();
	});

	afterEach(async () => {
		await activeWorkflowRunner.removeAll();
		databaseActiveWorkflowsCount = 0;
		jest.clearAllMocks();
	});

	test('Should initialize activeWorkflowRunner with empty list of active workflows and call External Hooks', async () => {
		void (await activeWorkflowRunner.init());
		expect(await activeWorkflowRunner.getActiveWorkflows()).toHaveLength(0);
		expect(mocked(Db.collections.Workflow.find)).toHaveBeenCalled();
		expect(mocked(Db.collections.Webhook.clear)).toHaveBeenCalled();
		expect(externalHooksRunFunction).toHaveBeenCalledTimes(1);
	});

	test('Should initialize activeWorkflowRunner with one active workflow', async () => {
		databaseActiveWorkflowsCount = 1;
		void (await activeWorkflowRunner.init());
		expect(await activeWorkflowRunner.getActiveWorkflows()).toHaveLength(1);
		expect(mocked(Db.collections.Workflow.find)).toHaveBeenCalled();
		expect(mocked(Db.collections.Webhook.clear)).toHaveBeenCalled();
		expect(externalHooksRunFunction).toHaveBeenCalled();
	});
});
