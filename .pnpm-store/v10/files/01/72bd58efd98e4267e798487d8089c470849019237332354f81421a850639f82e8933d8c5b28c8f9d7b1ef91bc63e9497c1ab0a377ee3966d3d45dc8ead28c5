import { RedoclyClient } from '../../index';
import { setRedoclyDomain, getRedoclyDomain, getDomains, AVAILABLE_REGIONS } from '../domains';

describe('domains', () => {
  const REDOCLY_DOMAIN_US = 'redocly.com';
  const TEST_DOMAIN = 'redoclyDomain.com';
  const TEST_LAB_DOMAIN = 'lab.redocly.host';
  const TEST_REDOC_ONLINE_DOMAIN = 'redoc.online';

  afterEach(() => {
    delete process.env.REDOCLY_DOMAIN;
    setRedoclyDomain('');
  });

  it('should resolve the US domain by default', () => {
    expect(getRedoclyDomain()).toBe(REDOCLY_DOMAIN_US);
  });

  it('should resolve the US and EU regions by default', () => {
    expect(AVAILABLE_REGIONS).toStrictEqual(['us', 'eu']);
  });

  it('should resolve the specified domain if used with setter', () => {
    setRedoclyDomain(TEST_DOMAIN);
    expect(getRedoclyDomain()).toBe(TEST_DOMAIN);
  });

  it('should resolve the specified domain provided in environmental variable, after initializing RedoclyClient', () => {
    process.env.REDOCLY_DOMAIN = TEST_DOMAIN;
    const client = new RedoclyClient();
    expect(getRedoclyDomain()).toBe(TEST_DOMAIN);
    expect(client.domain).toBe(TEST_DOMAIN);
  });

  it('should return correct object when redocly domain is set to lab env', () => {
    setRedoclyDomain(TEST_LAB_DOMAIN);
    const domains = getDomains();
    expect(domains).toEqual({ us: 'redocly.com', eu: 'eu.redocly.com', lab: 'lab.redocly.host' });
    expect(getRedoclyDomain()).toBe(TEST_LAB_DOMAIN);
  });

  it('should return correct object when redocly domain is set to redoc.online env', () => {
    setRedoclyDomain(TEST_REDOC_ONLINE_DOMAIN);
    const domains = getDomains();
    expect(domains).toEqual({
      us: 'redocly.com',
      eu: 'eu.redocly.com',
      'redoc.online': 'redoc.online',
    });
    expect(getRedoclyDomain()).toBe(TEST_REDOC_ONLINE_DOMAIN);
  });
});
