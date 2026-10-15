import {
	N8N_PROXY_FEATURES,
	X_N8N_FEATURE_HEADER,
	X_N8N_VERSION_HEADER,
	X_N8N_RUN_ID_HEADER,
	X_N8N_THREAD_ID_HEADER,
	buildProxyHeaders,
} from '../constants/proxy-feature';

describe('buildProxyHeaders', () => {
	it('should build both header fields for every registered feature', () => {
		for (const feature of N8N_PROXY_FEATURES) {
			const headers = buildProxyHeaders({ feature, n8nVersion: '1.2.3' });
			expect(headers[X_N8N_FEATURE_HEADER]).toBe(feature);
			expect(headers[X_N8N_VERSION_HEADER]).toBe('1.2.3');
		}
	});

	it('should return exactly the two expected keys', () => {
		const headers = buildProxyHeaders({ feature: 'instance-ai', n8nVersion: '1.2.3' });
		expect(Object.keys(headers).sort()).toEqual(
			[X_N8N_FEATURE_HEADER, X_N8N_VERSION_HEADER].sort(),
		);
	});

	it('should include run and thread id headers only when provided', () => {
		const headers = buildProxyHeaders({
			feature: 'instance-ai',
			n8nVersion: '1.2.3',
			runId: 'run-1',
			threadId: 'thread-1',
		});
		expect(headers[X_N8N_RUN_ID_HEADER]).toBe('run-1');
		expect(headers[X_N8N_THREAD_ID_HEADER]).toBe('thread-1');

		const withRunOnly = buildProxyHeaders({
			feature: 'instance-ai',
			n8nVersion: '1.2.3',
			runId: 'run-1',
		});
		expect(withRunOnly[X_N8N_RUN_ID_HEADER]).toBe('run-1');
		expect(withRunOnly).not.toHaveProperty(X_N8N_THREAD_ID_HEADER);
	});
});
