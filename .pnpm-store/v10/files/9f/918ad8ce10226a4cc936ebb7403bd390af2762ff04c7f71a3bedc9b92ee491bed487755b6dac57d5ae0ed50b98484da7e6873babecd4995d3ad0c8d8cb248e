import { ConfigFixture } from './../../__tests__/fixtures/config';
import { firstDocument, secondDocument, thirdDocument } from '../documents';

import type { Document } from '@redocly/openapi-core';

export const __redoclyClient = {
  isAuthorizedWithRedocly: jest.fn().mockResolvedValue(true),
  isAuthorizedWithRedoclyByRegion: jest.fn().mockResolvedValue(true),
  login: jest.fn(),
  registryApi: {
    setAccessTokens: jest.fn(),
    authStatus: jest.fn(),
    prepareFileUpload: jest.fn().mockResolvedValue({
      signedUploadUrl: 'signedUploadUrl',
      filePath: 'filePath',
    }),
    pushApi: jest.fn(),
  },
};

export const RedoclyClient = jest.fn(() => __redoclyClient);
export const loadConfig = jest.fn(() => ConfigFixture);
export const getMergedConfig = jest.fn();
export const getProxyAgent = jest.fn();
export const lint = jest.fn();
export const bundle = jest.fn(() => ({ bundle: { parsed: null }, problems: null }));
export const getTotals = jest.fn(() => ({ errors: 0 }));
export const formatProblems = jest.fn();
export const slash = jest.fn();
export const findConfig = jest.fn();
export const doesYamlFileExist = jest.fn();
export const bundleDocument = jest.fn(() => Promise.resolve({ problems: {} }));
export const detectSpec = jest.fn();
export const isAbsoluteUrl = jest.fn();
export const stringifyYaml = jest.fn((data) => data);

export class BaseResolver {
  cache = new Map<string, Promise<Document | ResolveError>>();

  getFiles = jest.fn();
  resolveExternalRef = jest.fn();
  loadExternalRef = jest.fn;
  parseDocument = jest.fn();
  resolveDocument = jest
    .fn()
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: firstDocument })
    )
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: secondDocument })
    )
    .mockImplementationOnce(() =>
      Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: thirdDocument })
    );
}

export class ResolveError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    Object.setPrototypeOf(this, ResolveError.prototype);
  }
}

export class YamlParseError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    Object.setPrototypeOf(this, YamlParseError.prototype);
  }
}

export enum SpecVersion {
  OAS2 = 'oas2',
  OAS3_0 = 'oas3_0',
  OAS3_1 = 'oas3_1',
  Async2 = 'async2',
  Async3 = 'async3',
}

export enum Oas3Operations {
  get = 'get',
  put = 'put',
  post = 'post',
  delete = 'delete',
  options = 'options',
  head = 'head',
  patch = 'patch',
  trace = 'trace',
}
