import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { validateWorkflow } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { runInSandbox } from '../../../workspace/sandbox-fs';
import { compileWorkflowSource } from '../workflow-source-compiler';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/daytona/workspace')),
}));

vi.mock('@n8n/workflow-sdk', () => ({
	validateWorkflow: vi.fn(() => ({ errors: [], warnings: [] })),
}));

vi.mock('../../../workspace/sandbox-fs', () => ({
	escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
	runInSandbox: vi.fn(),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {},
		credentialService: {},
		nodeService: {},
		dataTableService: {},
		executionService: {},
		workspace: { sandbox: {} },
		logger: { warn: vi.fn(), debug: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('compileWorkflowSource', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateWorkflow).mockReturnValue({ valid: true, errors: [], warnings: [] });
	});

	it('parses WorkflowJSON sources in process without sandbox execution', async () => {
		const workflow = {
			name: 'JSON workflow',
			nodes: [
				{
					id: 'manual-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
			connections: {},
		};
		const context = makeContext();

		const result = await compileWorkflowSource(
			context,
			'src/workflows/json.workflow.json',
			JSON.stringify(workflow),
		);

		expect(result).toMatchObject({
			success: true,
			compiler: 'workflow-json',
			workflow,
		});
		expect(runInSandbox).not.toHaveBeenCalled();
		expect(validateWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'JSON workflow' }),
			expect.objectContaining({ strictMode: true }),
		);
	});

	it('runs TypeScript workflow sources through the sandbox tsx build runner', async () => {
		const workflow = {
			name: 'TS workflow',
			nodes: [
				{
					id: 'manual-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {},
		};
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: `tsx warning\n${JSON.stringify({
				success: true,
				workflow,
				warnings: [{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected' }],
			})}`,
			stderr: '',
		});
		vi.mocked(validateWorkflow).mockReturnValue({
			valid: false,
			errors: [{ code: 'INVALID_PARAMETER', message: 'Bad parameter', nodeName: 'Manual Trigger' }],
			warnings: [],
		});
		const context = makeContext();

		const result = await compileWorkflowSource(
			context,
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(getWorkspaceRoot).toHaveBeenCalledWith(context.workspace);
		expect(runInSandbox).toHaveBeenCalledWith(
			context.workspace,
			"node --import tsx build.mjs '/home/daytona/workspace/src/workflows/main.workflow.ts'",
			'/home/daytona/workspace',
		);
		expect(result).toMatchObject({
			success: true,
			compiler: 'sandbox-tsx',
			workflow,
			warnings: [
				{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected' },
				{
					code: 'INVALID_PARAMETER',
					message: 'Bad parameter',
					nodeName: 'Manual Trigger',
				},
			],
		});
	});

	it('returns a code-fixable failure when sandbox output cannot be parsed', async () => {
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 1,
			stdout: 'not json',
			stderr: 'compile failed',
		});

		const result = await compileWorkflowSource(
			makeContext(),
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(result).toMatchObject({
			success: false,
			reason: 'workflow_source_sandbox_failed',
			editable: true,
			errors: ['Failed to execute workflow file in sandbox (exit code 1).', 'compile failed'],
		});
	});

	it('returns non-editable failure when no sandbox workspace is available', async () => {
		const result = await compileWorkflowSource(
			makeContext({ workspace: undefined }),
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(result).toMatchObject({
			success: false,
			reason: 'workflow_source_sandbox_unavailable',
			editable: false,
		});
		expect(runInSandbox).not.toHaveBeenCalled();
	});
});
