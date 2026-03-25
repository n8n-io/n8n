import type { Region } from '../config/types';

let redoclyDomain = 'redocly.com';

export const DEFAULT_REGION = 'us';

export const DOMAINS = getDomains();
export const AVAILABLE_REGIONS = Object.keys(DOMAINS) as Region[];

export function getDomains() {
  const domains: { [region in Region]: string } = {
    us: 'redocly.com',
    eu: 'eu.redocly.com',
  };

  // FIXME: temporary fix for our lab environments
  const domain = redoclyDomain;
  if (domain?.endsWith('.redocly.host')) {
    domains[domain.split('.')[0] as Region] = domain;
  }
  if (domain === 'redoc.online') {
    domains[domain as Region] = domain;
  }
  return domains;
}

export function setRedoclyDomain(domain: string) {
  redoclyDomain = domain;
}

export function getRedoclyDomain(): string {
  return redoclyDomain;
}

export function isRedoclyRegistryURL(link: string): boolean {
  const domain = getRedoclyDomain() || DOMAINS[DEFAULT_REGION];

  const legacyDomain = domain === 'redocly.com' ? 'redoc.ly' : domain;

  if (
    !link.startsWith(`https://api.${domain}/registry/`) &&
    !link.startsWith(`https://api.${legacyDomain}/registry/`)
  ) {
    return false;
  }

  return true;
}
