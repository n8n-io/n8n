import type { OneOffTaskSandbox } from '../../contracts';
import { withOneOffTaskSandbox } from '../with-one-off-task-sandbox';

function createSandboxStub(
	destroy = vi.fn(async () => await Promise.resolve()),
): OneOffTaskSandbox & {
	destroy: ReturnType<typeof vi.fn>;
} {
	return {
		bootstrap: vi.fn(async () => await Promise.resolve()),
		runHarness: vi.fn(async () => await Promise.resolve({ exitCode: 0 })),
		destroy,
	};
}

describe('withOneOffTaskSandbox', () => {
	it('destroys the sandbox after a successful run and returns the result', async () => {
		const sandbox = createSandboxStub();

		const result = await withOneOffTaskSandbox(sandbox, async () => await Promise.resolve('done'));

		expect(result).toBe('done');
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('destroys the sandbox when the task function throws, keeping the original error', async () => {
		const sandbox = createSandboxStub();

		await expect(
			withOneOffTaskSandbox(sandbox, async () => await Promise.reject(new Error('task failed'))),
		).rejects.toThrow('task failed');
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('destroys the sandbox when the task is aborted', async () => {
		const sandbox = createSandboxStub();
		const abortController = new AbortController();

		const run = withOneOffTaskSandbox(sandbox, async () => {
			return await new Promise<never>((_resolve, reject) => {
				abortController.signal.addEventListener('abort', () =>
					reject(new DOMException('The operation was aborted', 'AbortError')),
				);
			});
		});
		abortController.abort();

		await expect(run).rejects.toThrow('The operation was aborted');
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('does not let a destroy failure mask the task error', async () => {
		const sandbox = createSandboxStub(
			vi.fn(async () => await Promise.reject(new Error('destroy failed'))),
		);

		await expect(
			withOneOffTaskSandbox(sandbox, async () => await Promise.reject(new Error('task failed'))),
		).rejects.toThrow('task failed');
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('surfaces a destroy failure when the task itself succeeded', async () => {
		const sandbox = createSandboxStub(
			vi.fn(async () => await Promise.reject(new Error('destroy failed'))),
		);

		await expect(
			withOneOffTaskSandbox(sandbox, async () => await Promise.resolve('done')),
		).rejects.toThrow('destroy failed');
	});
});
