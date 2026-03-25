"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createIndex_1 = require("../createIndex");
const errors_1 = require("../../errors");
const db_control_1 = require("../../pinecone-generated-ts-fetch/db_control");
describe('createIndex argument validations', () => {
    let MIA;
    beforeEach(() => {
        MIA = new db_control_1.ManageIndexesApi();
        MIA.createIndex = jest.fn();
    });
    describe('required configurations', () => {
        test('should throw no options are provided', async () => {
            // @ts-ignore
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)();
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass an object with required properties (`name`, `dimension`, `spec`) to create an index.');
        });
        test('should throw if index name is not provided', async () => {
            const toThrow = async () => 
            // @ts-ignore
            await (0, createIndex_1.createIndex)(MIA)({
                dimension: 10,
                metric: 'cosine',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to create an index.');
        });
        test('should throw if index name is empty string', async () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: '',
                dimension: 10,
                metric: 'cosine',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to create an index.');
        });
        test('should throw if dimension is not provided', async () => {
            const toThrow = async () => 
            // @ts-ignore
            await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                metric: 'cosine',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a positive `dimension` when creating a dense index.');
        });
        test('should throw if dimension is not a positive integer', async () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: -10,
                metric: 'cosine',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a positive integer for `dimension` in order to create an index.');
        });
        test('should throw if region is not provided', () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                metric: 'cosine',
                spec: {
                    // @ts-ignore
                    serverless: {
                        cloud: 'aws',
                    },
                },
            });
            expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            expect(toThrow).rejects.toThrowError('You must pass a `region` for the serverless `spec` object in order to create an index.');
        });
        test('should throw if cloud is not provided', () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                metric: 'cosine',
                spec: {
                    serverless: {
                        // @ts-ignore
                        region: 111,
                    },
                },
            });
            expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            expect(toThrow).rejects.toThrowError('You must pass a `cloud` for the serverless `spec` object in order to create an index.');
        });
        test('should throw if cloud is not one of the expected strings', () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                metric: 'cosine',
                spec: {
                    serverless: {
                        region: 'us-east-1',
                        // @ts-ignore
                        cloud: 'gooosdf',
                    },
                },
            });
            expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            expect(toThrow).rejects.toThrowError('Invalid cloud value');
        });
    });
    describe('optional configurations', () => {
        test('metric: should throw if not one of the predefined literals', async () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                // @ts-ignore
                metric: 'foo',
                spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError("Invalid metric value: foo. Valid values are: 'cosine', 'euclidean', or 'dotproduct.'");
        });
        test('replicas: should throw if not a positive integer', async () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                metric: 'cosine',
                spec: {
                    pod: {
                        replicas: -10,
                        environment: 'us-east-1',
                        shards: 1,
                        podType: 'p1.x1',
                        pods: 1,
                    },
                },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a positive integer for `replicas` in order to create an index.');
        });
        test('podType: should throw if not a valid pod type', async () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                metric: 'cosine',
                spec: {
                    pod: {
                        replicas: 1,
                        environment: 'us-east-1',
                        shards: 1,
                        podType: 'gobblygook',
                        pods: 1,
                    },
                },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('Invalid pod type: gobblygook. Valid values are: s1.x1, s1.x2, s1.x4, s1.x8, p1.x1, p1.x2, p1.x4, p1.x8, p2.x1, p2.x2, p2.x4, p2.x8.');
        });
        test('pods: should throw if not a positive integer', async () => {
            const toThrow = async () => await (0, createIndex_1.createIndex)(MIA)({
                name: 'index-name',
                dimension: 10,
                metric: 'cosine',
                spec: {
                    pod: {
                        replicas: 1,
                        environment: 'us-east-1',
                        shards: 1,
                        podType: 'p1.x1',
                        pods: -10,
                    },
                },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a positive integer for `pods` in order to create an index.');
        });
    });
});
//# sourceMappingURL=createIndex.validation.test.js.map