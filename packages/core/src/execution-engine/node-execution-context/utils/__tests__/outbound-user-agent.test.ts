import {
	buildDefaultN8nOutboundUserAgent,
	getDefaultN8nOutboundUserAgent,
} from '../outbound-user-agent';

describe('outbound-user-agent', () => {
	it('buildDefaultN8nOutboundUserAgent uses a conventional product token', () => {
		expect(buildDefaultN8nOutboundUserAgent('1.2.3')).toBe(
			'Mozilla/5.0 (compatible; n8n/1.2.3; +https://n8n.io/)',
		);
	});

	it('getDefaultN8nOutboundUserAgent returns a non-empty string', () => {
		const ua = getDefaultN8nOutboundUserAgent();
		expect(ua).toMatch(/^Mozilla\/5\.0 \(compatible; n8n\/.+; \+https:\/\/n8n\.io\/\)$/);
	});

	it('getDefaultN8nOutboundUserAgent falls back to 0.0.0 when package.json cannot be read', () => {
		let ua: string | undefined;
		jest.isolateModules(() => {
			jest.mock('../../../../../package.json', () => {
				throw new Error('Module not found');
			});
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const mod = require('../outbound-user-agent') as typeof import('../outbound-user-agent');
			ua = mod.getDefaultN8nOutboundUserAgent();
		});
		expect(ua).toBe('Mozilla/5.0 (compatible; n8n/0.0.0; +https://n8n.io/)');
	});
});
