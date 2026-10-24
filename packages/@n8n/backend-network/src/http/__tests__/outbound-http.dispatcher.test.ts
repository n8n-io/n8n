import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionConfig } from '@n8n/config';
import { Agent, ProxyAgent } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import { OutboundHttp } from '../outbound-http';

// `getDispatcher()` proxy routing. SSRF is disabled in the proxy-class
// assertions so we inspect the concrete underlying dispatcher: with SSRF
// enabled `getDispatcher()` returns an undici `ComposedDispatcher` wrapper and
// the `instanceof` checks would not see the proxy class.

function makeTransport(options?: Parameters<OutboundHttp['transport']>[0]) {
	return new OutboundHttp(
		mock<SsrfProtectionService>(),
		mock<SsrfProtectionConfig>({ enabled: true }),
		mock<Logger>(),
	).transport(options);
}

describe('transport getDispatcher proxy routing', () => {
	it('defaults to env-based proxy (Agent that picks a ProxyAgent per request)', () => {
		const dispatcher = makeTransport({ useDefaultSsrfPolicy: 'unsafe' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(Agent);
	});

	it('proxy: false → plain undici Agent', () => {
		const dispatcher = makeTransport({
			proxy: false,
			useDefaultSsrfPolicy: 'unsafe',
		}).getDispatcher();

		expect(dispatcher).toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(ProxyAgent);
	});

	it('proxy: env → Agent that picks a ProxyAgent per request', () => {
		const dispatcher = makeTransport({
			proxy: 'env',
			useDefaultSsrfPolicy: 'unsafe',
		}).getDispatcher();

		expect(dispatcher).toBeInstanceOf(Agent);
	});

	it('proxy: explicit URL → ProxyAgent', () => {
		const dispatcher = makeTransport({
			proxy: 'http://proxy.internal:3128',
			useDefaultSsrfPolicy: 'unsafe',
		}).getDispatcher();

		expect(dispatcher).toBeInstanceOf(ProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(Agent);
	});

	it('returns the same dispatcher instance on repeated calls', () => {
		const transport = makeTransport();

		expect(transport.getDispatcher()).toBe(transport.getDispatcher());
	});
});
