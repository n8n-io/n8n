import { getMergedConfig } from '@redocly/openapi-core';
import { handlePush } from '../../commands/push';
import { promptClientToken } from '../../commands/login';
import { ConfigFixture } from '../fixtures/config';
import { Readable } from 'node:stream';

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: () => {
    const readable = new Readable();
    readable.push('test data');
    readable.push(null);
    return readable;
  },
  statSync: () => ({ size: 9 }),
  readFileSync: () => Buffer.from('test data'),
  existsSync: () => false,
  readdirSync: () => [],
}));

(getMergedConfig as jest.Mock).mockImplementation((config) => config);

// Mock OpenAPI core
jest.mock('@redocly/openapi-core');
jest.mock('../../commands/login');
jest.mock('../../utils/miscellaneous');

const mockPromptClientToken = promptClientToken as jest.MockedFunction<typeof promptClientToken>;

describe('push-with-region', () => {
  const redoclyClient = require('@redocly/openapi-core').__redoclyClient;
  redoclyClient.isAuthorizedWithRedoclyByRegion = jest.fn().mockResolvedValue(false);

  const originalFetch = fetch;

  beforeAll(() => {
    // Mock global fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
        statusText: 'OK',
        redirected: false,
        type: 'default',
        url: '',
        clone: () => ({} as Response),
        body: new ReadableStream(),
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        text: async () => '',
      } as Response)
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('should call login with default domain when region is US', async () => {
    redoclyClient.domain = 'redocly.com';
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(mockPromptClientToken).toBeCalledTimes(1);
    expect(mockPromptClientToken).toHaveBeenCalledWith(redoclyClient.domain);
  });

  it('should call login with EU domain when region is EU', async () => {
    redoclyClient.domain = 'eu.redocly.com';
    // Update config for EU region
    const euConfig = { ...ConfigFixture, region: 'eu' };

    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
      },
      config: euConfig as any,
      version: 'cli-version',
    });

    expect(mockPromptClientToken).toBeCalledTimes(1);
    expect(mockPromptClientToken).toHaveBeenCalledWith(redoclyClient.domain);
  });
});
