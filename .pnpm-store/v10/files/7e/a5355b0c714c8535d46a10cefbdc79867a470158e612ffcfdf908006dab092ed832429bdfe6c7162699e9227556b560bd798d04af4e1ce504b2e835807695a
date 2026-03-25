import { getApiKeys } from '../api-keys';
import * as fs from 'fs';

describe('getApiKeys()', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return api key from environment variable', () => {
    process.env.REDOCLY_AUTHORIZATION = 'test-api-key';

    expect(getApiKeys('test-domain')).toEqual('test-api-key');
  });

  it('should return api key from credentials file', () => {
    process.env.REDOCLY_AUTHORIZATION = '';

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        ['test-domain']: 'test-api-key-from-credentials-file',
      })
    );

    expect(getApiKeys('test-domain')).toEqual('test-api-key-from-credentials-file');
  });

  it('should throw an error if no api key provided', () => {
    process.env.REDOCLY_AUTHORIZATION = '';

    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => getApiKeys('test-domain')).toThrowError(
      'No api key provided, please use environment variable REDOCLY_AUTHORIZATION.'
    );
  });
});
