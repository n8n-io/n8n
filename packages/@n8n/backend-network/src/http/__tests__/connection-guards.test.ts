import type { HttpsProxyAgent } from 'https-proxy-agent';
import type http from 'node:http';

import { makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { installProxyConnectionGuard } from '../connection-guards';

type ConnectOpts = Parameters<HttpsProxyAgent<string>['connect']>[1];

describe('installProxyConnectionGuard', () => {
	function guarded(connectOpts: { host?: string | null; hostname?: string | null }) {
		const connect = vi.fn().mockResolvedValue('SOCKET');
		const agent = { connectOpts, connect };
		return { agent, connect };
	}

	it.each([
		['host', { host: 'proxy.internal' }],
		['hostname', { hostname: 'proxy.internal' }],
	])(
		'reads the proxy host from `%s` and delegates when the policy allows it',
		async (_label, connectOpts) => {
			const bridge = makeSsrfBridge();
			const { agent, connect } = guarded(connectOpts);
			installProxyConnectionGuard(agent, bridge);
			const req = {} as http.ClientRequest;
			const opts = {} as ConnectOpts;

			await expect(agent.connect(req, opts)).resolves.toBe('SOCKET');

			expect(bridge.validateConnectionHost).toHaveBeenCalledWith('proxy.internal');
			expect(connect).toHaveBeenCalledWith(req, opts);
		},
	);

	it('rejects the connection when the policy denies the proxy host', async () => {
		const error = new Error('blocked');
		const bridge = makeSsrfBridge({
			validateConnectionHost: vi.fn().mockReturnValue({ ok: false, error }),
		});
		const { agent, connect } = guarded({ host: '169.254.169.254' });
		installProxyConnectionGuard(agent, bridge);

		await expect(agent.connect({} as http.ClientRequest, {} as ConnectOpts)).rejects.toBe(error);

		expect(connect).not.toHaveBeenCalled();
	});

	it('validates the proxy host on every connection, not once at installation', async () => {
		const bridge = makeSsrfBridge();
		const { agent } = guarded({ host: 'proxy.internal' });
		installProxyConnectionGuard(agent, bridge);

		await agent.connect({} as http.ClientRequest, {} as ConnectOpts);
		agent.connectOpts.host = 'other-proxy.internal';
		await agent.connect({} as http.ClientRequest, {} as ConnectOpts);

		expect(bridge.validateConnectionHost).toHaveBeenNthCalledWith(1, 'proxy.internal');
		expect(bridge.validateConnectionHost).toHaveBeenNthCalledWith(2, 'other-proxy.internal');
	});

	it.each([
		['missing', {}],
		['null', { host: null, hostname: null }],
		['empty', { host: '' }],
		['empty while `hostname` is set', { host: '', hostname: 'proxy.internal' }],
	])('rejects the connection when the proxy host is %s', async (_label, connectOpts) => {
		const bridge = makeSsrfBridge();
		const { agent, connect } = guarded(connectOpts);
		installProxyConnectionGuard(agent, bridge);

		await expect(agent.connect({} as http.ClientRequest, {} as ConnectOpts)).rejects.toThrow(
			'Cannot determine the host for this connection',
		);

		expect(connect).not.toHaveBeenCalled();
		expect(bridge.validateConnectionHost).not.toHaveBeenCalled();
	});
});
