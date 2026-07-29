import {
	N8N_PROXY_FEATURES,
	X_N8N_FEATURE_HEADER,
	X_N8N_VERSION_HEADER,
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
});
