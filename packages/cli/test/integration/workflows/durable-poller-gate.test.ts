import { Logger } from '@n8n/backend-common';
import {
	createWorkflowWithHistory,
	mockInstance,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import {
	PollerStateRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { DurablePollerGateService } from '@/workflows/triggers/durable-poller-gate.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';

import { createOwner } from '../shared/db/users';
import * as utils from '../shared/utils';
import { loadNodesFromDist } from '../shared/utils/node-types-data';

const telemetry = mockInstance(Telemetry);

/**
 * The gate against a real database: published versions are read from the
 * `workflow_published_version` mapping, the verdict flips on real duplicate
 * trigger node ids, and the offenders' `poller_state` rows are really deleted
 * while clean workflows keep theirs. The unit suite mocks the repositories;
 * this proves the seams line up at runtime.
 */
describe('DurablePollerGateService (integration)', () => {
	let owner: Awaited<ReturnType<typeof createOwner>>;
	let pollerStateRepository: PollerStateRepository;
	let publishedVersionRepository: WorkflowPublishedVersionRepository;

	beforeAll(async () => {
		await testDb.init();
		await utils.initNodeTypes(loadNodesFromDist(['n8n-nodes-base.scheduleTrigger']));
		owner = await createOwner();
		pollerStateRepository = Container.get(PollerStateRepository);
		publishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
	});

	afterEach(async () => {
		// Delete WorkflowPublishedVersion first: it references WorkflowHistory with
		// onDelete RESTRICT, and deleting WorkflowEntity cascades into WorkflowHistory.
		await testDb.truncate([
			'WorkflowPublishedVersion',
			'WorkflowPublishHistory',
			'PollerState',
			'WorkflowEntity',
			'WorkflowHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	// The gate holds its verdict as instance state, so every test gets a fresh
	// instance instead of the container singleton.
	const buildGate = () =>
		new DurablePollerGateService(
			Container.get(Logger),
			Container.get(WorkflowRepository),
			Container.get(WorkflowPublishedDataService),
			Container.get(WorkflowValidationService),
			Container.get(NodeTypes),
			pollerStateRepository,
			Container.get(Telemetry),
		);

	const scheduleTrigger = (name: string, id = uuid()): INode => ({
		id,
		name,
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});

	// All three parts the gate reads: workflow (active), history version, and
	// the published-version mapping pointing at it.
	const createPublishedWorkflow = async (nodes: INode[]) => {
		const workflow = await createWorkflowWithHistory(
			{ active: true, nodes, connections: {} },
			owner,
		);
		await setActiveVersion(workflow.id, workflow.versionId);
		await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
		return workflow;
	};

	const seedCursor = async (workflowId: string, nodeId: string) =>
		await pollerStateRepository.insert({ workflowId, nodeId, cursor: { lastItemId: 'seeded' } });

	test('keeps durable pollers allowed and cursors intact on a clean instance', async () => {
		const trigger = scheduleTrigger('Trigger A');
		const workflow = await createPublishedWorkflow([trigger, scheduleTrigger('Trigger B')]);
		await seedCursor(workflow.id, trigger.id);

		const gate = buildGate();
		await gate.init();

		expect(gate.allowed).toBe(true);
		await expect(pollerStateRepository.findCursor(workflow.id, trigger.id)).resolves.toEqual({
			lastItemId: 'seeded',
		});
	});

	// Only n8n-nodes-base.scheduleTrigger is loaded in this suite, so the noOp
	// node below makes the real NodeTypes throw UnrecognizedNodeTypeError — the
	// uninstalled-community-node case. Startup must survive it.
	test('refuses durable pollers without crashing when a workflow has an uninstalled node type', async () => {
		await createPublishedWorkflow([
			scheduleTrigger('Trigger A'),
			{
				id: uuid(),
				name: 'NoOp',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		]);

		const gate = buildGate();
		await expect(gate.init()).resolves.not.toThrow();

		expect(gate.allowed).toBe(false);
	});

	test('refuses durable pollers and deletes only the offender cursor rows', async () => {
		const cleanTrigger = scheduleTrigger('Clean Trigger');
		const cleanWorkflow = await createPublishedWorkflow([cleanTrigger]);
		await seedCursor(cleanWorkflow.id, cleanTrigger.id);

		const duplicateId = uuid();
		const offender = await createPublishedWorkflow([
			scheduleTrigger('Poll A', duplicateId),
			scheduleTrigger('Poll B', duplicateId),
		]);
		// The one row both duplicate-id nodes would contend on.
		await seedCursor(offender.id, duplicateId);

		const gate = buildGate();
		await gate.init();

		expect(gate.allowed).toBe(false);
		await expect(pollerStateRepository.findCursor(offender.id, duplicateId)).resolves.toBeNull();
		await expect(
			pollerStateRepository.findCursor(cleanWorkflow.id, cleanTrigger.id),
		).resolves.toEqual({ lastItemId: 'seeded' });
		// The deleted-row count reported to telemetry is the real DELETE's count.
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.INSTANCE.INSTANCE_REFUSED_DURABLE_POLLERS,
			{ workflow_ids: [offender.id], deleted_cursor_rows: 1 },
		);
	});
});
