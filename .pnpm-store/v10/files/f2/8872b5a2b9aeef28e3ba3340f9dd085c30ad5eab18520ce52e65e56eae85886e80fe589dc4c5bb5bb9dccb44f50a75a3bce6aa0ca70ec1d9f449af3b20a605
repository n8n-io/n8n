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
const index_1 = require("../index");
const test_helpers_1 = require("./test-helpers");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const setup = async () => {
    let apiKey;
    if (process.env['PINECONE_API_KEY'] === undefined) {
        throw new Error('PINECONE_API_KEY environment variable not set');
    }
    else {
        apiKey = process.env['PINECONE_API_KEY'];
    }
    const client = new index_1.Pinecone({ apiKey: apiKey });
    // both of these processes create the external resources, and then store the names in the GITHUB_OUTPUT env var
    await Promise.all([createServerlessIndex(client), createAssistant(client)]);
};
// main entrypoint
setup();
async function createServerlessIndex(client) {
    let serverlessIndexName = (0, test_helpers_1.randomIndexName)('serverless-integration');
    const indexes = await client.listIndexes();
    const serverlessIndex = indexes.indexes?.find((index) => index.spec.serverless);
    serverlessIndexName = serverlessIndex?.name || serverlessIndexName;
    const createAndSeedNewServerlessIndex = async (newIndexName) => {
        // Create serverless index for data plane tests
        await client.createIndex({
            name: newIndexName,
            dimension: 2,
            metric: 'dotproduct',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-west-2',
                },
            },
            waitUntilReady: true,
            tags: { project: 'pinecone-integration-tests-serverless' },
        });
        // Seed index with data
        const recordsToUpsert = (0, test_helpers_1.generateRecords)({
            prefix: test_helpers_1.prefix,
            dimension: 2,
            quantity: 10,
            withSparseValues: false,
            withMetadata: true,
        });
        // (Upsert 1 record with a different prefix, so can test prefix filtering)
        const oneRecordWithDiffPrefix = (0, test_helpers_1.generateRecords)({
            prefix: test_helpers_1.diffPrefix,
            dimension: 2,
            quantity: 1,
            withSparseValues: false,
            withMetadata: true,
        });
        const allRecords = [...oneRecordWithDiffPrefix, ...recordsToUpsert];
        // upsert records into namespace
        await client
            .index(newIndexName)
            .namespace(test_helpers_1.globalNamespaceOne)
            .upsert(allRecords);
        // wait for records to become available
        await (0, test_helpers_1.sleep)(25000);
    };
    // if there's not an existing serverlessIndex, create one
    if (!serverlessIndex) {
        await createAndSeedNewServerlessIndex(serverlessIndexName);
    }
    // Capture output in GITHUB_OUTPUT env var when run in CI; necessary to pass across tests
    console.log(`SERVERLESS_INDEX_NAME=${serverlessIndexName}`);
}
async function createAssistant(client) {
    // Set up an Assistant and upload a file to it
    const assistantName = (0, test_helpers_1.randomString)(5);
    await client.createAssistant({
        name: assistantName,
        instructions: 'test-instructions',
        metadata: { key: 'valueOne', keyTwo: 'valueTwo' },
        region: 'us',
    });
    await (0, test_helpers_1.sleep)(5000);
    try {
        await client.describeAssistant(assistantName);
    }
    catch (e) {
        console.log('Error getting assistant:', e);
    }
    const assistant = client.Assistant(assistantName);
    // Capture output in GITHUB_OUTPUT env var when run in CI; necessary to pass across tests
    console.log(`ASSISTANT_NAME=${assistantName}`);
    const tempFileName = path.join(os.tmpdir(), `tempfile-${Date.now()}.txt`);
    // Capture output in GITHUB_OUTPUT env var when run in CI; necessary to pass across tests
    console.log(`TEST_FILE=${tempFileName}`);
    try {
        const data = 'This is some temporary data';
        fs.writeFileSync(tempFileName, data);
        console.log(`Temporary file created: ${tempFileName}`);
    }
    catch (err) {
        console.error('Error writing file:', err);
    }
    // Add a small delay to ensure file system sync
    await (0, test_helpers_1.sleep)(1000);
    // Upload file to assistant so chat works
    const file = await assistant.uploadFile({
        path: tempFileName,
        metadata: { key: 'valueOne', keyTwo: 'valueTwo' },
    });
    console.log('File uploaded:', file);
    // Another sleep b/c it currently takes a *long* time for a file to be available
    await (0, test_helpers_1.sleep)(30000);
    // Delete file from local file system
    try {
        fs.unlinkSync(path.resolve(process.cwd(), tempFileName));
        console.log(`Temporary file deleted: ${tempFileName}`);
    }
    catch (err) {
        console.error('Error deleting file:', err);
    }
}
//# sourceMappingURL=setup.js.map