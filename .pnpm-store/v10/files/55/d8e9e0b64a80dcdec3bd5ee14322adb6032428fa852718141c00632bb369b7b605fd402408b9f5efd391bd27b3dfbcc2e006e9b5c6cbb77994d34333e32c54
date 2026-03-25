"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openapi_core_1 = require("@redocly/openapi-core");
const push_1 = require("../../commands/push");
const login_1 = require("../../commands/login");
const config_1 = require("../fixtures/config");
const node_stream_1 = require("node:stream");
// Mock fs operations
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    createReadStream: () => {
        const readable = new node_stream_1.Readable();
        readable.push('test data');
        readable.push(null);
        return readable;
    },
    statSync: () => ({ size: 9 }),
    readFileSync: () => Buffer.from('test data'),
    existsSync: () => false,
    readdirSync: () => [],
}));
openapi_core_1.getMergedConfig.mockImplementation((config) => config);
// Mock OpenAPI core
jest.mock('@redocly/openapi-core');
jest.mock('../../commands/login');
jest.mock('../../utils/miscellaneous');
const mockPromptClientToken = login_1.promptClientToken;
describe('push-with-region', () => {
    const redoclyClient = require('@redocly/openapi-core').__redoclyClient;
    redoclyClient.isAuthorizedWithRedoclyByRegion = jest.fn().mockResolvedValue(false);
    const originalFetch = fetch;
    beforeAll(() => {
        // Mock global fetch
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            headers: new Headers(),
            statusText: 'OK',
            redirected: false,
            type: 'default',
            url: '',
            clone: () => ({}),
            body: new ReadableStream(),
            bodyUsed: false,
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            text: async () => '',
        }));
    });
    afterAll(() => {
        global.fetch = originalFetch;
    });
    beforeEach(() => {
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });
    it('should call login with default domain when region is US', async () => {
        redoclyClient.domain = 'redocly.com';
        await (0, push_1.handlePush)({
            argv: {
                upsert: true,
                api: 'spec.json',
                destination: '@org/my-api@1.0.0',
                branchName: 'test',
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(mockPromptClientToken).toBeCalledTimes(1);
        expect(mockPromptClientToken).toHaveBeenCalledWith(redoclyClient.domain);
    });
    it('should call login with EU domain when region is EU', async () => {
        redoclyClient.domain = 'eu.redocly.com';
        // Update config for EU region
        const euConfig = { ...config_1.ConfigFixture, region: 'eu' };
        await (0, push_1.handlePush)({
            argv: {
                upsert: true,
                api: 'spec.json',
                destination: '@org/my-api@1.0.0',
                branchName: 'test',
            },
            config: euConfig,
            version: 'cli-version',
        });
        expect(mockPromptClientToken).toBeCalledTimes(1);
        expect(mockPromptClientToken).toHaveBeenCalledWith(redoclyClient.domain);
    });
});
