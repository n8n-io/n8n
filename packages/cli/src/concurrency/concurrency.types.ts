export type ConcurrencyEventArgs = {
	executionId: string;
	workflowId: string;
	capacity: number;
	kind: 'manual' | 'production';
};
