import type { ProtectedResource } from '../contracts';
import { extractBearer, inboundFrom } from '../inbound';
import type { Inbound, Verified } from '../pipeline';

const resourceUrl = 'https://n8n.example/mcp-server/http';

const resource: ProtectedResource = {
	id: 'instance-mcp',
	surface: 'instance-mcp',
	scopes: [],
	getResourceUrl: () => resourceUrl,
	getAudiences: () => [resourceUrl, 'legacy-audience'],
	authorize: async () => true,
};

const request: Inbound['request'] = {
	method: 'POST',
	url: '/mcp-server/http',
	headers: {},
	ip: '203.0.113.7',
};

const inboundWith = (headers: Inbound['request']['headers']): Inbound => ({
	surface: 'instance-mcp',
	resource: { url: resourceUrl, acceptedAudiences: [resourceUrl] },
	request: { ...request, headers },
	receivedAt: new Date('2026-09-30T10:00:00Z'),
});

describe('inboundFrom', () => {
	it('takes surface and the resource ref from the resource, never from the caller', () => {
		const inbound = inboundFrom(resource, request);

		expect(inbound.surface).toBe('instance-mcp');
		expect(inbound.resource).toEqual({
			url: resourceUrl,
			acceptedAudiences: [resourceUrl, 'legacy-audience'],
		});
		expect(inbound.request).toBe(request);
		expect(inbound.receivedAt).toBeInstanceOf(Date);
	});

	it('leaves acceptedSourceIds unset when the resource does not narrow the surface', () => {
		expect(inboundFrom(resource, request).acceptedSourceIds).toBeUndefined();
	});

	it('takes acceptedSourceIds from the resource when it narrows the surface', () => {
		const narrowed: ProtectedResource = {
			...resource,
			surface: 'trigger',
			getAcceptedSourceIds: () => ['source-a'],
		};

		const inbound = inboundFrom(narrowed, request);

		expect(inbound.surface).toBe('trigger');
		expect(inbound.acceptedSourceIds).toEqual(['source-a']);
	});
});

describe('extractBearer', () => {
	it('returns Extracted with the bearer credential for a valid Authorization header', () => {
		const inbound = inboundWith({ authorization: 'Bearer abc.def.ghi' });

		const result = extractBearer(inbound);

		expect(result).toEqual({
			ok: true,
			value: { ...inbound, credential: { kind: 'bearer', token: 'abc.def.ghi' } },
		});
	});

	it('accepts the scheme case-insensitively, as RFC 9110 requires', () => {
		const result = extractBearer(inboundWith({ authorization: 'bearer abc' }));

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value.credential.token).toBe('abc');
	});

	it('uses the first value when the header arrives as an array', () => {
		const result = extractBearer(inboundWith({ authorization: ['Bearer first', 'Bearer second'] }));

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value.credential.token).toBe('first');
	});

	it('rejects with no-credential when there is no Authorization header', () => {
		expect(extractBearer(inboundWith({}))).toEqual({ ok: false, reason: 'no-credential' });
	});

	it.each([
		['a non-bearer scheme', 'Basic dXNlcjpwYXNz'],
		['a bearer scheme without a token', 'Bearer'],
		['a bearer scheme with an empty token', 'Bearer   '],
	])('rejects with malformed-credential for %s', (_label, authorization) => {
		expect(extractBearer(inboundWith({ authorization }))).toMatchObject({
			ok: false,
			reason: 'malformed-credential',
		});
	});
});

describe('Verified', () => {
	it('has no field that can hold the token', () => {
		type HoldsCredential = 'credential' extends keyof Verified ? true : false;
		type HoldsToken = 'token' extends keyof Verified ? true : false;

		// Assigning `false` fails to compile if either key exists on the type.
		const holdsCredential: HoldsCredential = false;
		const holdsToken: HoldsToken = false;

		expect(holdsCredential).toBe(false);
		expect(holdsToken).toBe(false);
	});
});
