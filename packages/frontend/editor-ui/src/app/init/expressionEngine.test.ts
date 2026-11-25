import { Expression } from 'n8n-workflow';
import { initializeExpressionEngine } from '@/app/init/expressionEngine';

vi.mock('n8n-workflow', () => ({
	Expression: { initExpressionEngine: vi.fn(), getActiveImplementation: vi.fn(() => 'legacy') },
}));

vi.mock('@n8n/expression-runtime/runtime-bundle.iife.js?raw', () => ({
	default: '/* runtime bundle */',
}));

describe('initializeExpressionEngine', () => {
	beforeEach(() => {
		vi.mocked(Expression.initExpressionEngine).mockClear();
		vi.mocked(Expression.getActiveImplementation).mockReturnValue('legacy');
	});

	it('starts the quickjs engine with the runtime bundle when the setting selects it', async () => {
		await initializeExpressionEngine('quickjs');

		expect(Expression.initExpressionEngine).toHaveBeenCalledWith(
			expect.objectContaining({
				engine: 'quickjs',
				runtimeBundle: '/* runtime bundle */',
				sharedCaller: true,
				lazyAcquire: true,
			}),
		);
	});

	it('leaves the legacy evaluator when the setting selects legacy', async () => {
		await initializeExpressionEngine('legacy');

		expect(Expression.initExpressionEngine).not.toHaveBeenCalled();
	});

	// initializeCore and the login hook both call this on an authenticated boot.
	it('does not reload the engine when quickjs already runs', async () => {
		vi.mocked(Expression.getActiveImplementation).mockReturnValue('quickjs');

		await initializeExpressionEngine('quickjs');

		expect(Expression.initExpressionEngine).not.toHaveBeenCalled();
	});

	it('starts the engine once when a second call comes while the first one runs', async () => {
		let finishStart: () => void = () => {};
		vi.mocked(Expression.initExpressionEngine).mockImplementationOnce(
			async () =>
				await new Promise<void>((resolve) => {
					finishStart = resolve;
				}),
		);

		const first = initializeExpressionEngine('quickjs');
		const second = initializeExpressionEngine('quickjs');
		await vi.waitFor(() => expect(Expression.initExpressionEngine).toHaveBeenCalled());
		finishStart();
		await Promise.all([first, second]);

		expect(Expression.initExpressionEngine).toHaveBeenCalledTimes(1);
	});

	it('starts the engine again after a failed start', async () => {
		vi.mocked(Expression.initExpressionEngine).mockRejectedValueOnce(new Error('no wasm'));
		await expect(initializeExpressionEngine('quickjs')).rejects.toThrow('no wasm');

		await initializeExpressionEngine('quickjs');

		expect(Expression.initExpressionEngine).toHaveBeenCalledTimes(2);
	});

	// An older instance, or one whose settings call failed, sends no engine at all.
	it('leaves the legacy evaluator when the setting is absent', async () => {
		await initializeExpressionEngine(undefined);

		expect(Expression.initExpressionEngine).not.toHaveBeenCalled();
	});
});
