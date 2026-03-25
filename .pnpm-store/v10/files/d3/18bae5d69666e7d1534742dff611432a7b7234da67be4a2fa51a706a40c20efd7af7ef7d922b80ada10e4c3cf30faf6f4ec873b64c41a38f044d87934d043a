import * as fs from 'fs';
import { Config, getMergedConfig } from '@redocly/openapi-core';
import { exitWithError } from '../../utils/miscellaneous';
import { getApiRoot, getDestinationProps, handlePush, transformPush } from '../../commands/push';
import { ConfigFixture } from '../fixtures/config';
import { yellow } from 'colorette';
import { Readable } from 'node:stream';

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(() => {
    const readable = new Readable();
    readable.push('test data');
    readable.push(null);
    return readable;
  }),
  statSync: jest.fn(() => ({ isDirectory: () => false, size: 10 })),
  readFileSync: jest.fn(() => Buffer.from('test data')),
  existsSync: jest.fn(() => false),
  readdirSync: jest.fn(() => []),
}));

jest.mock('@redocly/openapi-core');
jest.mock('../../utils/miscellaneous');

// Mock fetch
const mockFetch = jest.fn(() =>
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
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => '',
  } as Response)
);

const originalFetch = global.fetch;

(getMergedConfig as jest.Mock).mockImplementation((config) => config);

describe('push', () => {
  const redoclyClient = require('@redocly/openapi-core').__redoclyClient;

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('pushes definition', async () => {
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(redoclyClient.registryApi.prepareFileUpload).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      branch: 'test',
      filePaths: ['filePath'],
      isUpsert: true,
      isPublic: true,
      name: 'my-api',
      organizationId: 'org',
      rootFilePath: 'filePath',
      version: '1.0.0',
      batchId: '123',
      batchSize: 2,
    });
  });

  it('fails if jobId value is an empty string', async () => {
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': ' ',
        'batch-size': 2,
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(exitWithError).toBeCalledTimes(1);
  });

  it('fails if batchSize value is less than 2', async () => {
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 1,
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(exitWithError).toBeCalledTimes(1);
  });

  it('push with --files', async () => {
    const mockConfig = { ...ConfigFixture, files: ['./resouces/1.md', './resouces/2.md'] } as any;

    (fs.statSync as jest.Mock).mockImplementation(() => {
      return { isDirectory: () => false, size: 10 };
    });

    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: '@org/my-api@1.0.0',
        public: true,
        files: ['./resouces/1.md', './resouces/2.md'],
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      filePaths: ['filePath', 'filePath', 'filePath'],
      isUpsert: true,
      isPublic: true,
      name: 'my-api',
      organizationId: 'org',
      rootFilePath: 'filePath',
      version: '1.0.0',
    });
    expect(redoclyClient.registryApi.prepareFileUpload).toBeCalledTimes(3);
  });

  it('push should fail if organization not provided', async () => {
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: 'test@v1',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(exitWithError).toBeCalledTimes(1);
    expect(exitWithError).toBeCalledWith(
      `No organization provided, please use --organization option or specify the 'organization' field in the config file.`
    );
  });

  it('push should work with organization in config', async () => {
    const mockConfig = { ...ConfigFixture, organization: 'test_org' } as any;
    await handlePush({
      argv: {
        upsert: true,
        api: 'spec.json',
        destination: 'my-api@1.0.0',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
    expect(redoclyClient.registryApi.pushApi).toHaveBeenLastCalledWith({
      branch: 'test',
      filePaths: ['filePath'],
      isUpsert: true,
      isPublic: true,
      name: 'my-api',
      organizationId: 'test_org',
      rootFilePath: 'filePath',
      version: '1.0.0',
      batchId: '123',
      batchSize: 2,
    });
  });

  it('push should work if destination not provided but api in config is provided', async () => {
    const mockConfig = {
      ...ConfigFixture,
      organization: 'test_org',
      apis: { 'my-api@1.0.0': { root: 'path' } },
    } as any;

    await handlePush({
      argv: {
        upsert: true,
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
  });

  it('push should fail if apis not provided', async () => {
    const mockConfig = { organization: 'test_org', apis: {} } as any;

    await handlePush({
      argv: {
        upsert: true,
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(exitWithError).toBeCalledTimes(1);
    expect(exitWithError).toHaveBeenLastCalledWith(
      'Api not found. Please make sure you have provided the correct data in the config file.'
    );
  });

  it('push should fail if destination not provided', async () => {
    const mockConfig = { organization: 'test_org', apis: {} } as any;

    await handlePush({
      argv: {
        upsert: true,
        api: 'api.yaml',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(exitWithError).toBeCalledTimes(1);
    expect(exitWithError).toHaveBeenLastCalledWith(
      'No destination provided, please use --destination option to provide destination.'
    );
  });

  it('push should fail if destination format is not valid', async () => {
    const mockConfig = { organization: 'test_org', apis: {} } as any;

    await handlePush({
      argv: {
        upsert: true,
        destination: 'name/v1',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      `Destination argument value is not valid, please use the right format: ${yellow(
        '<api-name@api-version>'
      )}.`
    );
  });

  it('push should work and encode name with spaces', async () => {
    const encodeURIComponentSpy = jest.spyOn(global, 'encodeURIComponent');

    const mockConfig = {
      ...ConfigFixture,
      organization: 'test_org',
      apis: { 'my test api@v1': { root: 'path' } },
    } as any;

    await handlePush({
      argv: {
        upsert: true,
        destination: 'my test api@v1',
        branchName: 'test',
        public: true,
        'job-id': '123',
        'batch-size': 2,
      },
      config: mockConfig,
      version: 'cli-version',
    });

    expect(encodeURIComponentSpy).toHaveReturnedWith('my%20test%20api');
    expect(redoclyClient.registryApi.pushApi).toBeCalledTimes(1);
  });
});

describe('transformPush', () => {
  it('should adapt the existing syntax', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        apis: ['openapi.yaml', '@testing_org/main@v1'],
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        api: 'openapi.yaml',
        destination: '@testing_org/main@v1',
      },
      config: {},
      version: 'cli-version',
    });
  });
  it('should adapt the existing syntax (including branchName)', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        apis: ['openapi.yaml', '@testing_org/main@v1', 'other'],
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        api: 'openapi.yaml',
        destination: '@testing_org/main@v1',
        branchName: 'other',
      },
      config: {},
      version: 'cli-version',
    });
  });
  it('should use --branch option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        apis: ['openapi.yaml', '@testing_org/main@v1', 'other'],
        branch: 'priority-branch',
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        api: 'openapi.yaml',
        destination: '@testing_org/main@v1',
        branchName: 'priority-branch',
      },
      config: {},
      version: 'cli-version',
    });
  });
  it('should work for a destination only', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        apis: ['main@v1'],
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        destination: 'main@v1',
      },
      config: {},
      version: 'cli-version',
    });
  });
  it('should work for a api only', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        apis: ['test.yaml'],
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        api: 'test.yaml',
      },
      config: {},
      version: 'cli-version',
    });
  });

  it('should use destination from option', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        apis: ['test.yaml', 'test@v1'],
        destination: 'main@v1',
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        destination: 'main@v1',
        api: 'test.yaml',
      },
      config: {},
      version: 'cli-version',
    });
  });

  it('should use --job-id option firstly', () => {
    const cb = jest.fn();
    transformPush(cb)({
      argv: {
        'batch-id': 'b-123',
        'job-id': 'j-123',
        apis: ['test'],
        branch: 'test',
        destination: 'main@v1',
      },
      config: {} as any,
      version: 'cli-version',
    });
    expect(cb).toBeCalledWith({
      argv: {
        'job-id': 'j-123',
        api: 'test',
        branchName: 'test',
        destination: 'main@v1',
      },
      config: {},
      version: 'cli-version',
    });
  });
  it('should accept no arguments at all', () => {
    const cb = jest.fn();
    transformPush(cb)({ argv: {}, config: {} as any, version: 'cli-version' });
    expect(cb).toBeCalledWith({ argv: {}, config: {}, version: 'cli-version' });
  });
});

