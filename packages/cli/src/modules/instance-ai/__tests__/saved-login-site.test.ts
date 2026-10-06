import { cookieReachesSite, isOnSite, siteOf } from '../browser/saved-login-site';

describe('saved login sites', () => {
	it('is the exact host, without "www."', () => {
		expect(siteOf('https://ledgerly.example.com/settings')).toBe('ledgerly.example.com');
		expect(siteOf('https://n8n.example.com/')).toBe('n8n.example.com');
		expect(siteOf('https://www.example.com/a')).toBe('example.com');
		expect(siteOf('.Example.com')).toBe('example.com');
	});

	it('is undefined for pages that are not on a public domain', () => {
		expect(siteOf('about:blank')).toBeUndefined();
		expect(siteOf('http://localhost:5678/')).toBeUndefined();
		expect(siteOf(undefined)).toBeUndefined();
	});

	it('treats other hosts on the same domain as other sites', () => {
		const site = 'ledgerly.example.com';
		expect(isOnSite('ledgerly.example.com', site)).toBe(true);
		expect(isOnSite('n8n.example.com', site)).toBe(false);
		expect(isOnSite('example.com', site)).toBe(false);
		expect(isOnSite('www.example.com', 'example.com')).toBe(true);
	});

	it('keeps the cookies the browser sends to the site', () => {
		const site = 'ledgerly.example.com';
		expect(cookieReachesSite('ledgerly.example.com', site)).toBe(true);
		expect(cookieReachesSite('.example.com', site)).toBe(true);
		expect(cookieReachesSite('n8n.example.com', site)).toBe(false);
		expect(cookieReachesSite('.dev', site)).toBe(false);
		expect(cookieReachesSite('www.example.com', 'example.com')).toBe(true);
		expect(cookieReachesSite('.google.com', site)).toBe(false);
	});
});
