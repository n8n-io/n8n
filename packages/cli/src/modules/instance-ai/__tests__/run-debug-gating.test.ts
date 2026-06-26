import type { User } from '@n8n/db';
import { RunDebugBuffer } from '@n8n/instance-ai';

import { InstanceAiService } from '../instance-ai.service';

type RunDebugGatingInternals = {
	instanceAiConfig: { runDebugEnabled: boolean };
	runDebugBuffer: RunDebugBuffer;
	buildOrchestratorAgentStreamOptions: (
		user: User,
		threadId: string,
		runId: string,
		signal: AbortSignal,
	) => Record<string, unknown>;
	buildOrchestratorResumeAgentOptions: (
		user: User,
		threadId: string,
		runId: string,
		agentRunId: string,
		toolCallId: string,
	) => Record<string, unknown>;
	getRunDebug: (runId: string) => ReturnType<RunDebugBuffer['get']>;
};

function createRunDebugGatingService(runDebugEnabled: boolean): RunDebugGatingInternals {
	const service = Object.create(InstanceAiService.prototype) as RunDebugGatingInternals;
	service.instanceAiConfig = { runDebugEnabled };
	service.runDebugBuffer = new RunDebugBuffer();
	return service;
}

describe('InstanceAiService run debug gating', () => {
	const user = { id: 'user-1' } as User;
	const threadId = 'thread-1';
	const runId = 'run-1';
	const signal = new AbortController().signal;

	it('does not attach step hooks or create run records when run debug is disabled', () => {
		const service = createRunDebugGatingService(false);

		const streamOptions = service.buildOrchestratorAgentStreamOptions(
			user,
			threadId,
			runId,
			signal,
		);
		const resumeOptions = service.buildOrchestratorResumeAgentOptions(
			user,
			threadId,
			runId,
			'agent-run-1',
			'tool-call-1',
		);

		expect(streamOptions.onStepStart).toBeUndefined();
		expect(streamOptions.onStepFinish).toBeUndefined();
		expect(resumeOptions.onStepStart).toBeUndefined();
		expect(resumeOptions.onStepFinish).toBeUndefined();
		expect(service.getRunDebug(runId)).toBeUndefined();
		// Both terminal paths opt into raw-usage recovery so stopped/errored runs bill.
		expect(streamOptions.recoverUsageOnAbort).toBe(true);
		expect(resumeOptions.recoverUsageOnAbort).toBe(true);
	});

	it('attaches step hooks and creates run records when run debug is enabled', () => {
		const service = createRunDebugGatingService(true);

		const streamOptions = service.buildOrchestratorAgentStreamOptions(
			user,
			threadId,
			runId,
			signal,
		);
		const resumeOptions = service.buildOrchestratorResumeAgentOptions(
			user,
			threadId,
			runId,
			'agent-run-1',
			'tool-call-1',
		);

		expect(typeof streamOptions.onStepStart).toBe('function');
		expect(typeof streamOptions.onStepFinish).toBe('function');
		expect(typeof resumeOptions.onStepStart).toBe('function');
		expect(typeof resumeOptions.onStepFinish).toBe('function');
		expect(service.getRunDebug(runId)).toEqual(
			expect.objectContaining({
				runId,
				threadId,
				steps: [],
				workflowCode: [],
			}),
		);
	});
});
