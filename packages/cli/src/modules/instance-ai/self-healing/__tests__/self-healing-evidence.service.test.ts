import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse, User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { createRunExecutionData, type ExecutionError, type IRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import type { AiUsageService } from '@/services/ai-usage.service';

import { SelfHealingEvidenceService } from '../self-healing-evidence.service';
import type { SelfHealingExecutionReferenceService } from '../self-healing-execution-reference.service';

const user = mock<User>({ id: 'actor', disabled: false });
const baseline: WorkflowSuggestionBaseline = {
	workflowId: 'workflow',
	projectId: 'project',
	backgroundUserId: user.id,
	expectedBaseline: {
		savedVersionId: 'v1',
		publishedVersionId: 'v1',
		checksum: 'checksum',
		versionCounter: 1,
		latestPublishHistoryEventId: null,
	},
	original: { name: 'Workflow', nodes: [], connections: {} },
};

describe('SelfHealingEvidenceService', () => {
	const references = mock<SelfHealingExecutionReferenceService>();
	const executions = mock<ExecutionPersistence>();
	const redaction = mock<ExecutionRedactionServiceProxy>();
	const aiUsage = mock<AiUsageService>();
	const config = mock<GlobalConfig>({ executions: { maxDisplaySize: 100_000 } });
	const service = new SelfHealingEvidenceService(
		references,
		executions,
		redaction,
		aiUsage,
		config,
	);
	let execution: IExecutionResponse;

	beforeEach(() => {
		vi.resetAllMocks();
		execution = mock<IExecutionResponse>({
			id: '123',
			workflowId: baseline.workflowId,
			workflowVersionId: 'v1',
			mode: 'webhook',
			status: 'error',
			dataTooLargeToDisplay: false,
			workflowData: {
				id: baseline.workflowId,
				nodes: [],
				settings: {},
				meta: undefined,
			},
		});
		execution.data = createRunExecutionData({
			resultData: {
				error: {
					name: 'NodeApiError',
					message: 'Request failed',
					description: 'Private response',
				} as ExecutionError,
				lastNodeExecuted: 'Request',
				runData: {},
			},
		});
		executions.findOneInWorkflows.mockResolvedValue(execution);
		redaction.processExecution.mockImplementation(async (input) => input);
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(true);
	});

	it('uses the authorized bounded execution read and the existing sharing policy', async () => {
		const evidence = await service.read(user, baseline, execution.id);

		expect(references.validateReference).toHaveBeenCalledWith(user, baseline.workflowId, '123');
		expect(executions.findOneInWorkflows).toHaveBeenCalledWith('123', [baseline.workflowId], {
			includeAnnotation: false,
			maxDataSizeBytes: 100_000,
		});
		expect(redaction.processExecution).toHaveBeenCalledWith(execution, {
			user,
			keepOriginal: true,
		});
		expect(evidence).toEqual({
			message: 'Request failed — Private response',
			allowExecutionData: true,
			execution: {
				executionId: '123',
				workflowVersionId: 'v1',
				status: 'error',
				error: 'Request failed — Private response',
				lastNodeExecuted: 'Request',
				nodeTrace: [],
			},
		});
	});

	it('suppresses upstream error details when parameter sharing is disabled', async () => {
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(false);

		const evidence = await service.read(user, baseline, execution.id);

		expect(evidence.message).toContain('Request failed');
		expect(evidence.allowExecutionData).toBe(false);
		expect(JSON.stringify(evidence)).not.toContain('Private response');
	});

	it('uses redacted data without falling back to the original error', async () => {
		redaction.processExecution.mockResolvedValue({
			...execution,
			data: { resultData: { runData: {}, redactedError: { type: 'NodeApiError' } } },
		});

		const evidence = await service.read(user, baseline, execution.id);

		expect(evidence.message).toContain('error details are unavailable');
		expect(evidence.allowExecutionData).toBe(false);
		expect(JSON.stringify(evidence)).not.toContain('Request failed');
		expect(JSON.stringify(evidence)).not.toContain('Private response');
	});

	it('accepts retained evidence without reading the deleted execution data', async () => {
		const evidence = await service.read(user, baseline, execution.id, execution);

		expect(evidence.execution.executionId).toBe(execution.id);
		expect(evidence.allowExecutionData).toBe(false);
		expect(references.validateReference).toHaveBeenCalled();
		expect(executions.findOneInWorkflows).not.toHaveBeenCalled();
		expect(redaction.processExecution).toHaveBeenCalled();
	});

	it('keeps detailed reads unavailable for previously redacted stored data', async () => {
		execution.data.redactionInfo = { isRedacted: true, reason: 'policy', canReveal: false };

		const evidence = await service.read(user, baseline, execution.id);

		expect(evidence.allowExecutionData).toBe(false);
	});

	it('rejects retained evidence after execution access is lost', async () => {
		references.validateReference.mockRejectedValue(new ForbiddenError('Access lost'));

		await expect(service.read(user, baseline, execution.id, execution)).rejects.toThrow(
			'Access lost',
		);
		expect(redaction.processExecution).not.toHaveBeenCalled();
	});

	it('rejects a different actor before reading evidence', async () => {
		await expect(service.read(mock<User>({ id: 'other' }), baseline, execution.id)).rejects.toThrow(
			ForbiddenError,
		);
		expect(references.validateReference).not.toHaveBeenCalled();
		expect(executions.findOneInWorkflows).not.toHaveBeenCalled();
	});

	it.each([
		{ id: 'different-execution' },
		{ workflowId: 'different-workflow' },
		{ workflowVersionId: 'old-version' },
		{ workflowVersionId: null },
	])('rejects mismatched retained failure metadata: %j', async (metadata) => {
		await expect(
			service.read(user, baseline, execution.id, { ...execution, ...metadata }),
		).rejects.toThrow('current published workflow version');
		expect(redaction.processExecution).not.toHaveBeenCalled();
	});

	it.each(['success', 'running', 'waiting', 'canceled'] as const)(
		'rejects an execution with status %s',
		async (status) => {
			execution.status = status;

			await expect(service.read(user, baseline, execution.id)).rejects.toThrow(
				'not an eligible production failure',
			);
		},
	);

	it.each(['manual', 'evaluation'] as const)('rejects %s runs', async (mode) => {
		execution.mode = mode;

		await expect(service.read(user, baseline, execution.id)).rejects.toThrow(
			'not an eligible production failure',
		);
	});

	it.each([
		{ source: 'instance_ai' },
		{ evaluationRunId: 'evaluation' },
		{ userId: 'actor' },
	] satisfies Array<IRunExecutionData['manualData']>)(
		'rejects test origins in webhook mode: %j',
		async (manualData) => {
			execution.data.manualData = manualData;

			await expect(service.read(user, baseline, execution.id)).rejects.toThrow(
				'not an eligible production failure',
			);
		},
	);

	it.each(['Credentials are unavailable', 'Connection timed out'])(
		'accepts failures that can need human action: %s',
		async (message) => {
			execution.data.resultData.error = { name: 'NodeApiError', message } as ExecutionError;

			await expect(service.read(user, baseline, execution.id)).resolves.toMatchObject({ message });
		},
	);

	it('accepts a crashed production execution', async () => {
		execution.status = 'crashed';

		await expect(service.read(user, baseline, execution.id)).resolves.toMatchObject({
			execution: { status: 'error' },
		});
	});

	it('caps error text and excludes node outputs and binary contents', async () => {
		execution.data.resultData.error = {
			name: 'NodeApiError',
			message: 'x'.repeat(10_000),
		} as ExecutionError;
		execution.data.resultData.runData = {
			Request: [
				{
					startTime: 1,
					executionTime: 1,
					executionIndex: 0,
					source: [],
					data: {
						main: [
							[
								{
									json: { privateValue: 'private output' },
									binary: { file: { data: 'bytes', mimeType: 'text/plain' } },
								},
							],
						],
					},
				},
			],
		};

		const evidence = await service.read(user, baseline, execution.id);

		expect(evidence.message.length).toBeLessThanOrEqual(4001);
		expect(JSON.stringify(evidence)).not.toContain('private output');
		expect(JSON.stringify(evidence)).not.toContain('bytes');
	});

	it('rejects unavailable or oversized execution data', async () => {
		executions.findOneInWorkflows.mockResolvedValueOnce(undefined);
		await expect(service.read(user, baseline, execution.id)).rejects.toThrow('unavailable');
		execution.dataTooLargeToDisplay = true;
		await expect(service.read(user, baseline, execution.id)).rejects.toThrow('size limit');
	});
});
