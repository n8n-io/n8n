import { mockLogger } from '@n8n/backend-test-utils';
import type {
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	WorkflowEntity,
	WorkflowPublicationOutbox,
} from '@n8n/db';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import type { ErrorReporter } from 'n8n-core';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { NodeTypes } from '@/node-types';
import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

import { WorkflowPublicationOutboxConsumer } from '../workflow-publication-outbox-consumer.service';

const makeTriggerNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'Schedule Trigger',
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } },
	...overrides,
});

const makePollNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'poll-1',
	name: 'Email Trigger (IMAP)',
	type: 'n8n-nodes-base.emailReadImap',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: {},
	...overrides,
});

const makeOutboxRecord = (overrides: Partial<WorkflowPublicationOutbox> = {}) => {
	const record = mock<WorkflowPublicationOutbox>();
	Object.assign(record, {
		id: 1,
		workflowId: 'wf-1',
		publishedVersionId: 'version-2',
		status: 'pending' as const,
		errorMessage: null,
		...overrides,
	});
	return record;
};

describe('WorkflowPublicationOutboxConsumer', () => {
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const publishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const errorReporter = mock<ErrorReporter>();
	const nodeTypes = mock<NodeTypes>();
	const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService: true });

	let consumer: WorkflowPublicationOutboxConsumer;

	beforeEach(() => {
		jest.clearAllMocks();
		consumer = new WorkflowPublicationOutboxConsumer(
			mockLogger(),
			errorReporter,
			outboxRepository,
			publishedVersionRepository,
			workflowRepository,
			activeWorkflowManager,
			workflowPublishedDataService,
			workflowsConfig,
			nodeTypes,
		);
	});

	describe('processNextMessage', () => {
		test('should return false when feature flag is off', async () => {
			Object.defineProperty(workflowsConfig, 'useWorkflowPublicationService', { value: false });
			const result = await consumer.processNextMessage();
			expect(result).toBe(false);
			Object.defineProperty(workflowsConfig, 'useWorkflowPublicationService', { value: true });
		});

		test('should return false when no pending records', async () => {
			outboxRepository.claimNextPendingRecord.mockResolvedValue(null);
			const result = await consumer.processNextMessage();
			expect(result).toBe(false);
		});

		test('should process a pending record and return true', async () => {
			const record = makeOutboxRecord();
			outboxRepository.claimNextPendingRecord.mockResolvedValue(record);

			const dbWorkflow = mock<WorkflowEntity>();
			Object.assign(dbWorkflow, { id: 'wf-1', name: 'Test', settings: {} });
			workflowRepository.findById.mockResolvedValue(dbWorkflow);

			const oldNodes = [makeTriggerNode({ id: 'node-1' })];
			const newNodes = [makeTriggerNode({ id: 'node-1' })];

			workflowPublishedDataService.getPublishedWorkflowData
				.mockResolvedValueOnce({
					id: 'wf-1',
					name: 'Test',
					nodes: oldNodes,
					connections: {},
					staticData: undefined,
					settings: undefined,
					shared: [],
				})
				.mockResolvedValueOnce({
					id: 'wf-1',
					name: 'Test',
					nodes: newNodes,
					connections: {},
					staticData: undefined,
					settings: undefined,
					shared: [],
				});

			// Mock nodeTypes to identify trigger nodes
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					properties: [],
					name: 'test',
					displayName: 'Test',
					group: ['trigger'],
					version: 1,
					defaults: {},
					inputs: [],
					outputs: [],
				},
				trigger: jest.fn(),
			} as never);

			const result = await consumer.processNextMessage();

			expect(result).toBe(true);
			expect(publishedVersionRepository.upsert).toHaveBeenCalledWith(
				{ workflowId: 'wf-1', publishedVersionId: 'version-2' },
				['workflowId'],
			);
			expect(outboxRepository.update).toHaveBeenCalledWith(1, { status: 'completed' });
		});

		test('should mark record failed when workflow not found', async () => {
			const record = makeOutboxRecord();
			outboxRepository.claimNextPendingRecord.mockResolvedValue(record);
			workflowRepository.findById.mockResolvedValue(null);

			await consumer.processNextMessage();

			expect(outboxRepository.update).toHaveBeenCalledWith(1, {
				status: 'failed',
				errorMessage: 'Workflow not found',
			});
		});
	});

	describe('computeTriggerDiff', () => {
		const makeNodeType = (opts: { trigger?: boolean; poll?: boolean }) => ({
			description: {
				properties: [],
				name: 'test',
				displayName: 'Test',
				group: ['trigger'],
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
			},
			...(opts.trigger ? { trigger: jest.fn() } : {}),
			...(opts.poll ? { poll: jest.fn() } : {}),
		});

		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockImplementation((type: string) => {
				if (type === 'n8n-nodes-base.scheduleTrigger') {
					return makeNodeType({ trigger: true }) as never;
				}
				if (type === 'n8n-nodes-base.emailReadImap') {
					return makeNodeType({ poll: true }) as never;
				}
				return makeNodeType({}) as never;
			});
		});

		test('should detect added trigger nodes', () => {
			const oldNodes: INode[] = [];
			const newNodes = [makeTriggerNode({ id: 'node-1' })];

			const diff = consumer.computeTriggerDiff(oldNodes, newNodes);

			expect(diff.toAdd).toHaveLength(1);
			expect(diff.toAdd[0].id).toBe('node-1');
			expect(diff.toRemove).toHaveLength(0);
		});

		test('should detect removed trigger nodes', () => {
			const oldNodes = [makeTriggerNode({ id: 'node-1' })];
			const newNodes: INode[] = [];

			const diff = consumer.computeTriggerDiff(oldNodes, newNodes);

			expect(diff.toRemove).toHaveLength(1);
			expect(diff.toRemove[0].id).toBe('node-1');
			expect(diff.toAdd).toHaveLength(0);
		});

		test('should detect modified trigger nodes (typeVersion change)', () => {
			const oldNodes = [makeTriggerNode({ id: 'node-1', typeVersion: 1 })];
			const newNodes = [makeTriggerNode({ id: 'node-1', typeVersion: 2 })];

			const diff = consumer.computeTriggerDiff(oldNodes, newNodes);

			expect(diff.toRemove).toHaveLength(1);
			expect(diff.toAdd).toHaveLength(1);
			expect(diff.toRemove[0].id).toBe('node-1');
			expect(diff.toAdd[0].id).toBe('node-1');
		});

		test('should return empty diff when nothing changed', () => {
			const node = makeTriggerNode({ id: 'node-1' });
			const diff = consumer.computeTriggerDiff([node], [node]);

			expect(diff.toAdd).toHaveLength(0);
			expect(diff.toRemove).toHaveLength(0);
		});

		test('should ignore non-trigger nodes', () => {
			const regularNode: INode = {
				id: 'regular-1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const diff = consumer.computeTriggerDiff([regularNode], []);

			expect(diff.toAdd).toHaveLength(0);
			expect(diff.toRemove).toHaveLength(0);
		});

		test('should handle mixed trigger and poll node changes', () => {
			const oldNodes = [makeTriggerNode({ id: 'trigger-1' }), makePollNode({ id: 'poll-1' })];
			const newNodes = [
				makeTriggerNode({ id: 'trigger-1' }),
				// poll-1 removed, poll-2 added
				makePollNode({ id: 'poll-2', name: 'New Poll' }),
			];

			const diff = consumer.computeTriggerDiff(oldNodes, newNodes);

			expect(diff.toRemove).toHaveLength(1);
			expect(diff.toRemove[0].id).toBe('poll-1');
			expect(diff.toAdd).toHaveLength(1);
			expect(diff.toAdd[0].id).toBe('poll-2');
		});
	});
});
