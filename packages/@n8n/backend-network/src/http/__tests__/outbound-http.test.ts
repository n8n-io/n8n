import type { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { fetch as undiciFetch } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import { makeLookupFn } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { OutboundHttp } from '../outbound-http';

// Core facade wiring. `undiciFetch` is stubbed so no real network call is made
// and the SSRF dispatcher interceptor never runs here
vi.mock('undici', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const mod = (await importOriginal()) as Record<string, unknown>;
	return {
		...mod,
		fetch: vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: async () => 'ok',
		}),
	};
});

function makeFacade(): OutboundHttp {
	const service = mock<SsrfProtectionService>();
	vi.mocked(service.createSecureLookup).mockReturnValue(makeLookupFn());
	vi.mocked(service.validateUrl).mockResolvedValue({ ok: true, result: undefined });
	return new OutboundHttp(service, mock<Logger>());
}

describe('DI registration', () => {
	it('should be resolvable from the container', () => {
		expect(Container.get(OutboundHttp)).toBeInstanceOf(OutboundHttp);
	});
});

describe('transport asCustomFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('dispatches through the same guarded dispatcher returned by getDispatcher() when SSRF is enabled', async () => {
		const transport = makeFacade().transport({ proxy: false });
		const fetchFn = transport.asCustomFetch();

		await fetchFn('https://api.example.com/data');

		const [, calledInit] = vi.mocked(undiciFetch).mock.calls[0] as [
			unknown,
			{ dispatcher: unknown },
		];
		expect(calledInit.dispatcher).toBe(transport.getDispatcher());
	});

	it('dispatches through the bare dispatcher returned by getDispatcher() when SSRF is disabled', async () => {
		const transport = makeFacade().transport({ proxy: false, ssrf: 'disabled' });
		const fetchFn = transport.asCustomFetch();

		await fetchFn('https://api.example.com/data');

		const [, calledInit] = vi.mocked(undiciFetch).mock.calls[0] as [
			unknown,
			{ dispatcher: unknown },
		];
		expect(calledInit.dispatcher).toBe(transport.getDispatcher());
	});

	it('forwards the input unchanged to undiciFetch', async () => {
		const fetchFn = makeFacade().transport().asCustomFetch();
		const url = new URL('https://api.example.com/data');

		await fetchFn(url);

		const [calledInput] = vi.mocked(undiciFetch).mock.calls[0];
		expect(calledInput).toBe(url);
	});

	it('passes init options through to undiciFetch', async () => {
		const fetchFn = makeFacade().transport().asCustomFetch();
		const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

		await fetchFn('https://api.example.com/data', init);

		const [, calledInit] = vi.mocked(undiciFetch).mock.calls[0] as [
			unknown,
			Record<string, unknown>,
		];
		expect(calledInit).toMatchObject({ method: 'POST' });
	});

	it('returns a new function on each call (fresh closure)', () => {
		const transport = makeFacade().transport();

		expect(transport.asCustomFetch()).not.toBe(transport.asCustomFetch());
	});
});
