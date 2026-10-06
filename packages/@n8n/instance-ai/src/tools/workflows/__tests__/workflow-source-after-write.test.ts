import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { saveWorkflowSourceFileBinding } from '../workflow-file-bindings';
import {
	WRITE_CHECK_DEADLINE_MS,
	WRITE_CHECK_TIMEOUT_NOTE,
	workflowSourceAfterWrite,
} from '../workflow-source-after-write';
import { compileWorkflowSource } from '../workflow-source-compiler';
import type { ValidationWarning } from '../workflow-validation-warnings';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: async () => await Promise.resolve('/home/user/workspace'),
}));

vi.mock('../workflow-source-compiler', async (importOriginal) => ({
	...(await importOriginal<typeof import('../workflow-source-compiler')>()),
	compileWorkflowSource: vi.fn(),
}));

const compile = vi.mocked(compileWorkflowSource);

const NEXT_SOURCE =
	"import { workflow } from '@n8n/workflow-sdk/next';\nexport default workflow('A');\n";

function contextWith(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		nodeContractsEnabled: true,
		workspace: {},
		workflowService: { getAsWorkflowJSON: vi.fn() },
		logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
		recordWorkflowCodeSnapshot: vi.fn(),
		...overrides,
	} as unknown as InstanceAiContext;
}

/** A chain of a manual trigger and no-op nodes, with ids `id-<name>`. */
function chain(names: string[]): WorkflowJSON {
	const nodes = names.map((name, index) => ({
		id: `id-${name}`,
		name,
		type: index === 0 ? 'n8n-nodes-base.manualTrigger' : 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [index * 200, 0] as [number, number],
		parameters: {},
	}));
	const connections = Object.fromEntries(
		names
			.slice(1)
			.map((name, index) => [
				names[index],
				{ main: [[{ node: name, type: 'main' as const, index: 0 }]] },
			]),
	);
	return { name: 'A', nodes, connections };
}

const slotWarning = (nodeName: string): ValidationWarning => ({
	code: 'PROVIDER_SLOT_MISMATCH',
	nodeName,
	severity: 'warning',
	message: `"${nodeName}" (line 7): n8n-nodes-base.slack gives main, not ai_languageModel. It cannot be the model of "Agent".`,
});

const untypedOutput: ValidationWarning = {
	code: 'UNTYPED_OUTPUT',
	nodeName: 'B',
	severity: 'informational',
	message:
		'"B": reads of id are untyped (node() and trigger() have no output type), so tsc does not check them. Give it `sample` items.',
};

const sampleMismatch: ValidationWarning = {
	code: 'SAMPLE_SCHEMA_MISMATCH',
	nodeName: 'C',
	severity: 'informational',
	message:
		'"C": the sample does not match the output schema: $json.total: must be number. Fix the sample to match the real output.',
};

