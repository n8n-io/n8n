export type ConcurrencyQueueItem = {
	executionId: string;
	resolve: () => void;
};
