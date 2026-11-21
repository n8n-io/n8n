import {
	isSavedLoginAllowed,
	registrableDomainOf,
	toSavedLoginSite,
} from '../browser/cloud-browser-saved-login-policy';

describe('cloud browser saved login policy', () => {
	describe('isSavedLoginAllowed', () => {
		it.each([
			{ mode: 'off' as const, sites: [], domain: 'example.com', allowed: false },
			{ mode: 'off' as const, sites: ['example.com'], domain: 'example.com', allowed: false },
			{ mode: 'all' as const, sites: [], domain: 'example.com', allowed: true },
			{ mode: 'only' as const, sites: ['example.com'], domain: 'example.com', allowed: true },
			{ mode: 'only' as const, sites: ['example.com'], domain: 'github.com', allowed: false },
			{ mode: 'only' as const, sites: [], domain: 'example.com', allowed: false },
			{ mode: 'except' as const, sites: ['example.com'], domain: 'example.com', allowed: false },
			{ mode: 'except' as const, sites: ['example.com'], domain: 'github.com', allowed: true },
			{ mode: 'except' as const, sites: [], domain: 'example.com', allowed: true },
		])(
			'returns $allowed for $domain in $mode mode with sites $sites',
			({ mode, sites, domain, allowed }) => {
				expect(isSavedLoginAllowed({ mode, sites }, domain)).toBe(allowed);
			},
		);
	});

	describe('registrableDomainOf', () => {
		it.each([
			['example.com', 'example.com'],
			['accounts.linkedin.com', 'linkedin.com'],
			['www.example.co.uk', 'example.co.uk'],
		])('returns the registrable domain of %s', async (host, domain) => {
			expect(await registrableDomainOf(host)).toBe(domain);
		});

		it.each([undefined, '', '127.0.0.1', '::1', 'localhost'])(
			'returns nothing for %s',
			async (host) => {
				expect(await registrableDomainOf(host)).toBeUndefined();
			},
		);
	});

	describe('toSavedLoginSite', () => {
		it.each([
			['github.com', 'github.com'],
			['https://www.github.com/login', 'github.com'],
			['  GitHub.COM  ', 'github.com'],
			['accounts.linkedin.com', 'linkedin.com'],
			['http://example.com:8080/path?q=1', 'example.com'],
		])('reads %s as %s', async (site, domain) => {
			expect(await toSavedLoginSite(site)).toBe(domain);
		});

		it.each(['localhost', '127.0.0.1', 'not a site', 'https://', 'com'])(
			'returns nothing for %s',
			async (site) => {
				expect(await toSavedLoginSite(site)).toBeUndefined();
			},
		);
	});
});
