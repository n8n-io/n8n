import { OperationalError } from 'n8n-workflow';

import type { HarnessRunResult } from '../../contracts';
import {
	ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS,
	ProcessLocalOneOffTaskSandboxProvider,
	type ManagedOneOffTaskSandbox,
} from '../one-off-task-sandbox-provider';

function createManagedSandboxStub(overrides: Partial<ManagedOneOffTaskSandbox> = {}) {
	return {
		bootstrap: vi.fn(async () => await Promise.resolve()),
		runHarness: vi.fn(async () => await Promise.resolve({ exitCode: 0 })),
		destroy: vi.fn(async () => await Promise.resolve()),
		...overrides,
	};
}

function createProvider(options?: {
	sandboxes?: ManagedOneOffTaskSandbox[];
	waitTimeoutMs?: number;
}) {
	const created: ManagedOneOffTaskSandbox[] = [];
	let nextIndex = 0;
	const provider = new ProcessLocalOneOffTaskSandboxProvider({
		createSandbox: async () => {
			const sandbox = options?.sandboxes?.[nextIndex++] ?? createManagedSandboxStub();
			created.push(sandbox);
			return await Promise.resolve(sandbox);
		},
		waitTimeoutMs: options?.waitTimeoutMs,
	});
	return { provider, created };
}

describe('ProcessLocalOneOffTaskSandboxProvider', () => {
	it('mirrors the orchestrator credential wait timeout (10 minutes)', () => {
		// Keep in sync with CREDENTIAL_WAIT_TIMEOUT_MINUTES in run-one-off-task.tool.ts.
		expect(ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS).toBe(10 * 60_000);
	});

	it('round-trips create/reattach through the opaque sandboxRef', async () => {
		const { provider } = createProvider();

		const { sandbox, sandboxRef } = await provider.create();
		expect(sandboxRef).toMatch(/^[0-9a-f-]{36}$/);
		await expect(provider.reattach(sandboxRef)).resolves.toBe(sandbox);
	});

	it('creates a distinct sandbox and ref per create call', async () => {
		const { provider, created } = createProvider();

		const first = await provider.create();
		const second = await provider.create();
		expect(created).toHaveLength(2);
		expect(first.sandboxRef).not.toBe(second.sandboxRef);
		expect(first.sandbox).not.toBe(second.sandbox);
	});

	it('rejects reattach for an unknown ref', async () => {
		const { provider } = createProvider();

		await expect(provider.reattach('unknown-ref')).rejects.toThrow(OperationalError);
	});

	it('destroys the underlying sandbox and evicts the ref on handle destroy', async () => {
		const stub = createManagedSandboxStub();
		const { provider } = createProvider({ sandboxes: [stub] });

		const { sandbox, sandboxRef } = await provider.create();
		await sandbox.destroy();

		expect(stub.destroy).toHaveBeenCalledTimes(1);
		await expect(provider.reattach(sandboxRef)).rejects.toThrow('no longer available');
	});

	it('never resurrects a destroyed sandbox, even when the destroy itself failed', async () => {
		const stub = createManagedSandboxStub({
			destroy: vi.fn(async () => await Promise.reject(new Error('service unavailable'))),
		});
		const { provider } = createProvider({ sandboxes: [stub] });

		const { sandbox, sandboxRef } = await provider.create();
		await expect(sandbox.destroy()).rejects.toThrow('service unavailable');
		await expect(provider.reattach(sandboxRef)).rejects.toThrow(OperationalError);
	});

	it('destroys and evicts a sandbox on reattach after its TTL deadline passed', async () => {
		const stub = createManagedSandboxStub({ expiresAt: new Date(Date.now() - 1) });
		const { provider } = createProvider({ sandboxes: [stub] });

		const { sandboxRef } = await provider.create();
		await expect(provider.reattach(sandboxRef)).rejects.toThrow('exceeded its maximum lifetime');
		expect(stub.destroy).toHaveBeenCalledTimes(1);
		// Evicted for good: the next reattach reports the sandbox gone.
		await expect(provider.reattach(sandboxRef)).rejects.toThrow('no longer available');
	});

	describe('credential wait timeout', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('destroys and evicts a sandbox that sits unused past the wait timeout', async () => {
			const stub = createManagedSandboxStub();
			const { provider } = createProvider({ sandboxes: [stub], waitTimeoutMs: 60_000 });

			const { sandboxRef } = await provider.create();
			await vi.advanceTimersByTimeAsync(60_000);

			expect(stub.destroy).toHaveBeenCalledTimes(1);
			await expect(provider.reattach(sandboxRef)).rejects.toThrow('no longer available');
		});

		it('suspends the wait timeout while a harness run is in flight and re-arms it after', async () => {
			let finishRun!: (result: HarnessRunResult) => void;
			const stub = createManagedSandboxStub({
				runHarness: vi.fn(
					async () =>
						await new Promise<HarnessRunResult>((resolve) => {
							finishRun = resolve;
						}),
				),
			});
			const { provider } = createProvider({ sandboxes: [stub], waitTimeoutMs: 60_000 });

			const { sandbox, sandboxRef } = await provider.create();
			const run = sandbox.runHarness({
				prompt: 'task',
				sessionId: 'session-1',
				env: {},
				abortSignal: new AbortController().signal,
				onEvent: vi.fn(),
			});

			// In flight: the wait timeout must not kill a working sandbox (the
			// hard TTL owns that bound).
			await vi.advanceTimersByTimeAsync(120_000);
			expect(stub.destroy).not.toHaveBeenCalled();

			finishRun({ exitCode: 0 });
			await run;

			// Settled: the credential wait window starts now.
			await vi.advanceTimersByTimeAsync(60_000);
			expect(stub.destroy).toHaveBeenCalledTimes(1);
			await expect(provider.reattach(sandboxRef)).rejects.toThrow('no longer available');
		});

		it('restarts the wait window on every settled harness run', async () => {
			const stub = createManagedSandboxStub();
			const { provider } = createProvider({ sandboxes: [stub], waitTimeoutMs: 60_000 });

			const { sandbox, sandboxRef } = await provider.create();
			await vi.advanceTimersByTimeAsync(45_000);
			await sandbox.runHarness({
				prompt: 'task',
				sessionId: 'session-1',
				env: {},
				abortSignal: new AbortController().signal,
				onEvent: vi.fn(),
			});

			// A fresh window: the 45s that elapsed before the run do not count.
			await vi.advanceTimersByTimeAsync(45_000);
			expect(stub.destroy).not.toHaveBeenCalled();
			await expect(provider.reattach(sandboxRef)).resolves.toBe(sandbox);

			await vi.advanceTimersByTimeAsync(15_000);
			expect(stub.destroy).toHaveBeenCalledTimes(1);
		});
	});
});
