import type { InstanceAiContext } from '../../../types';
import {
	WRITE_CHECK_DEADLINE_MS,
	WRITE_CHECK_TIMEOUT_NOTE,
	workflowSourceAfterWrite,
} from '../workflow-source-after-write';
import { compileWorkflowSource } from '../workflow-source-compiler';

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
		logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
		recordWorkflowCodeSnapshot: vi.fn(),
		...overrides,
	} as unknown as InstanceAiContext;
}

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
