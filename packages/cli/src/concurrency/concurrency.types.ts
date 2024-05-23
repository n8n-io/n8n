export type ConcurrencyEventArgs = {
	executionId: string;
	capacity: number;
	kind: 'manual' | 'production';
};
