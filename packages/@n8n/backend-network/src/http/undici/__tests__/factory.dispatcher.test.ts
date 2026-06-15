import { Agent, EnvHttpProxyAgent, ProxyAgent } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../../ssrf';
import { OutboundHttpFactory } from '../factory';

// `getDispatcher()` proxy routing. SSRF is disabled in the proxy-class
// assertions so we inspect the concrete underlying dispatcher: with SSRF
// enabled `getDispatcher()` returns an undici `ComposedDispatcher` wrapper and
// the `instanceof` checks would not see the proxy class.

function makeFactory(): OutboundHttpFactory {
	return new OutboundHttpFactory(mock<SsrfProtectionService>());
}

describe('getDispatcher proxy routing', () => {
	it('defaults to env-based proxy (EnvHttpProxyAgent dispatcher)', () => {
		const dispatcher = makeFactory().create({ ssrf: 'disabled' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('proxy: false → plain undici Agent', () => {
		const dispatcher = makeFactory().create({ proxy: false, ssrf: 'disabled' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(ProxyAgent);
	});

	it('proxy: env → EnvHttpProxyAgent', () => {
		const dispatcher = makeFactory().create({ proxy: 'env', ssrf: 'disabled' }).getDispatcher();

		expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('proxy: explicit URL → ProxyAgent', () => {
		const dispatcher = makeFactory()
			.create({ proxy: 'http://proxy.internal:3128', ssrf: 'disabled' })
			.getDispatcher();

		expect(dispatcher).toBeInstanceOf(ProxyAgent);
		expect(dispatcher).not.toBeInstanceOf(Agent);
		expect(dispatcher).not.toBeInstanceOf(EnvHttpProxyAgent);
	});

	it('returns the same dispatcher instance on repeated calls', () => {
		const client = makeFactory().create();

		expect(client.getDispatcher()).toBe(client.getDispatcher());
	});
});
