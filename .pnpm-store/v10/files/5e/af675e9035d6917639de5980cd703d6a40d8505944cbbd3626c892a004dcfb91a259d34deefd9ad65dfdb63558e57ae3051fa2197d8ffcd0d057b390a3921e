"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createCollection_1 = require("../createCollection");
const errors_1 = require("../../errors");
const setOpenAPIResponse = (fakeCreateCollectionResponse) => {
    const fakeCreateCollection = jest
        .fn()
        .mockImplementation(fakeCreateCollectionResponse);
    const fakeListIndexes = jest
        .fn()
        .mockImplementation(() => Promise.resolve({
        indexes: [
            {
                name: 'index-1',
                dimension: 1,
                metric: 'cosine',
                host: '123-345-abcd.io',
                spec: {
                    pod: {
                        environment: 'us-west1',
                        replicas: 1,
                        shards: 1,
                        podType: 'p1.x1',
                        pods: 1,
                    },
                },
                status: { ready: true, state: 'Ready' },
            },
            {
                name: 'index-2',
                dimension: 3,
                metric: 'cosine',
                host: '321-543-bcda.io',
                spec: {
                    pod: {
                        environment: 'us-west1',
                        replicas: 1,
                        shards: 1,
                        podType: 'p1.x1',
                        pods: 1,
                    },
                },
                status: { ready: true, state: 'Ready' },
            },
        ],
    }));
    const IOA = {
        createCollection: fakeCreateCollection,
        listIndexes: fakeListIndexes,
    };
    return IOA;
};
describe('createCollection', () => {
    describe('argument validations', () => {
        test('throws if no arguments are provided', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                // @ts-ignore
                await (0, createCollection_1.createCollection)(IOA)();
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty object with `name` and `source` fields in order to create a collection.');
        });
        test('throws if empty object', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                // @ts-ignore
                await (0, createCollection_1.createCollection)(IOA)({});
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('The argument to createCollection must have required properties: `name`, `source`.');
        });
        test('throws if unknown property is added', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                await (0, createCollection_1.createCollection)(IOA)({
                    name: 'collection-name',
                    source: 'index-name',
                    // @ts-ignore
                    unknown: 'property',
                });
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('Object contained invalid properties: unknown. Valid properties include source, name.');
        });
        test('throws if known property is misspelled', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                await (0, createCollection_1.createCollection)(IOA)({
                    name: 'collection-name',
                    // @ts-ignore
                    sourceeeee: 'index-name',
                });
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('Object contained invalid properties: sourceeeee. Valid properties include source, name.');
        });
        test('throws if name is not provided', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                await (0, createCollection_1.createCollection)(IOA)({
                    name: '',
                    source: 'index-name',
                });
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to create a collection.');
        });
        test('throws if source is not provided', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                // @ts-ignore
                await (0, createCollection_1.createCollection)(IOA)({ name: 'collection-name' });
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `source` in order to create a collection.');
        });
        test('throws if source is blank', async () => {
            const IOA = setOpenAPIResponse(() => Promise.resolve(''));
            const toThrow = async () => {
                await (0, createCollection_1.createCollection)(IOA)({
                    name: 'collection-name',
                    source: '',
                });
            };
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `source` in order to create a collection.');
        });
    });
    test('calls the openapi create collection endpoint', async () => {
        const collectionModel = {
            name: 'collection-name',
            size: 12346,
            status: 'Initializing',
            dimension: 5,
            recordCount: 50,
            environment: 'us-east1-gcp',
        };
        const IOA = setOpenAPIResponse(() => Promise.resolve(collectionModel));
        const returned = await (0, createCollection_1.createCollection)(IOA)({
            name: 'collection-name',
            source: 'index-name',
        });
        expect(returned).toEqual(collectionModel);
        expect(IOA.createCollection).toHaveBeenCalledWith({
            createCollectionRequest: {
                name: 'collection-name',
                source: 'index-name',
            },
        });
    });
});
//# sourceMappingURL=createCollection.test.js.map