describe('getDestinationProps', () => {
  it('should get valid destination props for the full destination syntax', () => {
    expect(getDestinationProps('@testing_org/main@v1', 'org-from-config')).toEqual({
      organizationId: 'testing_org',
      name: 'main',
      version: 'v1',
    });
  });
  it('should fallback the organizationId from a config for the short destination syntax', () => {
    expect(getDestinationProps('main@v1', 'org-from-config')).toEqual({
      organizationId: 'org-from-config',
      name: 'main',
      version: 'v1',
    });
  });
  it('should fallback the organizationId from a config if no destination provided', () => {
    expect(getDestinationProps(undefined, 'org-from-config')).toEqual({
      organizationId: 'org-from-config',
    });
  });
  it('should return empty organizationId if there is no one found', () => {
    expect(getDestinationProps('main@v1', undefined)).toEqual({
      organizationId: undefined,
      name: 'main',
      version: 'v1',
    });
  });
  it('should return organizationId from destination string', () => {
    expect(getDestinationProps('@test-org/main@main-v1', undefined)).toEqual({
      organizationId: 'test-org',
      name: 'main',
      version: 'main-v1',
    });
  });

  it('should return organizationId, version and empty name from destination string', () => {
    expect(getDestinationProps('@test_org/@main_v1', undefined)).toEqual({
      organizationId: 'test_org',
      name: '',
      version: 'main_v1',
    });
  });

  it('should validate organizationId with space and version with dot', () => {
    expect(getDestinationProps('@test org/simple_name@main.v1', undefined)).toEqual({
      organizationId: 'test org',
      name: 'simple_name',
      version: 'main.v1',
    });
  });

  it('should not work with "@" in destination name', () => {
    expect(getDestinationProps('@test org/simple@name@main.v1', undefined)).toEqual({
      organizationId: undefined,
      name: undefined,
      version: undefined,
    });
  });
});

describe('getApiRoot', () => {
  let config: Config = {
    apis: {
      'main@v1': {
        root: 'openapi.yaml',
      },
      main: {
        root: 'latest.yaml',
      },
    },
  } as unknown as Config;
  it('should resolve the correct api for a valid name & version', () => {
    expect(getApiRoot({ name: 'main', version: 'v1', config })).toEqual('openapi.yaml');
  });
  it('should resolve the latest version of api if there is no matching version', () => {
    expect(getApiRoot({ name: 'main', version: 'latest', config })).toEqual('latest.yaml');
  });
});
