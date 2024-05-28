export type Ids = {
	executionId: string;
	workflowId: string;
	pushRef: string;
};

export type ConcurrencyQueueItem = Ids & {
	resolve: () => void;
};
