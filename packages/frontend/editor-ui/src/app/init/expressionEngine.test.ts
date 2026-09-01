import type { N8nEnvFeatFlags } from '@n8n/api-types';
import { Expression } from 'n8n-workflow';
import { initializeExpressionEngine } from '@/app/init/expressionEngine';

vi.mock('n8n-workflow', () => ({
	Expression: { initExpressionEngine: vi.fn() },
}));

vi.mock('@n8n/expression-runtime/runtime-bundle.iife.js?raw', () => ({
	default: '/* runtime bundle */',
}));

const flags = (value?: string) => ({ N8N_ENV_FEAT_EXPRESSION_ENGINE: value }) as N8nEnvFeatFlags;

describe('initializeExpressionEngine', () => {
	beforeEach(() => {
		vi.mocked(Expression.initExpressionEngine).mockClear();
	});

	it('starts the quickjs engine with the runtime bundle when the flag selects it', async () => {
		await initializeExpressionEngine(flags('quickjs'));

		expect(Expression.initExpressionEngine).toHaveBeenCalledWith(
			expect.objectContaining({ engine: 'quickjs', runtimeBundle: '/* runtime bundle */' }),
		);
	});

	it.each([undefined, 'legacy', 'vm'])('leaves the legacy evaluator for %s', async (value) => {
		await initializeExpressionEngine(flags(value));

		expect(Expression.initExpressionEngine).not.toHaveBeenCalled();
	});

	it('leaves the legacy evaluator when no flags are provided', async () => {
		await initializeExpressionEngine(undefined);

		expect(Expression.initExpressionEngine).not.toHaveBeenCalled();
	});
});
