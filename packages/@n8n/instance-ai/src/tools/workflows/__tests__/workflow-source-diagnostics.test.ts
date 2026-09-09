import { createAbortError } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import { runInSandbox } from '../../../workspace/sandbox-fs';
import { appendWorkflowSourceDiagnostics } from '../workflow-source-diagnostics';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: async () => await Promise.resolve('/sandbox'),
}));
vi.mock('../../../workspace/sandbox-fs', async (importOriginal) => ({
	...(await importOriginal<object>()),
	runInSandbox: vi.fn(),
}));

const context = mock<InstanceAiContext>({
	workspace: mock<NonNullable<InstanceAiContext['workspace']>>(),
	logger: mock(),
});
const original = ['Original runtime error'];
const diagnostic =
	"src/main.ts(2,4): error TS2339: Property 'onError' does not exist on type 'WorkflowBuilder'.";

describe('appendWorkflowSourceDiagnostics', () => {
	afterEach(() => {
		vi.resetAllMocks();
		vi.useRealTimers();
	});

	it('keeps original errors first and removes only exact duplicates', async () => {
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: JSON.stringify([diagnostic, diagnostic, diagnostic.replace('(2,4)', '(3,4)')]),
			stderr: '',
		});
		const errors = await appendWorkflowSourceDiagnostics(context, 'src/main.ts', original);
		expect(errors).toEqual([...original, diagnostic, diagnostic.replace('(2,4)', '(3,4)')]);
	});

	it.each([
		{ exitCode: 1, stdout: '', stderr: 'Compiler unavailable' },
		{ exitCode: 0, stdout: 'invalid JSON', stderr: '' },
		{ exitCode: 0, stdout: '[{"code":2339}]', stderr: '' },
	])('preserves the build error if diagnostics fail: %j', async (result) => {
		vi.mocked(runInSandbox).mockResolvedValue(result);
		expect(await appendWorkflowSourceDiagnostics(context, 'src/main.ts', original)).toEqual(
			original,
		);
	});

	it('preserves the build error when the sandbox is unavailable', async () => {
		vi.mocked(runInSandbox).mockRejectedValue(new Error('Disconnected'));
		expect(await appendWorkflowSourceDiagnostics(context, 'src/main.ts', original)).toEqual(
			original,
		);
	});

	it('removes duplicate validation findings even when the compiler is unavailable', async () => {
		vi.mocked(runInSandbox).mockRejectedValue(new Error('Disconnected'));
		expect(
			await appendWorkflowSourceDiagnostics(context, 'src/main.ts', [...original, ...original]),
		).toEqual(original);
	});

	it('skips JSON source', async () => {
		expect(await appendWorkflowSourceDiagnostics(context, 'src/main.json', original)).toEqual(
			original,
		);
		expect(runInSandbox).not.toHaveBeenCalled();
	});

	it('stops waiting when the diagnostic request times out', async () => {
		vi.useFakeTimers();
		vi.mocked(runInSandbox).mockImplementation(async () => await new Promise(() => {}));
		const result = appendWorkflowSourceDiagnostics(context, 'src/main.ts', original);
		await vi.advanceTimersByTimeAsync(6_000);
		expect(await result).toEqual(original);
		expect(runInSandbox).toHaveBeenCalledWith(
			context.workspace,
			"exec node --max-old-space-size=512 workflow-diagnostics.cjs '/sandbox/src/main.ts'",
			expect.objectContaining({ timeout: 5_000 }),
		);
	});

	it('propagates user cancellation', async () => {
		const controller = new AbortController();
		vi.mocked(runInSandbox).mockImplementation(() => {
			controller.abort();
			throw createAbortError();
		});
		await expect(
			appendWorkflowSourceDiagnostics(context, 'src/main.ts', original, controller.signal),
		).rejects.toMatchObject({ name: 'AbortError' });
	});
});
