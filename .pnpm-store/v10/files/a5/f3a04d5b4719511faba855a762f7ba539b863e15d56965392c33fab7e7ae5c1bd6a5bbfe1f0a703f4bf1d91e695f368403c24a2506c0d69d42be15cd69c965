"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assistantHostSingleton_1 = require("../../assistantHostSingleton");
const mockDescribeAsst = jest.fn();
const mockAsstOperationsBuilder = jest.fn();
jest.mock('../../control', () => {
    const realControl = jest.requireActual('../../control');
    return {
        ...realControl,
        describeAssistant: () => mockDescribeAsst,
        assistantOperationsBuilder: (config) => mockAsstOperationsBuilder(config),
    };
});
describe('AssistantHostSingleton', () => {
    afterEach(() => {
        assistantHostSingleton_1.AssistantHostSingleton._reset();
        mockDescribeAsst.mockReset();
        mockAsstOperationsBuilder.mockReset();
    });
    test('returns default host URL when no region is set', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        const hostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
    });
    test('returns correct host URL for US region', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        const hostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
    });
    test('returns correct host URL for EU region', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', 'https://prod-eu-data.ke.pinecone.io');
        const hostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl).toEqual('https://prod-eu-data.ke.pinecone.io/assistant');
    });
    test('caches host URL per apiKey and assistantName combination', async () => {
        const pineconeConfig1 = { apiKey: 'test-key-1' };
        const pineconeConfig2 = { apiKey: 'test-key-2' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig1, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig2, 'assistant-1', 'https://prod-eu-data.ke.pinecone.io');
        const hostUrl1 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig1, 'assistant-1');
        const hostUrl2 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig2, 'assistant-1');
        expect(hostUrl1).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
        expect(hostUrl2).toEqual('https://prod-eu-data.ke.pinecone.io/assistant');
    });
    test('_delete removes cached host URL', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        let hostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
        assistantHostSingleton_1.AssistantHostSingleton._delete(pineconeConfig, 'assistant-1');
        hostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
    });
    test('_reset clears all cached host URLs', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-2', 'https://prod-eu-data.ke.pinecone.io');
        assistantHostSingleton_1.AssistantHostSingleton._reset();
        const hostUrl1 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        const hostUrl2 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-2');
        expect(hostUrl1).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
        expect(hostUrl2).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
    });
    test('_set does not cache empty hostUrl values', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', '');
        const hostUrl = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
    });
    test('returns same host URL instance for same apiKey and assistantName combination', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        const hostUrl1 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        const hostUrl2 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        expect(hostUrl1).toBe(hostUrl2); // Using .toBe() to check instance equality
        expect(hostUrl1).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
    });
    test('creates different host URL instances for different apiKeys', async () => {
        const pineconeConfig1 = { apiKey: 'test-key-1' };
        const pineconeConfig2 = { apiKey: 'test-key-2' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig1, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig2, 'assistant-1', 'https://prod-eu-data.ke.pinecone.io');
        const hostUrl1 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig1, 'assistant-1');
        const hostUrl2 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig2, 'assistant-1');
        expect(hostUrl1).not.toBe(hostUrl2);
        expect(hostUrl1).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
        expect(hostUrl2).toEqual('https://prod-eu-data.ke.pinecone.io/assistant');
    });
    test('creates different host URL instances for different assistant names', async () => {
        const pineconeConfig = { apiKey: 'test-key' };
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-1', 'https://prod-1-data.ke.pinecone.io');
        assistantHostSingleton_1.AssistantHostSingleton._set(pineconeConfig, 'assistant-2', 'https://prod-eu-data.ke.pinecone.io');
        const hostUrl1 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-1');
        const hostUrl2 = await assistantHostSingleton_1.AssistantHostSingleton.getHostUrl(pineconeConfig, 'assistant-2');
        expect(hostUrl1).not.toBe(hostUrl2);
        expect(hostUrl1).toEqual('https://prod-1-data.ke.pinecone.io/assistant');
        expect(hostUrl2).toEqual('https://prod-eu-data.ke.pinecone.io/assistant');
    });
});
//# sourceMappingURL=assistantHostSingleton.test.js.map