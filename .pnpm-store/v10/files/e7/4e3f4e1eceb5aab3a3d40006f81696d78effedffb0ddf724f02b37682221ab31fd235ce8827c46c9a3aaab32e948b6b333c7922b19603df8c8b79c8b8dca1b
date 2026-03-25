"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
const test_helpers_1 = require("../test-helpers");
let podIndexName, serverlessIndexName, pinecone;
describe('configure index', () => {
    beforeAll(async () => {
        pinecone = new index_1.Pinecone();
        podIndexName = (0, test_helpers_1.randomIndexName)('pod-configure');
        serverlessIndexName = (0, test_helpers_1.randomIndexName)('serverless-configure');
        // create pod index
        await pinecone.createIndex({
            name: podIndexName,
            dimension: 5,
            metric: 'cosine',
            spec: {
                pod: {
                    environment: 'us-east1-gcp',
                    podType: 'p1.x1',
                    pods: 1,
                },
            },
            tags: { project: 'pinecone-integration-tests' },
            waitUntilReady: true,
        });
        // create serverless index
        await pinecone.createIndex({
            name: serverlessIndexName,
            dimension: 5,
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1',
                },
            },
            waitUntilReady: true,
            tags: { project: 'pinecone-integration-tests' },
        });
    });
    afterAll(async () => {
        // Note: using retryDeletes instead of waitUntilReady due to backend bug where index status is ready, but index
        // is actually still upgrading
        await (0, test_helpers_1.retryDeletes)(pinecone, podIndexName);
        await (0, test_helpers_1.retryDeletes)(pinecone, serverlessIndexName);
    });
    describe('pod index', () => {
        test('scale replicas up', async () => {
            const description = await pinecone.describeIndex(podIndexName);
            expect(description.spec.pod?.replicas).toEqual(1);
            await pinecone.configureIndex(podIndexName, {
                spec: { pod: { replicas: 2 } },
            });
            const description2 = await pinecone.describeIndex(podIndexName);
            expect(description2.spec.pod?.replicas).toEqual(2);
        });
        test('scale podType up', async () => {
            // Verify starting state of podType is same as originally created
            const description = await pinecone.describeIndex(podIndexName);
            expect(description.spec.pod?.podType).toEqual('p1.x1');
            await pinecone.configureIndex(podIndexName, {
                spec: { pod: { podType: 'p1.x2' } },
            });
            await (0, test_helpers_1.waitUntilReady)(podIndexName);
            const description2 = await pinecone.describeIndex(podIndexName);
            expect(description2.spec.pod?.podType).toEqual('p1.x2');
        });
        test('Remove index tag from pod index', async () => {
            const description = await pinecone.describeIndex(podIndexName);
            expect(description.tags).toEqual({
                project: 'pinecone-integration-tests',
            });
            await pinecone.configureIndex(podIndexName, {
                tags: { project: '' },
            });
            const description2 = await pinecone.describeIndex(podIndexName);
            expect(description2.tags).toBeUndefined();
        });
    });
    describe('serverless index', () => {
        test('enable and disable deletionProtection', async () => {
            await pinecone.configureIndex(serverlessIndexName, {
                deletionProtection: 'enabled',
            });
            await (0, test_helpers_1.waitUntilReady)(serverlessIndexName);
            // verify we cannot delete the index
            await pinecone.deleteIndex(serverlessIndexName).catch((e) => {
                const err = e;
                expect(err.name).toEqual('PineconeBadRequestError');
                expect(err.message).toContain('Deletion protection is enabled for this index');
            });
            // disable so we can clean the index up
            await pinecone.configureIndex(serverlessIndexName, {
                deletionProtection: 'disabled',
            });
        });
        test('Add/remove index tag(s) on serverless index', async () => {
            const description = await pinecone.describeIndex(serverlessIndexName);
            expect(description.tags).toEqual({
                project: 'pinecone-integration-tests',
            });
            // Add a tag
            await pinecone.configureIndex(serverlessIndexName, {
                tags: { testTag: 'testValue' },
            });
            const description2 = await pinecone.describeIndex(serverlessIndexName);
            expect(description2.tags).toEqual({
                project: 'pinecone-integration-tests',
                testTag: 'testValue',
            });
            // Remove that tag
            await pinecone.configureIndex(serverlessIndexName, {
                tags: { testTag: '' }, // Passing null/undefined here is not allowed due to type safety (must eval to string)
            });
            const description3 = await pinecone.describeIndex(serverlessIndexName);
            if (description3.tags != null) {
                expect(description3.tags['testTag']).toBeUndefined();
                expect(description3.tags['project']).toEqual('pinecone-integration-tests');
            }
            // Confirm when config'ing other things about the index, tags are not changed
            await pinecone.configureIndex(serverlessIndexName, {
                deletionProtection: 'enabled',
            });
            const description4 = await pinecone.describeIndex(serverlessIndexName);
            if (description4.tags != null) {
                expect(description4.tags['testTag']).toBeUndefined();
                expect(description4.tags['project']).toEqual('pinecone-integration-tests');
            }
            // (Cleanup) Disable deletion protection
            await pinecone.configureIndex(serverlessIndexName, {
                deletionProtection: 'disabled',
            });
        });
        test('Update a tag value in a serverless index', async () => {
            const description = await pinecone.describeIndex(serverlessIndexName);
            expect(description.tags).toEqual({
                project: 'pinecone-integration-tests',
            });
            await pinecone.configureIndex(serverlessIndexName, {
                tags: { project: 'updated-project' },
            });
            const description2 = await pinecone.describeIndex(serverlessIndexName);
            if (description2.tags != null) {
                expect(description2.tags['project']).toEqual('updated-project');
            }
        });
    });
    describe('error cases', () => {
        test('cannot configure index with invalid index name', async () => {
            try {
                await pinecone.configureIndex('non-existent-index', {
                    spec: { pod: { replicas: 2 } },
                });
            }
            catch (e) {
                const err = e;
                expect(err.name).toEqual('PineconeNotFoundError');
            }
        });
        test('cannot configure index when exceeding quota', async () => {
            try {
                await pinecone.configureIndex(podIndexName, {
                    spec: { pod: { replicas: 20 } },
                });
            }
            catch (e) {
                const err = e;
                expect(err.name).toEqual('PineconeBadRequestError');
                expect(err.message).toContain(`You've reached the max pods allowed in project`);
                expect(err.message).toContain('To increase this limit, adjust your project settings in the console');
            }
        });
        test('cannot change base pod type', async () => {
            try {
                // Try to change the base pod type
                await pinecone.configureIndex(podIndexName, {
                    spec: { pod: { podType: 'p2.x1' } },
                });
            }
            catch (e) {
                const err = e;
                expect(err.name).toEqual('PineconeBadRequestError');
                expect(err.message).toContain('Bad request: Cannot change pod type');
            }
        });
        test('cannot set deletionProtection value other than enabled / disabled', async () => {
            try {
                await pinecone.configureIndex(serverlessIndexName, {
                    // @ts-expect-error
                    deletionProtection: 'bogus',
                });
            }
            catch (e) {
                const err = e;
                expect(err.name).toEqual('PineconeBadRequestError');
                expect(err.message).toContain('Invalid deletion_protection, value should be either enabled or disabled');
            }
        });
        test('cannot configure pod spec for serverless', async () => {
            try {
                await pinecone.configureIndex(serverlessIndexName, {
                    spec: { pod: { replicas: 2 } },
                });
            }
            catch (e) {
                const err = e;
                expect(err.name).toEqual('PineconeBadRequestError');
                expect(err.message).toContain('Configuring replicas and pod type is not supported for serverless');
            }
        });
    });
});
//# sourceMappingURL=configureIndex.test.js.map