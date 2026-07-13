import type { Logger } from '@n8n/backend-common';
import { Agent, EnvHttpProxyAgent, ProxyAgent } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import { OutboundHttp } from '../outbound-http';

// `getDispatcher()` proxy routing. SSRF is disabled in the proxy-class
// assertions so we inspect the concrete underlying dispatcher: with SSRF
// enabled `getDispatcher()` returns an undici `ComposedDispatcher` wrapper and
// the `instanceof` checks would not see the proxy class.

function makeTransport(options?: Parameters<OutboundHttp['transport']>[0]) {
	return new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()).transport(options);
}

describe('transport getDispatcher proxy routing', () => {
	it('defaults to env-based proxy (EnvHttpProxyAgent dispatcher)', () => {
		const dispatcher = makeTransport({ ssrf: 'disabled' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('proxy: false → plain undici Agent', () => {
		const dispatcher = makeTransport({ proxy: false, ssrf: 'disabled' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(ProxyAgent);
	});

	it('proxy: env → EnvHttpProxyAgent', () => {
		const dispatcher = makeTransport({ proxy: 'env', ssrf: 'disabled' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('proxy: explicit URL → ProxyAgent', () => {
		const dispatcher = makeTransport({
			proxy: 'http://proxy.internal:3128',
			ssrf: 'disabled',
		}).getDispatcher();

		expect(dispatcher).toBeInstanceOf(ProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('returns the same dispatcher instance on repeated calls', () => {
		const transport = makeTransport();

		expect(transport.getDispatcher()).toBe(transport.getDispatcher());
	});
});
