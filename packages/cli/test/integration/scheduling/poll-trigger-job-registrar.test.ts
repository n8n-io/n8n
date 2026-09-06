import { createWorkflowWithHistory, setActiveVersion, testDb } from '@n8n/backend-test-utils';
import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import {
	PollerStateRepository,
	ScheduledJobRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { PollTriggerJobRegistrar } from '@/scheduling/poll-trigger-node/poll-trigger-job-registrar';

import { createOwner } from '../shared/db/users';

import { workflowOwned } from './shared/job-factory';

describe('PollTriggerJobRegistrar', () => {
	const node: INode = {
		id: 'node-1',
		name: 'Poll',
		type: 'n8n-nodes-base.someTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	let registrar: PollTriggerJobRegistrar;
	let pollerStateRepository: PollerStateRepository;
	let scheduledJobRepository: ScheduledJobRepository;
	let workflowPublishedVersionRepository: WorkflowPublishedVersionRepository;
	let schedulerConfig: SchedulerConfig;
	let workflowsConfig: WorkflowsConfig;
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();
		registrar = Container.get(PollTriggerJobRegistrar);
		pollerStateRepository = Container.get(PollerStateRepository);
		scheduledJobRepository = Container.get(ScheduledJobRepository);
		workflowPublishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
		schedulerConfig = Container.get(SchedulerConfig);
		workflowsConfig = Container.get(WorkflowsConfig);
		owner = await createOwner();
	});

	beforeEach(async () => {
		// Order matters: truncate() issues plain deletes in array order with FK checks
		// on, so FK-holders must go before the parents they point to
		// (workflow_entity.activeVersionId -> workflow_history is RESTRICT, not CASCADE).
		await testDb.truncate([
			'PollerState',
			'ScheduledTask',
			'ScheduledJob',
			'WorkflowPublishedVersion',
			'WorkflowEntity',
			'WorkflowHistory',
		]);

		// scheduled_job.workflowId FKs to workflow_published_version, which itself
		// FKs to workflow_history, so a job insert needs all three rows in place.
		workflow = await createWorkflowWithHistory({ nodes: [node] }, owner);
		await setActiveVersion(workflow.id, workflow.versionId);
		await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

		// Backoff reset is gated on durable cursors and the durable poller chain;
		// enable them for these tests, matching a real instance with cursors on.
		schedulerConfig.durableCursorsEnabled = true;
		schedulerConfig.enabled = true;
		schedulerConfig.enabledForPollTriggers = true;
		workflowsConfig.useWorkflowPublicationService = true;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('clears a failing poller_state row when register() newly provisions a job', async () => {
		// Seed a poller_state row already sitting in backoff, as it would be after a
		// run of poll failures before the node was deactivated.
		await pollerStateRepository.insert({ workflowId: workflow.id, nodeId: node.id, cursor: {} });
		await pollerStateRepository.recordFailure(workflow.id, node.id, 60 * 60 * 1000);

		const failingBefore = await pollerStateRepository.findState(workflow.id, node.id);
		expect(failingBefore?.consecutiveErrors).toBe(1);
		expect(failingBefore?.backoffUntil).toBeInstanceOf(Date);

		// A previously-unprovisioned poll time, so `register()` genuinely inserts a new
		// scheduled_job row rather than reconciling one that already existed.
		const { inserted } = await registrar.register(
			workflow.id,
			node,
			[{ mode: 'everyMinute' }],
			'UTC',
		);

		expect(inserted).toBe(true);
		const jobs = await scheduledJobRepository.find({
			where: { ...workflowOwned(workflow.id, node.id) },
		});
		expect(jobs).toHaveLength(1);

		const failureStateAfter = await pollerStateRepository.findState(workflow.id, node.id);
		expect(failureStateAfter).toEqual({ consecutiveErrors: 0, backoffUntil: null, cursor: {} });
	});

	it('leaves a failing poller_state row untouched when durable cursors are disabled, even though a job is inserted', async () => {
		// Mirrors an instance that never set N8N_POLLER_DURABLE_CURSORS_ENABLED: the
		// flag PollBackoffService itself is gated on, not something register() controls.
		schedulerConfig.durableCursorsEnabled = false;

		await pollerStateRepository.insert({ workflowId: workflow.id, nodeId: node.id, cursor: {} });
		await pollerStateRepository.recordFailure(workflow.id, node.id, 60 * 60 * 1000);
		const failingBefore = await pollerStateRepository.findState(workflow.id, node.id);

		const { inserted } = await registrar.register(
			workflow.id,
			node,
			[{ mode: 'everyMinute' }],
			'UTC',
		);

		expect(inserted).toBe(true);
		const failureStateAfter = await pollerStateRepository.findState(workflow.id, node.id);
		expect(failureStateAfter).toEqual(failingBefore);
	});
});
