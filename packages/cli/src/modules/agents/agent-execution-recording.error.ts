import { OperationalError } from 'n8n-workflow';

type RecordingFailure = {
	cause: unknown;
	executionError?: unknown;
} & (
	| { phase: 'create'; executionId?: never; executionStarted?: never }
	| { phase: 'finalize'; executionId: string; executionStarted: boolean }
);

export class AgentExecutionRecordingError extends OperationalError {
	readonly phase: 'create' | 'finalize';
	readonly executionId?: string;
	readonly executionStarted: boolean;
	readonly executionError?: unknown;

	constructor(failure: RecordingFailure) {
		super(
			failure.phase === 'create'
				? 'Failed to create the agent execution record.'
				: 'Failed to finalize the agent execution record.',
			{ cause: failure.cause },
		);
		this.phase = failure.phase;
		this.executionId = failure.executionId;
		this.executionStarted = failure.executionStarted ?? false;
		this.executionError = failure.executionError;
	}
}
