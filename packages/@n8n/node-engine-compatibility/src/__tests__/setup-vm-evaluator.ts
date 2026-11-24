import { Expression } from 'n8n-workflow';
import { afterAll, beforeAll } from 'vitest';

beforeAll(async () => {
	await Expression.initExpressionEngine({
		engine: 'vm',
		poolSize: 1,
		maxCodeCacheSize: 1024,
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
	});
});

afterAll(async () => {
	await Expression.disposeExpressionEngine();
});