describe('workflowSourceAfterWrite', () => {
	beforeEach(() => {
		compile.mockReset();
	});

	it('is absent without node contracts', () => {
		expect(workflowSourceAfterWrite(contextWith({ nodeContractsEnabled: false }))).toBeUndefined();
	});

	it('returns the errors of the build check for a typed workflow source', async () => {
		const context = contextWith();
		const signal = new AbortController().signal;
		compile.mockResolvedValue({
			success: false,
			reason: 'workflow_source_type_errors',
			editable: true,
			errors: ["src/a.workflow.ts(2,1): error TS2304: Cannot find name 'x'."],
			summary: 'Workflow source has type errors.',
		});

		const diagnostics = await workflowSourceAfterWrite(context)?.(
			{ path: '/home/user/workspace/src/a.workflow.ts', content: NEXT_SOURCE },
			{ abortSignal: signal, toolCallId: 'call-1' },
		);

		const errors = ["src/a.workflow.ts(2,1): error TS2304: Cannot find name 'x'."];
		expect(diagnostics).toEqual(errors);
		expect(compile).toHaveBeenCalledWith(
			context,
			'src/a.workflow.ts',
			NEXT_SOURCE,
			expect.any(AbortSignal),
		);
		expect(context.recordWorkflowCodeSnapshot).toHaveBeenCalledWith({
			code: NEXT_SOURCE,
			source: 'full-code',
			toolCallId: 'call-1',
			success: false,
			errors,
			capturedAt: expect.any(Number),
			durationMs: expect.any(Number),
		});
	});

	it('stops waiting at the deadline and says so', async () => {
		vi.useFakeTimers();
		try {
			compile.mockImplementation(
				async (_context, _path, _source, signal) =>
					await new Promise((_resolve, reject) => {
						signal?.addEventListener('abort', () =>
							reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
						);
					}),
			);
			const pending = workflowSourceAfterWrite(contextWith())?.(
				{ path: 'src/a.ts', content: NEXT_SOURCE },
				{},
			);
			await vi.advanceTimersByTimeAsync(WRITE_CHECK_DEADLINE_MS);

			expect(await pending).toEqual([WRITE_CHECK_TIMEOUT_NOTE]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('returns no diagnostics for a source that builds', async () => {
		compile.mockResolvedValue({
			success: true,
			workflow: { name: 'A', nodes: [], connections: {} },
			warnings: [],
			compiler: 'sandbox-tsx',
		});

		const diagnostics = await workflowSourceAfterWrite(contextWith())?.(
			{ path: 'src/a.workflow.ts', content: NEXT_SOURCE },
			{},
		);

		expect(diagnostics).toEqual([]);
	});

	it('returns the grouping refusal of the build for a canvas over the ceiling without a group', async () => {
		const workflow = chain(['Start', 'A', 'B', 'C', 'D', 'E', 'F', 'G']);
		compile.mockResolvedValue({ success: true, workflow, warnings: [], compiler: 'sandbox-tsx' });
		const afterWrite = workflowSourceAfterWrite(contextWith());
		const file = { path: 'src/a.workflow.ts', content: NEXT_SOURCE };

		expect(await afterWrite?.(file, {})).toEqual([
			expect.stringMatching(
				/^\[GROUPING_DECISION_MISSING\]: The canvas would have 8 boxes .* Ungrouped: A, B, C, D, E, F, G\. Wrap each stage in `group\(/,
			),
		]);

		compile.mockResolvedValue({
			success: true,
			workflow: { ...workflow, nodes: workflow.nodes.slice(0, 7) },
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		expect(await afterWrite?.(file, {})).toEqual([]);
	});

	it('returns the build warnings after the errors, in the text of the build', async () => {
		const context = contextWith();
		compile.mockResolvedValue({
			success: true,
			workflow: chain(['Start', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
			warnings: [untypedOutput, slotWarning('A'), sampleMismatch],
			compiler: 'sandbox-tsx',
		});

		const diagnostics = await workflowSourceAfterWrite(context)?.(
			{ path: 'src/a.workflow.ts', content: NEXT_SOURCE },
			{ toolCallId: 'call-1' },
		);

		const grouping = expect.stringMatching(/^\[GROUPING_DECISION_MISSING\]: /);
		expect(diagnostics).toEqual([
			grouping,
			`[PROVIDER_SLOT_MISMATCH] (A): ${slotWarning('A').message}`,
			`[UNTYPED_OUTPUT]: ${untypedOutput.message}`,
			`[SAMPLE_SCHEMA_MISMATCH]: ${sampleMismatch.message}`,
		]);
		expect(context.recordWorkflowCodeSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({ success: false, errors: [grouping] }),
		);
		expect(context.workflowService.getAsWorkflowJSON).not.toHaveBeenCalled();
	});

	it('marks a warning of a saved node that the write did not change as the build does', async () => {
		const context = contextWith();
		await saveWorkflowSourceFileBinding(context, {
			filePath: 'src/a.workflow.ts',
			workflowId: 'wf-1',
		});
		const saved = chain(['Start', 'A', 'B']);
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue(saved);
		const built = chain(['Start', 'A', 'B']);
		compile.mockResolvedValue({
			success: true,
			workflow: {
				...built,
				nodes: built.nodes.map((node) => ({
					...node,
					id: `minted-${node.name}`,
					parameters: node.name === 'B' ? { edited: true } : node.parameters,
				})),
			},
			warnings: [slotWarning('A'), slotWarning('B')],
			compiler: 'sandbox-tsx',
		});

		const diagnostics = await workflowSourceAfterWrite(context)?.(
			{ path: 'src/a.workflow.ts', content: NEXT_SOURCE },
			{ toolCallId: 'call-1' },
		);

		expect(diagnostics).toEqual([
			`[PROVIDER_SLOT_MISMATCH] (B): ${slotWarning('B').message}`,
			`[PROVIDER_SLOT_MISMATCH]: ${slotWarning('A').message} (pre-existing node issue; not blocking this edit)`,
		]);
		expect(context.recordWorkflowCodeSnapshot).toHaveBeenCalledWith(
			expect.objectContaining({ success: true, errors: [] }),
		);
	});

	it('does not check other files', async () => {
		const afterWrite = workflowSourceAfterWrite(contextWith());
		const legacy = "import { workflow } from '@n8n/workflow-sdk';\n";

		expect(await afterWrite?.({ path: 'notes.md', content: NEXT_SOURCE }, {})).toBeUndefined();
		expect(await afterWrite?.({ path: 'src/a.ts', content: legacy }, {})).toBeUndefined();
		expect(compile).not.toHaveBeenCalled();
	});

	it('adds nothing when the check throws, and keeps an abort', async () => {
		const context = contextWith();
		const afterWrite = workflowSourceAfterWrite(context);
		const file = { path: 'src/a.ts', content: NEXT_SOURCE };
		compile.mockRejectedValueOnce(new Error('sandbox gone'));
		const controller = new AbortController();
		compile.mockImplementationOnce(async () => {
			controller.abort();
			throw Object.assign(new Error('aborted'), { name: 'AbortError' });
		});

		expect(await afterWrite?.(file, {})).toBeUndefined();
		expect(context.logger.warn).toHaveBeenCalledWith('Workflow source check after write failed', {
			error: 'sandbox gone',
		});
		await expect(afterWrite?.(file, { abortSignal: controller.signal })).rejects.toMatchObject({
			name: 'AbortError',
		});
	});
});
