"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const listIndexes_1 = require("../listIndexes");
describe('listIndexes', () => {
    test('should return a list of index objects', async () => {
        const IndexOperationsApi = {
            listIndexes: jest.fn().mockImplementation(() => Promise.resolve({
                indexes: [
                    {
                        name: 'index-name',
                        dimension: 5,
                        capacityMode: 'pod',
                        metric: 'cosine',
                        host: '789-123-foo.svc.efgh.pinecone.io',
                        spec: {
                            serverless: {
                                cloud: 'aws',
                                region: 'us-east-1',
                            },
                        },
                        status: {
                            ready: true,
                            state: 'Ready',
                        },
                    },
                    {
                        name: 'index-name-2',
                        dimension: 5,
                        capacityMode: 'pod',
                        metric: 'cosine',
                        host: '123-456-foo.svc.abcd.pinecone.io',
                        spec: {
                            serverless: {
                                cloud: 'aws',
                                region: 'us-east-1',
                            },
                        },
                        status: {
                            ready: true,
                            state: 'Ready',
                        },
                    },
                ],
            })),
        };
        // @ts-ignore
        const returned = await (0, listIndexes_1.listIndexes)(IndexOperationsApi)();
        expect(returned).toEqual({
            indexes: [
                {
                    name: 'index-name',
                    dimension: 5,
                    capacityMode: 'pod',
                    metric: 'cosine',
                    host: '789-123-foo.svc.efgh.pinecone.io',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1',
                        },
                    },
                    status: {
                        ready: true,
                        state: 'Ready',
                    },
                },
                {
                    name: 'index-name-2',
                    dimension: 5,
                    capacityMode: 'pod',
                    metric: 'cosine',
                    host: '123-456-foo.svc.abcd.pinecone.io',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1',
                        },
                    },
                    status: {
                        ready: true,
                        state: 'Ready',
                    },
                },
            ],
        });
    });
});
//# sourceMappingURL=listIndexes.test.js.map