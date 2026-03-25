"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../vectors/fetch");
const query_1 = require("../vectors/query");
const update_1 = require("../vectors/update");
const upsert_1 = require("../vectors/upsert");
const vectorOperationsProvider_1 = require("../vectors/vectorOperationsProvider");
const index_1 = require("../index");
jest.mock('../vectors/fetch');
jest.mock('../vectors/query');
jest.mock('../vectors/update');
jest.mock('../vectors/upsert');
jest.mock('../vectors/vectorOperationsProvider');
describe('Index', () => {
    let config;
    beforeEach(() => {
        config = {
            apiKey: 'test-api-key',
        };
    });
    describe('index initialization', () => {
        test('passes config, indexName, indexHostUrl, and additionalHeaders to VectorOperationsProvider', () => {
            const indexHostUrl = 'https://test-api-pinecone.io';
            const additionalHeaders = { 'x-custom-header': 'custom-value' };
            new index_1.Index('index-name', config, undefined, indexHostUrl, additionalHeaders);
            expect(vectorOperationsProvider_1.VectorOperationsProvider).toHaveBeenCalledTimes(1);
            expect(vectorOperationsProvider_1.VectorOperationsProvider).toHaveBeenCalledWith(config, 'index-name', indexHostUrl, additionalHeaders);
        });
    });
    describe('metadata', () => {
        test('can write functions that take types with generic params', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fn1 = (record) => {
                // no type errors on this because typescript doesn't know anything about what keys are defined
                // ScoredPineconeRecord without specifying the generic type param
                console.log(record.metadata && record.metadata.yolo);
            };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fn2 = (record) => {
                console.log(record.metadata && record.metadata.name);
                // @ts-expect-error because bogus not in MyMeta
                console.log(record.metadata && record.metadata.bogus);
            };
        });
        test('can be used without generic types param', async () => {
            const index = new index_1.Index('index-name', config, 'namespace');
            // You can use the index class without passing the generic type for metadata,
            // but you lose type safety in that case.
            await index.update({ id: '1', metadata: { foo: 'bar' } });
            await index.update({ id: '1', metadata: { baz: 'quux' } });
            // Same thing with upsert. You can upsert anything in metadata field without type.
            await index.upsert([
                { id: '2', values: [0.1, 0.2], metadata: { hello: 'world' } },
            ]);
            // @ts-expect-error even when you haven't passed a generic type, it enforces the expected shape of RecordMetadata
            await index.upsert([{ id: '2', values: [0.1, 0.2], metadata: 2 }]);
        });
        test('preserves metadata typing through chained namespace calls', async () => {
            const index = new index_1.Index('index-name', config, 'namespace');
            const ns1 = index.namespace('ns1');
            // @ts-expect-error because MovieMetadata metadata still expected after chained namespace call
            await ns1.update({ id: '1', metadata: { title: 'Vertigo', rating: 5 } });
        });
        test('upsert: has type errors when passing malformed metadata', async () => {
            const index = new index_1.Index('index-name', config, 'namespace');
            expect(upsert_1.UpsertCommand).toHaveBeenCalledTimes(1);
            // No ts errors when upserting with proper MovieMetadata
            await index.upsert([
                {
                    id: '1',
                    values: [0.1, 0.1, 0.1],
                    metadata: {
                        genre: 'romance',
                        runtime: 120,
                    },
                },
            ]);
            // No ts errors when upserting with no metadata
            await index.upsert([
                {
                    id: '2',
                    values: [0.1, 0.1, 0.1],
                },
            ]);
            // ts error expected when passing metadata that doesn't match MovieMetadata
            await index.upsert([
                {
                    id: '3',
                    values: [0.1, 0.1, 0.1],
                    metadata: {
                        // @ts-expect-error
                        somethingElse: 'foo',
                    },
                },
            ]);
        });
        test('fetch: response is typed with generic metadata type', async () => {
            const index = new index_1.Index('index-name', config, 'namespace');
            expect(fetch_1.FetchCommand).toHaveBeenCalledTimes(1);
            const response = await index.fetch(['1']);
            if (response && response.records) {
                // eslint-disable-next-line
                Object.entries(response.records).forEach(([key, value]) => {
                    // No errors on these because they are properties from MovieMetadata
                    console.log(value.metadata?.genre);
                    console.log(value.metadata?.runtime);
                    // @ts-expect-error because result is expecting metadata to be MovieMetadata
                    console.log(value.metadata?.bogus);
                });
            }
        });
        test('query: returns typed results', async () => {
            const index = new index_1.Index('index-name', config, 'namespace');
            expect(query_1.QueryCommand).toHaveBeenCalledTimes(1);
            const results = await index.query({ id: '1', topK: 5 });
            if (results && results.matches) {
                if (results.matches.length > 0) {
                    const firstResult = results.matches[0];
                    // no ts error because score is part of ScoredPineconeRecord
                    console.log(firstResult.score);
                    // no ts error because genre and runtime part of MovieMetadata
                    console.log(firstResult.metadata?.genre);
                    console.log(firstResult.metadata?.runtime);
                    // @ts-expect-error because bogus not part of MovieMetadata
                    console.log(firstResult.metadata?.bogus);
                }
            }
        });
        test('update: has typed arguments', async () => {
            const index = new index_1.Index('index-name', config, 'namespace');
            expect(update_1.UpdateCommand).toHaveBeenCalledTimes(1);
            // Can update metadata only without ts errors
            await index.update({
                id: '1',
                metadata: { genre: 'romance', runtime: 90 },
            });
            // Can update values only without ts errors
            await index.update({ id: '2', values: [0.1, 0.2, 0.3] });
            // Can update sparseValues only without ts errors
            await index.update({
                id: '3',
                sparseValues: { indices: [0, 3], values: [0.2, 0.5] },
            });
            // Can update all fields without ts errors
            await index.update({
                id: '4',
                values: [0.1, 0.2, 0.3],
                sparseValues: { indices: [0], values: [0.789] },
                metadata: { genre: 'horror', runtime: 10 },
            });
            // @ts-expect-error when id is missing
            await index.update({ metadata: { genre: 'drama', runtime: 97 } });
            // @ts-expect-error when metadata has unexpected fields
            await index.update({ id: '5', metadata: { title: 'Vertigo' } });
            await index.update({
                id: '6',
                // @ts-expect-error when metadata has extra properties
                metadata: { genre: 'comedy', runtime: 80, title: 'Miss Congeniality' },
            });
        });
    });
});
//# sourceMappingURL=index.test.js.map