import {
	InstanceAiEvalExportExecutionRequest,
	InstanceAiEvalRestoreExecutionRequest,
	instanceAiEvalFailedExecutionEnvelopeSchema,
} from '../instance-ai.schema';

const threadId = '11111111-1111-4111-8111-111111111111';

const envelope = {
	format: 'n8n-instance-ai-failed-execution',
	version: 1,
	source: {
		executionId: '12',
		workflowId: 'workflow-1',
		workflowVersionId: '22222222-2222-4222-8222-222222222222',
		createdAt: '2026-01-01T00:00:00.000Z',
		startedAt: '2026-01-01T00:00:01.000Z',
		stoppedAt: '2026-01-01T00:00:02.000Z',
	},
	execution: {
		mode: 'manual',
		status: 'error',
		finished: false,
		workflowData: {
			id: 'workflow-1',
			name: 'Historical workflow',
			nodes: [],
			connections: {},
			futureNativeField: { retained: true },
		},
		data: '[{"version":1,"resultData":{"runData":{}}}]',
	},
};

describe('Instance AI failed execution schemas', () => {
	it('accepts the reviewed versioned envelope without rewriting native payloads', () => {
		const parsed = instanceAiEvalFailedExecutionEnvelopeSchema.parse(envelope);

		expect(parsed.execution.workflowData).toEqual(envelope.execution.workflowData);
		expect(parsed.execution.data).toBe(envelope.execution.data);
	});

	it('accepts a crashed run', () => {
		const crashed = { ...envelope, execution: { ...envelope.execution, status: 'crashed' } };
		expect(instanceAiEvalFailedExecutionEnvelopeSchema.parse(crashed).execution.status).toBe(
			'crashed',
		);
	});

	it.each([
		{ ...envelope, version: 2 },
		{ ...envelope, execution: { ...envelope.execution, status: 'success' } },
		{ ...envelope, execution: { ...envelope.execution, finished: true } },
		{ ...envelope, source: { ...envelope.source, stoppedAt: 'not-a-date' } },
	])('rejects an incompatible outer contract', (value) => {
		expect(instanceAiEvalFailedExecutionEnvelopeSchema.safeParse(value).success).toBe(false);
	});

	it('validates both endpoint request bodies', () => {
		expect(
			InstanceAiEvalExportExecutionRequest.safeParse({ threadId, executionId: '12' }).success,
		).toBe(true);
		expect(
			InstanceAiEvalRestoreExecutionRequest.safeParse({
				threadId,
				workflowId: 'target-workflow',
				envelope,
			}).success,
		).toBe(true);
	});
});
