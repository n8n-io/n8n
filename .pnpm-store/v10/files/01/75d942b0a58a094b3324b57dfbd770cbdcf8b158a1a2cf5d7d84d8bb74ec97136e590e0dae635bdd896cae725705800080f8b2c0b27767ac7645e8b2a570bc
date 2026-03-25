"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const listCollections_1 = require("../listCollections");
describe('listCollections', () => {
    test('should return a list of collection objects', async () => {
        const IOA = {
            listCollections: jest.fn().mockImplementation(() => Promise.resolve({
                collections: [
                    {
                        name: 'movie-embeddings',
                        size: 12345678,
                        status: 'Ready',
                        dimensions: 5,
                        recordCount: 129583,
                        environment: 'us-east-1',
                    },
                    {
                        name: 'tv-embeddings',
                        size: 1543267,
                        status: 'Ready',
                        dimensions: 3,
                        recordCount: 32881,
                        environment: 'us-east-1',
                    },
                ],
            })),
        };
        // @ts-ignore
        const returned = await (0, listCollections_1.listCollections)(IOA)();
        expect(returned).toEqual({
            collections: [
                {
                    name: 'movie-embeddings',
                    size: 12345678,
                    status: 'Ready',
                    dimensions: 5,
                    recordCount: 129583,
                    environment: 'us-east-1',
                },
                {
                    name: 'tv-embeddings',
                    size: 1543267,
                    status: 'Ready',
                    dimensions: 3,
                    recordCount: 32881,
                    environment: 'us-east-1',
                },
            ],
        });
    });
});
//# sourceMappingURL=listCollections.test.js.map