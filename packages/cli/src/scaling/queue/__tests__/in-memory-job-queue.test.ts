import { InMemoryJobQueue } from '../in-memory-job-queue';
import { defineJobQueueContractTests } from './job-queue.contract';

defineJobQueueContractTests('InMemoryJobQueue', async () => {
	const queue = new InMemoryJobQueue();
	await queue.start();
	return queue;
});
