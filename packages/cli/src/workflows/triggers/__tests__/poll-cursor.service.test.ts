import type { Logger } from '@n8n/backend-common';
import type { PollerConfig } from '@n8n/config';
import type {
	CreateExecutionPayload,
	OperationContext,
	PollerStateRepository,
	TransactionRunner,
} from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowBase, PollCursor } from 'n8n-workflow';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

describe('PollCursorService', () => {
	const pollerStateRepository = mock<PollerStateRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const workflowStaticDataService = mock<WorkflowStaticDataService>();
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();

	let txRunner: MockProxy<TransactionRunner>;

	const buildService = (durableCursorsEnabled = true) => {
		txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(
			async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) => await fn(ctx),
		);

		return new PollCursorService(
			pollerStateRepository,
			txRunner,
			executionPersistence,
			workflowStaticDataService,
			mock<PollerConfig>({ durableCursorsEnabled }),
			logger,
			errorReporter,
		);
	};

	const payload = (): CreateExecutionPayload =>
		({
			mode: 'trigger',
			finished: false,
			status: 'new',
			workflowId: 'wf-1',
			workflowData: mock<IWorkflowBase>({ id: 'wf-1' }),
		}) as CreateExecutionPayload;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('enabled', () => {
		it('reports the configured flag', () => {
			expect(buildService(true).enabled).toBe(true);
			expect(buildService(false).enabled).toBe(false);
		});
	});

	describe('readCursor', () => {
		it('seeds ensureCursor from the static-data blob and returns the stored cursor rather than the seed', async () => {
			const service = buildService();
			let seenSeed: unknown;
			pollerStateRepository.ensureCursor.mockImplementationOnce(async (_wf, _node, seed) => {
				seenSeed = { ...seed };
				return { lastItemId: 'from-db' };
			});

			const cursor = await service.readCursor('wf-1', 'node-1', 'Poll Node', {
				lastItemId: 'from-static-data',
			});

			expect(seenSeed).toEqual({ lastItemId: 'from-static-data' });
			expect(cursor).toEqual({ lastItemId: 'from-db' });
			expect(txRunner.run).toHaveBeenCalledTimes(1);
			expect(pollerStateRepository.ensureCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				expect.anything(),
				txRunner.run.mock.calls[0][0],
			);
		});

		it('returns null when the resulting cursor is empty', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({});

			await expect(service.readCursor('wf-1', 'node-1', 'Poll Node', {})).resolves.toBeNull();
		});

		it('writes the stored cursor into the static data it was given, keeping the keys it does not carry', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'from-db' });
			const nodeStaticData = { lastItemId: 'stale', seenIds: ['x'] };

			await service.readCursor('wf-1', 'node-1', 'Poll Node', nodeStaticData);

			expect(nodeStaticData).toEqual({ lastItemId: 'from-db', seenIds: ['x'] });
		});

		it('leaves the static data untouched when it already matches the stored cursor', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			const nodeStaticData = { lastItemId: 'a' };
			const observed: string[] = [];
			const observable = new Proxy(nodeStaticData, {
				set(target, key: string, value: string) {
					observed.push(key);
					return Reflect.set(target, key, value);
				},
				deleteProperty(target, key: string) {
					observed.push(key);
					return Reflect.deleteProperty(target, key);
				},
			});

			await service.readCursor('wf-1', 'node-1', 'Poll Node', observable);

			expect(observed).toEqual([]);
			expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
		});

		it('persists the repair to the workflow when the read finds static data out of step with the stored cursor', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'from-db' });
			workflowStaticDataService.getStaticDataById.mockResolvedValue({});
			const nodeStaticData = { lastItemId: 'stale' };

			await service.readCursor('wf-1', 'node-1', 'Poll Node', nodeStaticData);

			expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith('wf-1', {
				'node:Poll Node': { lastItemId: 'from-db' },
			});
		});

		it('propagates a failing read so the poll does not run against an unknown cursor', async () => {
			const service = buildService();
			const readError = new Error('poller state read failed');
			pollerStateRepository.ensureCursor.mockRejectedValue(readError);

			await expect(service.readCursor('wf-1', 'node-1', 'Poll Node', {})).rejects.toBe(readError);
		});
	});

	describe('commitWithExecution', () => {
		it('advances the cursor and creates the execution in one transaction', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			executionPersistence.create.mockResolvedValue('exec-1');
			const createPayload = payload();

			const { executionId } = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: createPayload,
			});

			expect(executionId).toBe('exec-1');
			expect(txRunner.run).toHaveBeenCalledTimes(1);

			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.ensureCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(executionPersistence.create).toHaveBeenCalledWith(createPayload, ctx);
		});

		it('returns the cursor the row held before the advance', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a', etag: 'v1' });
			executionPersistence.create.mockResolvedValue('exec-1');

			const { previousCursor } = await service.commitWithExecution({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				cursor: { lastItemId: 'b' },
				payload: payload(),
			});

			expect(previousCursor).toEqual({ lastItemId: 'a', etag: 'v1' });
		});

		// The transaction runner is a pass-through here, so this only pins that the insert
		// is never reached once the advance fails. The rollback itself is proven in
		// test/integration/executions/poll-cursor-atomicity.test.ts.
		it('does not create the execution when the cursor advance fails', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			const advanceError = new Error('Poller cursor row disappeared while its poll was running');
			pollerStateRepository.advanceCursor.mockRejectedValue(advanceError);

			await expect(
				service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
				}),
			).rejects.toBe(advanceError);

			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		// The transaction runner is a pass-through here, so these only pin that the failure
		// reaches the caller and nothing swallows it. The rollback itself is proven in
		// test/integration/executions/poll-cursor-atomicity.test.ts.
		it.each([
			{ title: 'a failing execution insert', error: new Error('insert failed') },
			{ title: 'a duplicate execution', error: new DuplicateExecutionError('dedup-key') },
		])('propagates $title to the caller', async ({ error }) => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			executionPersistence.create.mockRejectedValue(error);

			await expect(
				service.commitWithExecution({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					cursor: { lastItemId: 'b' },
					payload: payload(),
				}),
			).rejects.toBe(error);
		});
	});

	describe('commitCursorOnly', () => {
		const commitCursorOnly = async (service: PollCursorService, nodeStaticData: PollCursor = {}) =>
			await service.commitCursorOnly({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				nodeName: 'Poll Node',
				cursor: { lastItemId: 'b' },
				nodeStaticData,
			});

		it('advances the cursor in one transaction without creating an execution', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });

			await commitCursorOnly(service);

			expect(txRunner.run).toHaveBeenCalledTimes(1);
			const ctx = txRunner.run.mock.calls[0][0];
			expect(pollerStateRepository.advanceCursor).toHaveBeenCalledWith(
				'wf-1',
				'node-1',
				{ lastItemId: 'b' },
				ctx,
			);
			expect(executionPersistence.create).not.toHaveBeenCalled();
		});

		it('mirrors the advance to the static data of the polled node', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a', etag: 'v1' });
			workflowStaticDataService.getStaticDataById.mockResolvedValue({
				'node:Poll Node': { lastItemId: 'a', etag: 'v1' },
			});
			const nodeStaticData = { lastItemId: 'a', etag: 'v1' };

			await commitCursorOnly(service, nodeStaticData);

			expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith('wf-1', {
				'node:Poll Node': { lastItemId: 'b' },
			});
			expect(nodeStaticData).toEqual({ lastItemId: 'b' });
		});

		it('propagates a failing advance', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			const advanceError = new Error('Poller cursor row disappeared while its poll was running');
			pollerStateRepository.advanceCursor.mockRejectedValue(advanceError);

			await expect(commitCursorOnly(service)).rejects.toBe(advanceError);

			expect(workflowStaticDataService.saveStaticDataById).not.toHaveBeenCalled();
		});

		it('resolves when mirroring the advance fails', async () => {
			const service = buildService();
			pollerStateRepository.ensureCursor.mockResolvedValue({ lastItemId: 'a' });
			workflowStaticDataService.getStaticDataById.mockRejectedValue(new Error('read failed'));

			await expect(commitCursorOnly(service)).resolves.toBeUndefined();
		});
	});

	describe('mirrorToStaticData', () => {
		it("writes the cursor into the node's static-data entry, dropping only the keys the previous cursor carried", async () => {
			const service = buildService();
			workflowStaticDataService.getStaticDataById.mockResolvedValue({
				'node:Other Poll Node': { lastItemId: 'x' },
				'node:Poll Node': {
					lastItemId: 'a',
					lastTimeChecked: '2026-07-28T10:00:00.000Z',
					seenIds: ['x'],
				},
			});

			await service.mirrorToStaticData(
				'wf-1',
				'Poll Node',
				{ lastItemId: 'b' },
				{},
				{ lastItemId: 'a', lastTimeChecked: '2026-07-28T10:00:00.000Z' },
			);

			expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith('wf-1', {
				'node:Other Poll Node': { lastItemId: 'x' },
				'node:Poll Node': { lastItemId: 'b', seenIds: ['x'] },
			});
		});

		it.each([['not an object'], [['an', 'array']]])(
			"replaces a node static-data entry holding %s with the cursor's own keys",
			async (stored) => {
				const service = buildService();
				workflowStaticDataService.getStaticDataById.mockResolvedValue({
					'node:Poll Node': stored,
				});

				await service.mirrorToStaticData('wf-1', 'Poll Node', { lastItemId: 'b' }, {}, {});

				expect(workflowStaticDataService.saveStaticDataById).toHaveBeenCalledWith('wf-1', {
					'node:Poll Node': { lastItemId: 'b' },
				});
			},
		);

		it.each([
			{ failing: 'write', error: new Error('static data write failed') },
			{ failing: 'read', error: new Error('static data read failed') },
		])(
			'resolves and reports rather than throwing when the static-data $failing fails',
			async ({ failing, error }) => {
				const service = buildService();
				if (failing === 'read') {
					workflowStaticDataService.getStaticDataById.mockRejectedValue(error);
				} else {
					workflowStaticDataService.getStaticDataById.mockResolvedValue({});
					workflowStaticDataService.saveStaticDataById.mockRejectedValue(error);
				}

				await expect(
					service.mirrorToStaticData('wf-1', 'Poll Node', { lastItemId: 'b' }, {}, {}),
				).resolves.toBeUndefined();

				expect(errorReporter.error).toHaveBeenCalledWith(error, {
					extra: { workflowId: 'wf-1', nodeName: 'Poll Node' },
				});
				expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Poll Node'), {
					workflowId: 'wf-1',
					nodeName: 'Poll Node',
				});
			},
		);

		it('updates the live node static data even when the static-data write fails', async () => {
			const service = buildService();
			workflowStaticDataService.getStaticDataById.mockResolvedValue({});
			workflowStaticDataService.saveStaticDataById.mockRejectedValue(new Error('write failed'));
			const nodeStaticData = { lastItemId: 'stale' };

			await service.mirrorToStaticData(
				'wf-1',
				'Poll Node',
				{ lastItemId: 'b' },
				nodeStaticData,
				{},
			);

			expect(nodeStaticData).toEqual({ lastItemId: 'b' });
		});

		it('drops live static-data keys the previous cursor carried and keeps the ones no cursor put there', async () => {
			const service = buildService();
			workflowStaticDataService.getStaticDataById.mockResolvedValue({});
			const nodeStaticData = {
				lastItemId: 'a',
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
				seenIds: ['x'],
			};

			await service.mirrorToStaticData('wf-1', 'Poll Node', { lastItemId: 'b' }, nodeStaticData, {
				lastItemId: 'a',
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
			});

			expect(nodeStaticData).toEqual({ lastItemId: 'b', seenIds: ['x'] });
		});
	});
});
