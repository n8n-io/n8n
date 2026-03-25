"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abort_controller_1 = require("abort-controller");
const fetch_with_timeout_1 = require("../utils/fetch-with-timeout");
const openapi_core_1 = require("@redocly/openapi-core");
const https_proxy_agent_1 = require("https-proxy-agent");
jest.mock('@redocly/openapi-core');
const signalInstance = new abort_controller_1.default().signal;
const mockFetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    headers: new Headers(),
    statusText: 'OK',
    redirected: false,
    type: 'default',
    url: '',
    clone: () => ({}),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => '',
    signal: signalInstance,
    dispatcher: undefined,
}));
const originalFetch = global.fetch;
global.fetch = mockFetch;
describe('fetchWithTimeout', () => {
    beforeAll(() => {
        // @ts-ignore
        global.setTimeout = jest.fn();
        global.clearTimeout = jest.fn();
    });
    beforeEach(() => {
        openapi_core_1.getProxyAgent.mockReturnValueOnce(undefined);
    });
    afterAll(() => {
        global.fetch = originalFetch;
    });
    it('should call fetch with signal', async () => {
        await (0, fetch_with_timeout_1.default)('url', { timeout: 1000 });
        expect(global.setTimeout).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('url', expect.objectContaining({
            signal: expect.any(AbortSignal),
            dispatcher: undefined,
        }));
        expect(global.clearTimeout).toHaveBeenCalledTimes(1);
    });
    it('should call fetch with proxy agent', async () => {
        openapi_core_1.getProxyAgent.mockRestore();
        const proxyAgent = new https_proxy_agent_1.HttpsProxyAgent('http://localhost');
        openapi_core_1.getProxyAgent.mockReturnValueOnce(proxyAgent);
        await (0, fetch_with_timeout_1.default)('url');
        expect(global.fetch).toHaveBeenCalledWith('url', { dispatcher: proxyAgent });
    });
    it('should call fetch without signal when timeout is not passed', async () => {
        await (0, fetch_with_timeout_1.default)('url');
        expect(global.setTimeout).not.toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('url', { agent: undefined });
        expect(global.clearTimeout).not.toHaveBeenCalled();
    });
});
