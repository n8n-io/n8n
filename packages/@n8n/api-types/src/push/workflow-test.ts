export type WorkflowTestRunEvent =
	| { type: 'runStarted' }
	| { type: 'testStarted'; name: string }
	| {
			type: 'testFinished';
			name: string;
			status: 'passed' | 'failed' | 'skipped';
			durationMs: number;
			error?: { message: string; code?: string; node?: string };
	  }
	| { type: 'runFinished'; status: 'passed' | 'failed' | 'error'; errors: string[] };

export type WorkflowTestRunEventPushMessage = {
	type: 'workflowTestRunEvent';
	data: {
		runId: string;
		workflowId: string;
		event: WorkflowTestRunEvent;
	};
};

export type WorkflowTestPushMessage = WorkflowTestRunEventPushMessage;
