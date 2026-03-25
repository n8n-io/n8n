"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("../pinecone");
const indexHostSingleton_1 = require("../data/indexHostSingleton");
const utils = __importStar(require("../utils"));
const fakeFetch = jest.fn();
const fakeHost = '123-456.pinecone.io';
jest.mock('../utils', () => {
    const realUtils = jest.requireActual('../utils');
    return {
        ...realUtils,
        getFetch: () => fakeFetch,
    };
});
jest.mock('../data/vectors/fetch');
jest.mock('../data/vectors/upsert');
jest.mock('../data/indexHostSingleton');
jest.mock('../control', () => {
    const realControl = jest.requireActual('../control');
    return {
        ...realControl,
        describeIndex: () => jest.fn().mockResolvedValue({
            name: 'fake-index',
            dimension: 1,
            metric: 'cosine',
            host: fakeHost,
            spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            status: { ready: true, state: 'Ready' },
        }),
        deleteIndex: () => jest.fn().mockResolvedValue(undefined),
        listIndexes: () => jest.fn().mockResolvedValue({
            indexes: [
                {
                    name: 'fake-index1',
                    dimension: 1,
                    metric: 'cosine',
                    host: fakeHost,
                    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
                    status: { ready: true, state: 'Ready' },
                },
                {
                    name: 'fake-index2',
                    dimension: 1,
                    metric: 'cosine',
                    host: fakeHost,
                    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
                    status: { ready: true, state: 'Ready' },
                },
                {
                    name: 'fake-index3',
                    dimension: 1,
                    metric: 'cosine',
                    host: fakeHost,
                    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
                    status: { ready: true, state: 'Ready' },
                },
            ],
        }),
    };
});
describe('Pinecone', () => {
    describe('constructor', () => {
        describe('required properties', () => {
            test('should throw an error if apiKey is not provided', () => {
                expect(() => {
                    new pinecone_1.Pinecone({});
                }).toThrow('The client configuration must have required property: apiKey. You can find the configuration values for' +
                    ' your project in the Pinecone developer console at https://app.pinecone.io.');
            });
            test('should throw an error if apiKey is blank', () => {
                expect(() => {
                    const config = {
                        apiKey: '',
                    };
                    new pinecone_1.Pinecone(config);
                }).toThrow('The client configuration must have required property: apiKey. You can find the configuration values for' +
                    ' your project in the Pinecone developer console at https://app.pinecone.io.');
            });
        });
        describe('unknown properties', () => {
            test('should throw an error if unknown property provided', () => {
                expect(() => {
                    new pinecone_1.Pinecone({
                        apiKey: 'test-key',
                        unknownProp: 'banana',
                    });
                }).toThrow('Object contained invalid properties: unknownProp. Valid properties include apiKey, controllerHostUrl,' +
                    ' fetchApi, additionalHeaders, sourceTag, maxRetries.');
            });
        });
        describe('optional properties', () => {
            test('should not throw when optional properties provided: fetchAPI, controllerHostUrl, sourceTag', () => {
                expect(() => {
                    new pinecone_1.Pinecone({
                        apiKey: 'test-key',
                        fetchApi: utils.getFetch({}),
                        controllerHostUrl: 'https://foo-bar.io',
                        sourceTag: 'test-tag-123',
                    });
                }).not.toThrow();
            });
        });
        describe('configuration with environment variables', () => {
            beforeEach(() => {
                delete process.env.PINECONE_API_KEY;
            });
            test('should read required properties from environment variables if no config object provided', () => {
                process.env.PINECONE_API_KEY = 'test-api';
                const client = new pinecone_1.Pinecone();
                expect(client).toBeDefined();
                expect(client.getConfig().apiKey).toEqual('test-api');
            });
            test('config object should take precedence when both config object and environment variables are provided', () => {
                process.env.PINECONE_API_KEY = 'test';
                const client = new pinecone_1.Pinecone({
                    apiKey: 'test2',
                });
                expect(client).toBeDefined();
                expect(client.getConfig().apiKey).toEqual('test2');
            });
            test('should throw an error if required environment variable is not set', () => {
                expect(() => new pinecone_1.Pinecone()).toThrow("Since you called 'new Pinecone()' with no configuration object, we attempted to find client configuration in environment variables but the required environment variables were not set. Missing variables: PINECONE_API_KEY. You can find the configuration values for your project in the Pinecone developer console at https://app.pinecone.io");
            });
        });
        test('should log a warning if the SDK is used in a browser context', () => {
            // Mock window simulate browser context
            const mockWindow = {};
            global.window = mockWindow;
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => null);
            new pinecone_1.Pinecone({ apiKey: 'test-api-key' });
            expect(warnSpy).toHaveBeenCalledWith('The Pinecone SDK is intended for server-side use only. Using the SDK within a browser context can expose your API key(s). If you have deployed the SDK to production in a browser, please rotate your API keys.');
            // Clean up: remove the mock window object
            // @ts-ignore
            delete global.window;
        });
    });
    describe('typescript: generic types for index metadata', () => {
        test('passes generic types from index()', async () => {
            const p = new pinecone_1.Pinecone({ apiKey: 'foo' });
            const i = p.index('product-embeddings');
            const result = await i.fetch(['1']);
            if (result && result.records) {
                // No ts error
                console.log(result.records['1'].metadata?.color);
                // @ts-expect-error because colour not in ProductMetadata
                console.log(result.records['1'].metadata.colour);
            }
            // No ts errors when passing ProductMetadata
            await i.upsert([
                {
                    id: 'party-shirt',
                    values: [0.1, 0.1, 0.1],
                    metadata: { color: 'black', description: 'sexy black dress' },
                },
            ]);
            await i.upsert([
                {
                    id: 'pink-shirt',
                    values: [0.1, 0.1, 0.1],
                    // @ts-expect-error becuase 'pink' not a valid value for ProductMeta color field
                    metadata: { color: 'pink', description: 'pink shirt' },
                },
            ]);
        });
    });
    describe('control plane operations', () => {
        test('describeIndex triggers calling IndexHostSingleton._set', async () => {
            const p = new pinecone_1.Pinecone({ apiKey: 'foo' });
            await p.describeIndex('test-index');
            expect(indexHostSingleton_1.IndexHostSingleton._set).toHaveBeenCalledWith({ apiKey: 'foo' }, 'test-index', fakeHost);
        });
        test('listIndexes triggers calling IndexHostSingleton._set', async () => {
            const p = new pinecone_1.Pinecone({ apiKey: 'foo' });
            await p.listIndexes();
            expect(indexHostSingleton_1.IndexHostSingleton._set).toHaveBeenNthCalledWith(1, { apiKey: 'foo' }, 'fake-index1', fakeHost);
            expect(indexHostSingleton_1.IndexHostSingleton._set).toHaveBeenNthCalledWith(2, { apiKey: 'foo' }, 'fake-index2', fakeHost);
            expect(indexHostSingleton_1.IndexHostSingleton._set).toHaveBeenNthCalledWith(3, { apiKey: 'foo' }, 'fake-index3', fakeHost);
        });
        test('deleteIndex trigger calling IndexHostSingleton._delete', async () => {
            const p = new pinecone_1.Pinecone({ apiKey: 'foo' });
            await p.deleteIndex('test-index');
            expect(indexHostSingleton_1.IndexHostSingleton._delete).toHaveBeenCalledWith({ apiKey: 'foo' }, 'test-index');
        });
    });
});
//# sourceMappingURL=pinecone.test.js.map