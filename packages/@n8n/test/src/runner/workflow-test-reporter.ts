import type { WorkflowTestRunEvent } from '@n8n/api-types';
import { stripVTControlCharacters } from 'node:util';
import type {
	Reporter,
	SerializedError,
	TestCase,
	TestModule,
	TestRunEndReason,
} from 'vitest/node';

type TestFinishedEvent = Extract<WorkflowTestRunEvent, { type: 'testFinished' }>;
type RunStatus = Extract<WorkflowTestRunEvent, { type: 'runFinished' }>['status'];

export class WorkflowTestReporter implements Reporter {
	constructor(private readonly send: (event: WorkflowTestRunEvent) => Promise<void>) {}

	async onTestCaseReady(testCase: TestCase) {
		await this.send({ type: 'testStarted', name: testCase.fullName });
	}

	async onTestCaseResult(testCase: TestCase) {
		const result = testCase.result();
		if (result.state === 'pending') return;

		const event: TestFinishedEvent = {
			type: 'testFinished',
			name: testCase.fullName,
			status: result.state,
			durationMs: testCase.diagnostic()?.duration ?? 0,
		};
		const error = result.errors?.[0];
		if (result.state === 'failed' && error) event.error = toEventError(error);
		await this.send(event);
	}

	async onTestRunEnd(
		testModules: readonly TestModule[],
		unhandledErrors: readonly SerializedError[],
		reason: TestRunEndReason,
	) {
		const errors = [
			...testModules.flatMap((testModule) => testModule.errors()),
			...unhandledErrors,
		].map((error) => stripVTControlCharacters(error.message));
		await this.send({ type: 'runFinished', status: runStatus(reason, errors), errors });
	}
}

function runStatus(reason: TestRunEndReason, errors: string[]): RunStatus {
	if (errors.length > 0 || reason === 'interrupted') return 'error';
	return reason;
}

function toEventError(error: SerializedError): NonNullable<TestFinishedEvent['error']> {
	const { code, node } = error;
	return {
		message: stripVTControlCharacters(error.message),
		...(typeof code === 'string' ? { code } : {}),
		...(typeof node === 'string' ? { node } : {}),
	};
}
