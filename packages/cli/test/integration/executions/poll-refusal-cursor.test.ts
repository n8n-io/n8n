import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { User, WorkflowEntity } from '@n8n/db';
import {
	ExecutionRepository,
	PollerStateRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { E2eTestPollingTrigger } from 'n8n-nodes-base/nodes/E2eTest/E2eTestPollingTrigger.node';
import type { INode, IRun } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils/';

mockInstance(ExternalHooks, {
	hasHook: vi.fn((hookName: string) => hookName === 'workflow.preExecute'),
	run: vi.fn(async (hookName: string) => {
		if (hookName === 'workflow.preExecute') throw new Error('execution limit reached');
	}),
});

const STORED_CURSOR = { last: 1 };
const POLLED_CURSOR = { last: 2 };

const ADVANCED_AND_DROPPED = { cursor: POLLED_CURSOR, executions: 0 };
const HELD = { cursor: STORED_CURSOR, executions: 0 };

describe('refused poll cursor', () => {
	const pollNode: INode = {
		id: 'node-1',
		name: 'Poll',
		type: 'n8n-nodes-base.e2eTestPollingTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	let owner: User;
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();
		await utils.initNodeTypes({
			'n8n-nodes-base.e2eTestPollingTrigger': {
				type: new E2eTestPollingTrigger(),
				sourcePath: '',
			},
		});
		const schedulerConfig = Container.get(SchedulerConfig);
		schedulerConfig.enabled = true;
		schedulerConfig.enabledForPollTriggers = true;
		schedulerConfig.durableCursorsEnabled = true;
		Container.get(WorkflowsConfig).useWorkflowPublicationService = true;
		owner = await createOwner();
	});

	beforeEach(async () => {
		await testDb.truncate(['PollerState', 'ExecutionEntity']);
		workflow = await createWorkflowWithHistory({ active: true, nodes: [pollNode] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
			workflow.id,
			workflow.versionId,
		);
		await Container.get(PollCursorService).resolveCursor(workflow.id, pollNode.id, STORED_CURSOR);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test.each([
		{ declares: false, expected: ADVANCED_AND_DROPPED },
		{ declares: true, expected: HELD },
	])(
		'stores the expected cursor after a refused poll (declares=$declares)',
		async ({ declares, expected }) => {
			const { pollFunctions } = await Container.get(
				TriggerExecutionContextFactory,
			).createPollExecutionContext(workflow, pollNode);
			const done = createDeferredPromise<IRun | undefined>();

			await pollFunctions.__runPoll?.(async () => {
				if (declares) pollFunctions.declareBoundedPoll?.();
				Object.assign(pollFunctions.getWorkflowStaticData('node'), POLLED_CURSOR);
				pollFunctions.__emit([[{ json: { id: 2 } }]], undefined, done);
			});
			await done.promise;

			const stored = {
				cursor: await Container.get(PollerStateRepository).findCursor(workflow.id, pollNode.id),
				executions: await Container.get(ExecutionRepository).count({
					where: { workflowId: workflow.id },
				}),
			};
			expect(stored).toEqual(expected);
		},
	);
});
