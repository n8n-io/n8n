import { get as pslGet } from 'psl';

/**
 * PROTOTYPE (saved logins): the site a saved login is for, from a URL or host. A site is one
 * host, lowercased and without a leading "www.", e.g.
 * `ledgerly.example.com`. Not the registrable domain: unrelated apps
 * often share one (`n8n.example.com` and `ledgerly.example.com`, or
 * two tenants of one SaaS). Undefined for anything that is not a web page on a public
 * domain (about:blank, localhost, IPs).
 */
export function siteOf(urlOrHost: string | undefined): string | undefined {
	if (!urlOrHost) return undefined;
	let host = urlOrHost;
	try {
		const url = new URL(urlOrHost);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
		host = url.hostname;
	} catch {
		// Already a host.
	}
	const bare = host.replace(/^\./, '').toLowerCase();
	if (!pslGet(bare)) return undefined;
	return bare.replace(/^www\./, '');
}

/** Whether a host is the site, with or without "www.". */
export function isOnSite(host: string, site: string): boolean {
	return siteOf(host) === site;
}

/**
 * Whether the browser sends cookies with this domain to the site: the site's own host
 * (with or without "www."), or a parent domain of it such as `.example.com`. A public
 * suffix like `.dev` is never one, since browsers refuse cookies on it.
 */
export function cookieReachesSite(cookieDomain: string, site: string): boolean {
	const domain = cookieDomain.replace(/^\./, '').toLowerCase();
	return [site, `www.${site}`].some(
		(host) => host === domain || (host.endsWith(`.${domain}`) && pslGet(domain) !== null),
	);
}
