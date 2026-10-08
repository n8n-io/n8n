import fc from 'fast-check';

import { checkInstanceAddress, type InstanceAddressError } from '../linkFormValidation';

// Arbitraries from the server tests (cli linked-instances/__tests__/instance-address.property.test.ts).

const ERRORS: InstanceAddressError[] = [
	'empty',
	'invalid',
	'unsupported-protocol',
	'insecure-http',
	'has-credentials',
];

const hostArb = fc.oneof(
	fc.mixedCase(fc.domain()),
	fc.ipV4(),
	fc.ipV6().map((ip) => `[${ip}]`),
	fc.mixedCase(fc.constant('localhost')),
	fc.constant('[::1]'),
);

const loopbackHostArb = fc.oneof(
	fc.mixedCase(fc.constant('localhost')),
	fc.constant('[::1]'),
	fc
		.tuple(fc.nat(255), fc.nat(255), fc.nat(255))
		.map(([second, third, fourth]) => `127.${second}.${third}.${fourth}`),
);

const portArb = fc.option(fc.integer({ min: 1, max: 65535 }), { nil: undefined });
const withPort = (host: string, port: number | undefined) =>
	port === undefined ? host : `${host}:${port}`;

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
	.tuple(fc.mixedCase(fc.constantFrom('', 'http://', 'https://')), hostArb, portArb, pathArb)
	.map(([scheme, host, port, path]) => `${scheme}${withPort(host, port)}${path}`);

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

// A scheme in the URL grammar that is not http or https, in any letter case.
const otherSchemeArb = fc
	.stringMatching(/^[a-z][a-z0-9+.-]{0,11}$/)
	.filter((scheme) => !['http', 'https'].includes(scheme))
	.chain((scheme) => fc.mixedCase(fc.constant(scheme)));

describe('checkInstanceAddress properties', () => {
	it('accepts most generated https addresses, so the other properties are not vacuous', () => {
		const https = fc
			.sample(composedAddressArb, { numRuns: 300, seed: 42 })
			.map((address) => address.replace(/^http:\/\//i, 'https://'));
		const accepted = https.filter((address) => checkInstanceAddress(address).ok);

		expect(accepted.length).toBeGreaterThan(150);
	});

	it('never throws and always returns a known shape for any string', () => {
		fc.assert(
			fc.property(anyInputArb, (input) => {
				const result = checkInstanceAddress(input);

				if (result.ok) {
					expect(result.origin).toMatch(/^https?:\/\//);
				} else {
					expect(ERRORS).toContain(result.error);
				}
			}),
			{ numRuns: 1000 },
		);
	});

	it('is idempotent: checking the origin again gives the same result', () => {
		fc.assert(
			fc.property(addressArb, (address) => {
				const first = checkInstanceAddress(address);
				if (!first.ok) return;

				expect(checkInstanceAddress(first.origin)).toEqual(first);
			}),
			{ numRuns: 500 },
		);
	});

	it('never keeps a path, query, hash or trailing slash in the origin', () => {
		fc.assert(
			fc.property(addressArb, (address) => {
				const result = checkInstanceAddress(address);
				if (!result.ok) return;

				const parsed = new URL(result.origin);
				expect(parsed.pathname).toBe('/');
				expect(parsed.search).toBe('');
				expect(parsed.hash).toBe('');
				expect(result.origin).toBe(parsed.origin);
				expect(result.origin.slice(result.origin.indexOf('://') + 3)).not.toMatch(/[/?#]/);
			}),
			{ numRuns: 500 },
		);
	});

	it('accepts plain HTTP only for loopback hosts', () => {
		fc.assert(
			fc.property(anyInputArb, (input) => {
				const result = checkInstanceAddress(input);
				if (!result.ok) return;

				expect(result.origin.startsWith('https://') || result.isLoopback).toBe(true);
			}),
			{ numRuns: 1000 },
		);
	});

	describe('scheme rules of the server', () => {
		it('rejects every address with a scheme other than http or https', () => {
			fc.assert(
				fc.property(otherSchemeArb, fc.string({ unit: 'binary' }), (scheme, rest) => {
					const result = checkInstanceAddress(`${scheme}://${rest}`);

					// "invalid" when the rest does not parse, else the scheme is the reason.
					expect(result.ok).toBe(false);
					expect(['unsupported-protocol', 'invalid']).toContain(!result.ok && result.error);
				}),
				{ numRuns: 1000 },
			);
		});

		it('names the scheme as the reason for a well-formed address with another scheme', () => {
			fc.assert(
				fc.property(otherSchemeArb, fc.domain(), pathArb, (scheme, host, path) => {
					expect(checkInstanceAddress(`${scheme}://${host}${path}`)).toEqual({
						ok: false,
						error: 'unsupported-protocol',
					});
				}),
				{ numRuns: 500 },
			);
		});

		it('rejects plain HTTP for every host that is not on this computer', () => {
			fc.assert(
				fc.property(
					fc.mixedCase(fc.domain()).filter((host) => host.toLowerCase() !== 'localhost'),
					portArb,
					pathArb,
					(host, port, path) => {
						const result = checkInstanceAddress(`http://${withPort(host, port)}${path}`);

						expect(result).toEqual({ ok: false, error: 'insecure-http' });
					},
				),
				{ numRuns: 500 },
			);
		});

		it('accepts plain HTTP for every host on this computer', () => {
			fc.assert(
				fc.property(loopbackHostArb, portArb, pathArb, (host, port, path) => {
					const result = checkInstanceAddress(`http://${withPort(host, port)}${path}`);

					expect(result.ok && result.isLoopback).toBe(true);
					expect(result.ok && result.origin.startsWith('http://')).toBe(true);
				}),
				{ numRuns: 500 },
			);
		});

		it('adds https:// to a host without a scheme', () => {
			fc.assert(
				fc.property(fc.domain(), portArb, (host, port) => {
					const result = checkInstanceAddress(withPort(host, port));

					expect(result.ok && result.origin.startsWith('https://')).toBe(true);
				}),
				{ numRuns: 500 },
			);
		});

		it('rejects credentials in the address for every scheme form', () => {
			fc.assert(
				fc.property(
					fc.constantFrom('', 'https://', 'http://'),
					fc.stringMatching(/^[a-z0-9]{1,8}$/),
					fc.option(fc.stringMatching(/^[a-z0-9]{1,8}$/), { nil: undefined }),
					fc.domain(),
					(scheme, user, password, host) => {
						const userInfo = password === undefined ? user : `${user}:${password}`;
						const result = checkInstanceAddress(`${scheme}${userInfo}@${host}`);

						expect(result).toEqual({ ok: false, error: 'has-credentials' });
					},
				),
				{ numRuns: 500 },
			);
		});
	});
});
