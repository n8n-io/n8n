import type { Region } from '@redocly/openapi-core';

export const REUNITE_URLS: Record<Region, string> = {
  us: 'https://app.cloud.redocly.com',
  eu: 'https://app.cloud.eu.redocly.com',
} as const;

export function getDomain(): string {
  return process.env.REDOCLY_DOMAIN || REUNITE_URLS.us;
}

export function getReuniteUrl(residency?: string) {
  if (!residency) residency = 'us';

  let reuniteUrl: string = REUNITE_URLS[residency as Region];

  if (!reuniteUrl) {
    reuniteUrl = residency;
  }

  const url = new URL('/api', reuniteUrl).toString();
  return url;
}
