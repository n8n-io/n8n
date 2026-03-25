import AbortController from 'abort-controller';
import fetchWithTimeout from '../utils/fetch-with-timeout';
import { getProxyAgent } from '@redocly/openapi-core';
import { HttpsProxyAgent } from 'https-proxy-agent';

jest.mock('@redocly/openapi-core');

const signalInstance = new AbortController().signal;

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
    signal: signalInstance,
    dispatcher: undefined,
  } as Response)
);

const originalFetch = global.fetch;
global.fetch = mockFetch;

describe('fetchWithTimeout', () => {
  beforeAll(() => {
    // @ts-ignore
    global.setTimeout = jest.fn();
    global.clearTimeout = jest.fn();
  });

  beforeEach(() => {
    (getProxyAgent as jest.Mock).mockReturnValueOnce(undefined);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should call fetch with signal', async () => {
    await fetchWithTimeout('url', { timeout: 1000 });

    expect(global.setTimeout).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'url',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        dispatcher: undefined,
      })
    );
    expect(global.clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('should call fetch with proxy agent', async () => {
    (getProxyAgent as jest.Mock).mockRestore();
    const proxyAgent = new HttpsProxyAgent('http://localhost');
    (getProxyAgent as jest.Mock).mockReturnValueOnce(proxyAgent);

    await fetchWithTimeout('url');

    expect(global.fetch).toHaveBeenCalledWith('url', { dispatcher: proxyAgent });
  });

  it('should call fetch without signal when timeout is not passed', async () => {
    await fetchWithTimeout('url');

    expect(global.setTimeout).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('url', { agent: undefined });
    expect(global.clearTimeout).not.toHaveBeenCalled();
  });
});
