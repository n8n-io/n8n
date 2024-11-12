export interface TestExecution {
	lastRun: string | null;
	errorRate: number | null;
	metrics: Record<string, number>;
}

export interface TestListItem {
	id: number;
	name: string;
	tagName: string;
	testCases: number;
	execution: TestExecution;
}
