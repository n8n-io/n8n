"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const test_helpers_1 = require("./test-helpers");
const utils_1 = require("../utils");
const errors_1 = require("../errors");
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
// Retry logic tests
describe('Testing retry logic via a mock, in-memory http server', () => {
    const recordsToUpsert = (0, test_helpers_1.generateRecords)({
        dimension: 2,
        quantity: 1,
        withSparseValues: false,
        withMetadata: true,
    });
    let pinecone;
    const indexName = 'local-test-index';
    let server; // Note: server cannot be something like an express server due to conflicts w/edge runtime
    let mockServerlessIndex;
    let callCount;
    let op;
    // Helper function to start the server with a specific response pattern
    const startMockServer = (shouldSucceedOnSecondCall) => {
        // Create http server
        server = http_1.default.createServer((req, res) => {
            const { pathname } = (0, url_1.parse)(req.url || '', true);
            if (req.method === 'POST' && pathname === `/vectors/${op}`) {
                callCount++;
                if (shouldSucceedOnSecondCall && callCount === 1) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ name: 'PineconeUnavailableError', status: 503 }));
                }
                else if (shouldSucceedOnSecondCall && callCount === 2) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 200, data: 'Success' }));
                }
                else {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ name: 'PineconeUnavailableError', status: 503 }));
                }
            }
            else {
                res.writeHead(404); // Not found
                res.end();
            }
        });
        server.listen(4000); // Host server on local port 4000
    };
    beforeAll(() => {
        pinecone = new index_1.Pinecone();
    });
    beforeEach(() => {
        callCount = 0;
    });
    afterEach(async () => {
        // Close server and reset mocks
        await new Promise((resolve) => server.close(() => resolve()));
        jest.clearAllMocks();
    });
    test('Upsert operation should retry 1x if server responds 1x with error and 1x with success', async () => {
        op = 'upsert';
        pinecone = new index_1.Pinecone({
            apiKey: process.env['PINECONE_API_KEY'] || '',
            maxRetries: 2,
        });
        mockServerlessIndex = pinecone
            .Index(indexName, 'http://localhost:4000')
            .namespace(test_helpers_1.globalNamespaceOne);
        const retrySpy = jest.spyOn(utils_1.RetryOnServerFailure.prototype, 'execute');
        const delaySpy = jest.spyOn(utils_1.RetryOnServerFailure.prototype, 'delay');
        // Start server with a successful response on the second call
        startMockServer(true);
        // Call Upsert operation
        await mockServerlessIndex.upsert(recordsToUpsert);
        // 2 total tries: 1 initial call, 1 retry
        expect(retrySpy).toHaveBeenCalledTimes(1); // passes
        expect(delaySpy).toHaveBeenCalledTimes(1); // fails
        expect(callCount).toBe(2);
    });
    test('Update operation should retry 1x if server responds 1x with error and 1x with success', async () => {
        op = 'update';
        pinecone = new index_1.Pinecone({
            apiKey: process.env['PINECONE_API_KEY'] || '',
            maxRetries: 2,
        });
        mockServerlessIndex = pinecone
            .Index(indexName, 'http://localhost:4000')
            .namespace(test_helpers_1.globalNamespaceOne);
        const retrySpy = jest.spyOn(utils_1.RetryOnServerFailure.prototype, 'execute');
        const delaySpy = jest.spyOn(utils_1.RetryOnServerFailure.prototype, 'delay');
        // Start server with a successful response on the second call
        startMockServer(true);
        const recordIdToUpdate = recordsToUpsert[0].id;
        const newMetadata = { flavor: 'chocolate' };
        // Call Update operation
        await mockServerlessIndex.update({
            id: recordIdToUpdate,
            metadata: newMetadata,
        });
        // 2 total tries: 1 initial call, 1 retry
        expect(retrySpy).toHaveBeenCalledTimes(1);
        expect(delaySpy).toHaveBeenCalledTimes(1);
        expect(callCount).toBe(2);
    });
    test('Max retries exceeded w/o resolve', async () => {
        op = 'upsert';
        await (0, test_helpers_1.sleep)(500); // In Node20+, tcp connections changed: https://github.com/pinecone-io/pinecone-ts-client/pull/318#issuecomment-2560180936
        pinecone = new index_1.Pinecone({
            apiKey: process.env['PINECONE_API_KEY'] || '',
            maxRetries: 3,
        });
        mockServerlessIndex = pinecone
            .Index(indexName, 'http://localhost:4000')
            .namespace(test_helpers_1.globalNamespaceOne);
        const retrySpy = jest.spyOn(utils_1.RetryOnServerFailure.prototype, 'execute');
        const delaySpy = jest.spyOn(utils_1.RetryOnServerFailure.prototype, 'delay');
        // Start server with persistent 503 errors on every call
        startMockServer(false);
        // Catch expected error from Upsert operation
        const errorResult = async () => {
            await mockServerlessIndex.upsert(recordsToUpsert);
        };
        await expect(errorResult).rejects.toThrowError(errors_1.PineconeMaxRetriesExceededError);
        // Out of 3 total tries, 2 are retries (i.e. delays), and 1 is the initial call:
        expect(retrySpy).toHaveBeenCalledTimes(1);
        expect(delaySpy).toHaveBeenCalledTimes(2);
        expect(callCount).toBe(3);
    });
});
//# sourceMappingURL=retries.test.js.map