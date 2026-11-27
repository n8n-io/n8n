import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { Job } from '../scaling.types';
import { SubExecutionTracker } from '../sub-execution-tracker';

const flushWrites = async () => await new Promise((resolve) => setImmediate(resolve));

describe('SubExecutionTracker', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	let tracker: SubExecutionTracker;
	let job: Job;
	let update: ReturnType<typeof vi.fn>;

	const lastWrittenIds = () => (update.mock.lastCall?.[0] as Job['data']).subExecutionIds;

	beforeEach(() => {
		vi.clearAllMocks();
		tracker = new SubExecutionTracker(logger);
		update = vi.fn().mockResolvedValue(undefined);
		job = { id: 'job-1', data: { executionId: 'root' }, update } as unknown as Job;
		tracker.startJob(job);
	});

	it('records a sub-execution on its parent job', async () => {
		tracker.addSubExecution('child', 'root');
		await flushWrites();

		expect(update).toHaveBeenCalledWith({ executionId: 'root', subExecutionIds: ['child'] });
	});

	it('records a nested sub-execution on the root job', async () => {
		tracker.addSubExecution('child', 'root');
		tracker.addSubExecution('grandchild', 'child');
		await flushWrites();

		expect(lastWrittenIds()).toEqual(['child', 'grandchild']);
	});

	it('removes a sub-execution when it ends', async () => {
		tracker.addSubExecution('child', 'root');
		await flushWrites();
		tracker.removeSubExecution('child');
		await flushWrites();

		expect(lastWrittenIds()).toEqual([]);
	});

	it('ignores a sub-execution whose parent runs in no job in this process', async () => {
		tracker.addSubExecution('child', 'elsewhere');
		tracker.addSubExecution('orphan', undefined);
		await flushWrites();

		expect(update).not.toHaveBeenCalled();
	});

	it('writes the latest ids once for a burst of sub-executions', async () => {
		for (const id of ['a', 'b', 'c', 'd']) tracker.addSubExecution(id, 'root');
		await flushWrites();

		expect(update).toHaveBeenCalledTimes(1);
		expect(lastWrittenIds()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('writes changes made during a write in a later write', async () => {
		let finishFirstWrite!: () => void;
		update.mockImplementationOnce(
			async () => await new Promise<void>((resolve) => (finishFirstWrite = resolve)),
		);

		tracker.addSubExecution('a', 'root');
		await flushWrites();
		tracker.addSubExecution('b', 'root');
		finishFirstWrite();
		await flushWrites();

		expect(update).toHaveBeenCalledTimes(2);
		expect(lastWrittenIds()).toEqual(['a', 'b']);
	});

	it('does not write after the job ends', async () => {
		tracker.addSubExecution('child', 'root');
		tracker.endJob(job);
		tracker.removeSubExecution('child');
		await flushWrites();

		expect(update).not.toHaveBeenCalled();
	});

	it('logs a failed write and keeps recording', async () => {
		update.mockRejectedValueOnce(new Error('Redis unavailable'));

		tracker.addSubExecution('a', 'root');
		await flushWrites();
		tracker.addSubExecution('b', 'root');
		await flushWrites();

		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to record the sub-executions of a job',
			expect.objectContaining({ jobId: 'job-1', error: 'Redis unavailable' }),
		);
		expect(lastWrittenIds()).toEqual(['a', 'b']);
	});
});
