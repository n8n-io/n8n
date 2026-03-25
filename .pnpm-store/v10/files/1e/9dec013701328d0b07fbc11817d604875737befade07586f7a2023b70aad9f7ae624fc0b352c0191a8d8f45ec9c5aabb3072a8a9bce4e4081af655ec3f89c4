"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uploadFile_1 = require("../uploadFile");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mockFetch = jest.fn();
jest.mock('fs');
jest.mock('path');
jest.mock('../../../utils', () => ({
    getFetch: () => mockFetch,
    buildUserAgent: () => 'TestUserAgent',
}));
const buildMockFetchResponse = (isSuccess, status, body) => mockFetch.mockResolvedValue({
    ok: isSuccess ? true : false,
    status: status,
    json: async () => JSON.parse(body),
});
describe('uploadFileInternal', () => {
    const mockConfig = {
        apiKey: 'test-api-key',
        additionalHeaders: {
            'Custom-Header': 'test',
        },
    };
    const mockAssistantName = 'test-assistant';
    const mockFileContent = Buffer.from('test file content');
    const mockResponse = {
        data: {
            name: 'test.txt',
            id: 'test-id',
            createdOn: new Date().toISOString(),
            updatedOn: new Date().toISOString(),
            status: 'ready',
        },
    };
    const mockApiProvider = {
        provideHostUrl: async () => 'https://prod-1-data.ke.pinecone.io/assistant',
    };
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        fs_1.default.readFileSync.mockResolvedValue(mockFileContent);
        path_1.default.basename.mockReturnValue('test.txt');
    });
    test('throws error when file path is not provided', async () => {
        const upload = (0, uploadFile_1.uploadFile)(mockAssistantName, mockApiProvider, mockConfig);
        await expect(upload({ path: '' })).rejects.toThrow('You must pass an object with required properties (`path`) to upload a file.');
    });
    test('correctly builds URL without metadata', async () => {
        buildMockFetchResponse(true, 200, JSON.stringify(mockResponse));
        const upload = (0, uploadFile_1.uploadFile)(mockAssistantName, mockApiProvider, mockConfig);
        await upload({ path: 'test.txt' });
        expect(mockFetch).toHaveBeenCalledWith('https://prod-1-data.ke.pinecone.io/assistant/files/test-assistant', expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
            headers: expect.objectContaining({
                'Api-Key': 'test-api-key',
                'User-Agent': 'TestUserAgent',
                'X-Pinecone-Api-Version': expect.any(String),
            }),
        }));
    });
    test('correctly builds URL with metadata', async () => {
        buildMockFetchResponse(true, 200, JSON.stringify(mockResponse));
        const metadata = { key: 'value' };
        const upload = (0, uploadFile_1.uploadFile)(mockAssistantName, mockApiProvider, mockConfig);
        await upload({ path: 'test.txt', metadata });
        const encodedMetadata = encodeURIComponent(JSON.stringify(metadata));
        expect(mockFetch).toHaveBeenCalledWith(`https://prod-1-data.ke.pinecone.io/assistant/files/test-assistant?metadata=${encodedMetadata}`, expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
            headers: expect.objectContaining({
                'Api-Key': 'test-api-key',
                'User-Agent': 'TestUserAgent',
                'X-Pinecone-Api-Version': expect.any(String),
            }),
        }));
    });
    test('includes correct headers in request', async () => {
        buildMockFetchResponse(true, 200, JSON.stringify(mockResponse));
        const upload = (0, uploadFile_1.uploadFile)(mockAssistantName, mockApiProvider, mockConfig);
        await upload({ path: 'test.txt' });
        expect(mockFetch).toHaveBeenCalledWith('https://prod-1-data.ke.pinecone.io/assistant/files/test-assistant', expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
            headers: expect.objectContaining({
                'Api-Key': 'test-api-key',
                'User-Agent': 'TestUserAgent',
                'X-Pinecone-Api-Version': expect.any(String),
            }),
        }));
    });
    test('creates form data with file stream', async () => {
        buildMockFetchResponse(true, 200, JSON.stringify(mockResponse));
        const upload = (0, uploadFile_1.uploadFile)(mockAssistantName, mockApiProvider, mockConfig);
        await upload({ path: 'test.txt' });
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith('test.txt');
    });
});
//# sourceMappingURL=uploadFile.test.js.map