import fc from 'fast-check';

import {
	normaliseInstanceAddress,
	type InstanceAddressError,
	type InstanceAddressOptions,
} from '../instance-address';

const ERRORS: InstanceAddressError[] = [
	'empty',
	'invalid',
	'unsupported-protocol',
	'insecure-http',
	'has-credentials',
];

const optionsArb: fc.Arbitrary<InstanceAddressOptions> = fc.record(
	{ allowInsecureHttp: fc.boolean() },
	{ requiredKeys: [] },
);

const hostArb = fc.oneof(
	fc.mixedCase(fc.domain()),
	fc.ipV4(),
	fc.ipV6().map((ip) => `[${ip}]`),
	fc.mixedCase(fc.constant('localhost')),
	fc.constant('[::1]'),
);

const pathArb = fc.oneof(
	fc.constant(''),
	fc.constant('/'),
	fc.webPath(),
	fc
		.tuple(fc.webPath(), fc.webQueryParameters(), fc.webFragments())
		.map(([path, query, hash]) => `${path}?${query}#${hash}`),
);

// Addresses in the forms that users paste: with or without a scheme, port, path, query and hash.
const composedAddressArb = fc
	.tuple(
		fc.mixedCase(fc.constantFrom('', 'http://', 'https://')),
		hostArb,
		fc.option(fc.integer({ min: 1, max: 65535 }), { nil: undefined }),
		pathArb,
	)
	.map(
		([scheme, host, port, path]) =>
			`${scheme}${host}${port === undefined ? '' : `:${port}`}${path}`,
	);

const addressArb = fc.oneof(
	composedAddressArb,
	fc.webUrl({ validSchemes: ['http', 'https'], withQueryParameters: true, withFragments: true }),
);

const anyInputArb = fc.oneof(
	fc.string({ unit: 'binary' }),
	addressArb,
	fc
		.tuple(
			fc.constantFrom('http://', 'https://', 'javascript:', 'ftp://', '//', '[', 'user:pw@'),
			fc.string({ unit: 'binary' }),
		)
		.map(([prefix, rest]) => `${prefix}${rest}`),
);

describe('normaliseInstanceAddress properties', () => {
	it('accepts most generated addresses, so the other properties are not vacuous', () => {
		const accepted = fc
			.sample(addressArb, { numRuns: 300, seed: 42 })
			.filter((address) => normaliseInstanceAddress(address, { allowInsecureHttp: true }).ok);

		expect(accepted.length).toBeGreaterThan(150);
	});

	it('is idempotent: normalising the origin again gives the same result', () => {
		fc.assert(
			fc.property(addressArb, optionsArb, (address, options) => {
				const first = normaliseInstanceAddress(address, options);
				if (!first.ok) return;

				expect(normaliseInstanceAddress(first.origin, options)).toEqual(first);
			}),
			{ numRuns: 500 },
		);
	});

	it('never keeps a path, query, hash or trailing slash in the origin', () => {
		fc.assert(
			fc.property(addressArb, (address) => {
				const result = normaliseInstanceAddress(address, { allowInsecureHttp: true });
				if (!result.ok) return;

				const parsed = new URL(result.origin);
				expect(parsed.pathname).toBe('/');
				expect(parsed.search).toBe('');
				expect(parsed.hash).toBe('');
				expect(result.origin).toBe(parsed.origin);
				expect(result.origin).not.toMatch(/[/?#]$/);
				expect(result.origin.slice(result.origin.indexOf('://') + 3)).not.toMatch(/[/?#]/);
				expect(result.host).toBe(result.host.toLowerCase());
			}),
			{ numRuns: 500 },
		);
	});

	it('never throws and always returns a known shape for any string', () => {
		fc.assert(
			fc.property(anyInputArb, optionsArb, (input, options) => {
				const result = normaliseInstanceAddress(input, options);

				if (result.ok) {
					expect(result.origin).toMatch(/^https?:\/\//);
				} else {
					expect(ERRORS).toContain(result.error);
				}
			}),
			{ numRuns: 1000 },
		);
	});

	it('builds an MCP URL that starts with the origin and ends with the MCP path', () => {
		fc.assert(
			fc.property(addressArb, optionsArb, (address, options) => {
				const result = normaliseInstanceAddress(address, options);
				if (!result.ok) return;

				expect(result.mcpUrl.startsWith(result.origin)).toBe(true);
				expect(result.mcpUrl.endsWith('/mcp-server/http')).toBe(true);
				expect(result.mcpUrl).toBe(`${result.origin}/mcp-server/http`);
			}),
			{ numRuns: 500 },
		);
	});

	it('accepts plain HTTP without the option only for loopback hosts', () => {
		fc.assert(
			fc.property(addressArb, (address) => {
				const result = normaliseInstanceAddress(address);
				if (!result.ok) return;

				expect(result.origin.startsWith('https://') || result.isLoopback).toBe(true);
			}),
			{ numRuns: 500 },
		);
	});
});
