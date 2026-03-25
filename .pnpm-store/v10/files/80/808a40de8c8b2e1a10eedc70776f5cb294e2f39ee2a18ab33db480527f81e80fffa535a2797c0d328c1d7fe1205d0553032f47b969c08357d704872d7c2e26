const DEFAULT_DOMAIN = 'https://app.cloud.redocly.com';

export function getDomain(): string {
  const domain = process.env.REDOCLY_DOMAIN;

  if (domain) {
    return domain;
  }

  return DEFAULT_DOMAIN;
}
