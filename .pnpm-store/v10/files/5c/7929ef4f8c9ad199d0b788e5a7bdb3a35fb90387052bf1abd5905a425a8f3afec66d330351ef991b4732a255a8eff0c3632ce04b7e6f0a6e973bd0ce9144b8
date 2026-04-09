import { getDomain } from '../domains';
import { getReuniteUrl } from '../domains';

import type { Region } from '@redocly/openapi-core';

describe('getDomain()', () => {
  afterEach(() => {
    delete process.env.REDOCLY_DOMAIN;
  });

  it('should return the domain from environment variable', () => {
    process.env.REDOCLY_DOMAIN = 'test-domain';

    expect(getDomain()).toBe('test-domain');
  });

  it('should return the default domain if no domain provided', () => {
    process.env.REDOCLY_DOMAIN = '';

    expect(getDomain()).toBe('https://app.cloud.redocly.com');
  });
});

describe('getReuniteUrl()', () => {
  it('should return US API URL when US region specified', () => {
    expect(getReuniteUrl('us')).toBe('https://app.cloud.redocly.com/api');
  });

  it('should return EU API URL when EU region specified', () => {
    expect(getReuniteUrl('eu')).toBe('https://app.cloud.eu.redocly.com/api');
  });

  it('should return custom domain API URL when custom domain specified', () => {
    const customDomain = 'https://custom.domain.com';
    expect(getReuniteUrl(customDomain as Region)).toBe('https://custom.domain.com/api');
  });

  it('should return US API URL when no region specified', () => {
    expect(getReuniteUrl()).toBe('https://app.cloud.redocly.com/api');
  });
});
