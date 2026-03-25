"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
const test_helpers_1 = require("../test-helpers");
let pinecone;
beforeAll(async () => {
    pinecone = new index_1.Pinecone();
});
describe('create index', () => {
    describe('serverless index tests', () => {
        describe('happy path', () => {
            test('create dense index', async () => {
                const indexName = (0, test_helpers_1.randomIndexName)('serverless-create');
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 5,
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-west-2',
                        },
                    },
                    waitUntilReady: true,
                    tags: { project: 'pinecone-integration-tests' },
                });
                const description = await pinecone.describeIndex(indexName);
                expect(description.name).toEqual(indexName);
                expect(description.dimension).toEqual(5);
                // defaults to 'cosine'
                expect(description.metric).toEqual('cosine');
                expect(description.host).toBeDefined();
                // defaults to 'dense'
                expect(description.vectorType).toEqual('dense');
                expect(description.tags).toEqual({
                    project: 'pinecone-integration-tests',
                });
                await pinecone.deleteIndex(indexName);
            });
            test('create dense euclidean index', async () => {
                const indexName = (0, test_helpers_1.randomIndexName)('serverless-create');
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 5,
                    metric: 'euclidean',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-west-2',
                        },
                    },
                    vectorType: 'dense',
                    waitUntilReady: true,
                });
                const description = await pinecone.describeIndex(indexName);
                expect(description.name).toEqual(indexName);
                expect(description.dimension).toEqual(5);
                expect(description.metric).toEqual('euclidean');
                expect(description.vectorType).toEqual('dense');
                expect(description.host).toBeDefined();
                await pinecone.deleteIndex(indexName);
            });
            test('create sparse index', async () => {
                const indexName = (0, test_helpers_1.randomIndexName)('svrlss-sparse-create');
                await pinecone.createIndex({
                    name: indexName,
                    vectorType: 'sparse',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1',
                        },
                    },
                });
                const description = await pinecone.describeIndex(indexName);
                expect(description.name).toEqual(indexName);
                expect(description.vectorType).toEqual('sparse');
                expect(description.host).toBeDefined();
                expect(description.metric).toEqual('dotproduct');
                await pinecone.deleteIndex(indexName);
            });
            test('create with utility prop: suppressConflicts', async () => {
                const indexName = (0, test_helpers_1.randomIndexName)('serverless-create');
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 5,
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-west-2',
                        },
                    },
                    waitUntilReady: true,
                });
                // call again with suppressConflicts: true - this would throw normally throw a server error
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 5,
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-west-2',
                        },
                    },
                    waitUntilReady: true,
                    suppressConflicts: true,
                });
                const description = await pinecone.describeIndex(indexName);
                expect(description.name).toEqual(indexName);
                await pinecone.deleteIndex(indexName);
            });
        });
        describe('error cases', () => {
            test('create index with invalid index name', async () => {
                try {
                    const indexName = (0, test_helpers_1.randomIndexName)('serverless-create');
                    await pinecone.createIndex({
                        name: indexName + '-',
                        dimension: 5,
                        metric: 'cosine',
                        spec: {
                            serverless: {
                                cloud: 'aws',
                                region: 'us-west-2',
                            },
                        },
                    });
                }
                catch (e) {
                    const err = e;
                    expect(err.name).toEqual('PineconeBadRequestError');
                    expect(err.message).toContain('alphanumeric character');
                }
            });
            test('create sparse index with invalid metric', async () => {
                try {
                    const indexName = (0, test_helpers_1.randomIndexName)('sparse-error');
                    await pinecone.createIndex({
                        name: indexName,
                        metric: 'cosine',
                        vectorType: 'sparse',
                        spec: {
                            serverless: {
                                cloud: 'aws',
                                region: 'us-east-1',
                            },
                        },
                    });
                }
                catch (e) {
                    const err = e;
                    expect(err.name).toEqual('PineconeArgumentError');
                    expect(err.message).toContain('Sparse indexes must have a `metric` of `dotproduct`');
                }
            });
            test('create sparse index with invalid dimension', async () => {
                try {
                    const indexName = (0, test_helpers_1.randomIndexName)('sparse-error');
                    await pinecone.createIndex({
                        name: indexName,
                        dimension: 5,
                        vectorType: 'sparse',
                        spec: {
                            serverless: {
                                cloud: 'aws',
                                region: 'us-east-1',
                            },
                        },
                    });
                }
                catch (e) {
                    const err = e;
                    expect(err.name).toEqual('PineconeArgumentError');
                    expect(err.message).toContain('Sparse indexes cannot have a `dimension`');
                }
            });
        });
    });
    describe('pod index tests', () => {
        describe('happy path', () => {
            test('create pod index', async () => {
                const indexName = (0, test_helpers_1.randomIndexName)('test-pod-create');
                await pinecone.createIndex({
                    name: indexName,
                    dimension: 5,
                    metric: 'cosine',
                    spec: {
                        pod: {
                            environment: 'us-east-1-aws',
                            podType: 'p1.x1',
                            pods: 1,
                        },
                    },
                });
                const description = await pinecone.describeIndex(indexName);
                expect(description.name).toEqual(indexName);
                expect(description.dimension).toEqual(5);
                expect(description.metric).toEqual('cosine');
                expect(description.host).toBeDefined();
                expect(description.vectorType).toEqual('dense');
                await pinecone.deleteIndex(indexName);
            });
        });
        describe('error cases', () => {
            test('create from non-existent collection', async () => {
                const indexName = (0, test_helpers_1.randomIndexName)('collection-error');
                try {
                    await pinecone.createIndex({
                        name: indexName,
                        dimension: 5,
                        metric: 'cosine',
                        spec: {
                            pod: {
                                environment: 'us-east-1-aws',
                                podType: 'p1.x1',
                                pods: 1,
                                sourceCollection: 'non-existent-collection',
                            },
                        },
                    });
                }
                catch (e) {
                    const err = e;
                    expect(err.name).toEqual('PineconeBadRequestError');
                    expect(err.message).toContain('Resource non-existent-collection not found');
                }
            });
            test('create sparse pod index', async () => {
                try {
                    const indexName = (0, test_helpers_1.randomIndexName)('sparse-error');
                    await pinecone.createIndex({
                        name: indexName,
                        dimension: 5,
                        vectorType: 'sparse',
                        spec: {
                            pod: {
                                environment: 'us-east-1-aws',
                                podType: 'p1.x1',
                                pods: 1,
                                sourceCollection: 'non-existent-collection',
                            },
                        },
                    });
                }
                catch (e) {
                    const err = e;
                    expect(err.name).toEqual('PineconeArgumentError');
                    expect(err.message).toContain('Pod indexes must have a `vectorType` of `dense`');
                }
            });
        });
    });
});
//# sourceMappingURL=createIndex.test.js.map