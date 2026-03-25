"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configureIndex_1 = require("../configureIndex");
describe('configureIndex', () => {
    test('calls the openapi configure endpoint', async () => {
        const indexModel = {
            name: 'index-name',
            dimension: 5,
            metric: 'cosine',
            host: 'https://index-host.com',
            vectorType: 'dense',
            spec: {
                pod: {
                    environment: 'us-east1-gcp',
                    replicas: 4,
                    shards: 1,
                    pods: 4,
                    podType: 'p2.x2',
                },
            },
            status: {
                ready: true,
                state: 'Ready',
            },
            tags: {
                example: 'tag',
            },
            deletionProtection: 'disabled', // Redundant, but for example purposes
        };
        const fakeConfigure = jest.fn().mockResolvedValue(indexModel);
        const IOA = { configureIndex: fakeConfigure };
        const returned = await (0, configureIndex_1.configureIndex)(IOA)('index-name', {
            spec: {
                pod: { replicas: 4, podType: 'p2.x2' },
            },
            deletionProtection: 'disabled',
            tags: {
                example: 'tag',
            },
        });
        expect(returned).toBe(indexModel);
        expect(IOA.configureIndex).toHaveBeenCalledWith({
            indexName: 'index-name',
            configureIndexRequest: {
                spec: { pod: { replicas: 4, podType: 'p2.x2' } },
                deletionProtection: 'disabled',
                tags: {
                    example: 'tag',
                },
            },
        });
    });
});
//# sourceMappingURL=configureIndex.test.js.map