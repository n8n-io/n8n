import { getDomain } from '../domains';

describe('getDomain()', () => {
  it('should return the domain from environment variable', () => {
    process.env.REDOCLY_DOMAIN = 'test-domain';

    expect(getDomain()).toBe('test-domain');
  });

  it('should return the default domain if no domain provided', () => {
    process.env.REDOCLY_DOMAIN = '';

    expect(getDomain()).toBe('https://app.cloud.redocly.com');
  });
});
