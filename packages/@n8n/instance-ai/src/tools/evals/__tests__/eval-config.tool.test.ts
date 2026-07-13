import type { Mock } from 'vitest';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type {
	EvaluationConfigSummary,
	InstanceAiContext,
	UpsertEvaluationConfigInput,
} from '../../../types';
import { createEvalConfigTool } from '../eval-config.tool';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockEvalConfigService() {
	return {
		list: vi.fn().mockResolvedValue([]),
		get: vi.fn().mockResolvedValue(null),
		create: vi.fn().mockResolvedValue({}),
		update: vi.fn().mockResolvedValue({}),
		delete: vi.fn().mockResolvedValue(undefined),
	};
}

// Pass `null` to build a context WITHOUT an eval-config service. A default
// param only kicks in for `undefined`, so `null` is the explicit "absent" sentinel.
function createMockContext(
	evaluationConfigService: ReturnType<
		typeof createMockEvalConfigService
	> | null = createMockEvalConfigService(),
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		evaluationConfigService: evaluationConfigService ?? undefined,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspendFn: Mock) {
	return { resumeData: undefined, suspend: suspendFn } as never;
}

function resumeCtx(approved: boolean) {
	return { resumeData: { approved } } as never;
}

function noSuspendCtx() {
	return { resumeData: undefined, suspend: undefined } as never;
}

const summary: EvaluationConfigSummary = {
	id: 'cfg-1',
	workflowId: 'wf-1',
	name: 'Answer quality',
	status: 'valid',
	invalidReason: null,
	startNodeName: 'Agent',
	endNodeName: 'Agent',
	metrics: [{ id: 'm-1', name: 'Correctness', type: 'llm_judge' }],
	datasetSource: 'data_table',
	dataTableId: 'dt-1',
};

const createInput = {
	action: 'create' as const,
	workflowId: 'wf-1',
	name: 'Answer quality',
	startNodeName: 'Agent',
	endNodeName: 'Agent',
	dataTableId: 'dt-1',
	metrics: [
		{
			name: 'Correctness',
			preset: 'correctness' as const,
			provider: 'openai',
			credentialId: 'cred-1',
			model: 'gpt-4o',
			outputType: 'numeric' as const,
			actualAnswer: '={{ $json.output }}',
			expectedAnswer: '={{ $json.expected }}',
		},
	],
};

const expectedUpsertInput: UpsertEvaluationConfigInput = {
	name: 'Answer quality',
	startNodeName: 'Agent',
	endNodeName: 'Agent',
	dataTableId: 'dt-1',
	metrics: createInput.metrics,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('eval-config tool', () => {
	describe('tool construction', () => {
		it('should describe config-based evaluations', () => {
			const tool = createEvalConfigTool(createMockContext());
			expect(tool.description).toContain('configuration-based evaluations');
		});
	});

	describe('list action', () => {
		it('should return configs from the service', async () => {
			const service = createMockEvalConfigService();
			service.list.mockResolvedValue([summary]);
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(
				tool,
				{ action: 'list', workflowId: 'wf-1' },
				noSuspendCtx(),
			);

			expect(service.list).toHaveBeenCalledWith('wf-1');
			expect(result).toEqual({ configs: [summary] });
		});
	});

	describe('get action', () => {
		it('should return the config when found', async () => {
			const service = createMockEvalConfigService();
			service.get.mockResolvedValue(summary);
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(
				tool,
				{ action: 'get', workflowId: 'wf-1', configId: 'cfg-1' },
				noSuspendCtx(),
			);

			expect(service.get).toHaveBeenCalledWith('wf-1', 'cfg-1');
			expect(result).toEqual({ config: summary });
		});

		it('should return an error when not found', async () => {
			const service = createMockEvalConfigService();
			service.get.mockResolvedValue(null);
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(
				tool,
				{ action: 'get', workflowId: 'wf-1', configId: 'missing' },
				noSuspendCtx(),
			);

			expect(result).toEqual({ error: 'Evaluation config "missing" not found' });
		});
	});

	describe('create action', () => {
		it('should suspend for approval before creating', async () => {
			const service = createMockEvalConfigService();
			const suspend = vi.fn();
			const tool = createEvalConfigTool(createMockContext(service));

			await executeTool(tool, createInput, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Set up evaluation "Answer quality"',
					severity: 'info',
				}),
			);
			expect(service.create).not.toHaveBeenCalled();
		});

		it('should create with the mapped upsert input once approved', async () => {
			const service = createMockEvalConfigService();
			service.create.mockResolvedValue(summary);
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(tool, createInput, resumeCtx(true));

			expect(service.create).toHaveBeenCalledWith('wf-1', expectedUpsertInput);
			expect(result).toEqual({ config: summary });
		});

		it('should not create when the user denies', async () => {
			const service = createMockEvalConfigService();
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(tool, createInput, resumeCtx(false));

			expect(service.create).not.toHaveBeenCalled();
			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
		});

		it('should surface service validation errors as a returned error', async () => {
			const service = createMockEvalConfigService();
			service.create.mockRejectedValue(new Error('Start node not found'));
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(tool, createInput, resumeCtx(true));

			expect(result).toEqual({ error: 'Start node not found' });
		});
	});

	describe('update action', () => {
		it('should update with the mapped upsert input once approved', async () => {
			const service = createMockEvalConfigService();
			service.update.mockResolvedValue(summary);
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(
				tool,
				{ ...createInput, action: 'update', configId: 'cfg-1' },
				resumeCtx(true),
			);

			expect(service.update).toHaveBeenCalledWith('wf-1', 'cfg-1', expectedUpsertInput);
			expect(result).toEqual({ config: summary });
		});
	});

	describe('delete action', () => {
		it('should delete once approved', async () => {
			const service = createMockEvalConfigService();
			const tool = createEvalConfigTool(createMockContext(service));

			const result = await executeTool(
				tool,
				{ action: 'delete', workflowId: 'wf-1', configId: 'cfg-1' },
				resumeCtx(true),
			);

			expect(service.delete).toHaveBeenCalledWith('wf-1', 'cfg-1');
			expect(result).toEqual({ success: true });
		});
	});

	describe('when config-based evals are unavailable', () => {
		it('should report unavailable instead of calling a service', async () => {
			const tool = createEvalConfigTool(createMockContext(null));

			const result = await executeTool(
				tool,
				{ action: 'list', workflowId: 'wf-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				error: 'Config-based evaluations are not available on this instance.',
			});
		});
	});
});
