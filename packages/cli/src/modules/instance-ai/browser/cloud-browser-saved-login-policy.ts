import type { InstanceAiSavedLoginsMode } from '@n8n/api-types';
import { isIP } from 'node:net';

/** The admin's rules for saved cloud browser logins. */
export interface SavedLoginPolicy {
	mode: InstanceAiSavedLoginsMode;
	/** Registrable domains, for example "github.com". */
	sites: string[];
}

/** Whether the user can save, and n8n Assistant can reuse, a login for this registrable domain. */
export function isSavedLoginAllowed(policy: SavedLoginPolicy, domain: string): boolean {
	switch (policy.mode) {
		case 'off':
			return false;
		case 'all':
			return true;
		case 'only':
			return policy.sites.includes(domain);
		case 'except':
			return !policy.sites.includes(domain);
	}
}

/**
 * The registrable domain of a host, for example "linkedin.com" for "accounts.linkedin.com".
 * Nothing for an IP address or a host without one, such as "localhost".
 */
export async function registrableDomainOf(host: string | undefined): Promise<string | undefined> {
	if (!host || isIP(host)) return undefined;
	const { get: getRegistrableDomain } = await import('psl');
	return getRegistrableDomain(host) ?? undefined;
}

/**
 * The registrable domain of a site the admin entered as a domain or a URL, for example
 * "github.com" for "https://www.github.com/login". Nothing when it has none.
 */
export async function toSavedLoginSite(site: string): Promise<string | undefined> {
	const value = site.trim().toLowerCase();
	try {
		const { hostname } = new URL(value.includes('://') ? value : `https://${value}`);
		return await registrableDomainOf(hostname);
	} catch {
		return undefined;
	}
}
