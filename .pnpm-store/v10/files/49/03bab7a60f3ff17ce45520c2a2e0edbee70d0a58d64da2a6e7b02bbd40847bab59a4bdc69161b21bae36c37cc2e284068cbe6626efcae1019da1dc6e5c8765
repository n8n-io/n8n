"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configureIndex_1 = require("../configureIndex");
const errors_1 = require("../../errors");
const db_control_1 = require("../../pinecone-generated-ts-fetch/db_control");
describe('configureIndex argument validations', () => {
    let MIA;
    beforeEach(() => {
        MIA = new db_control_1.ManageIndexesApi();
        MIA.configureIndex = jest.fn();
    });
    describe('required configurations', () => {
        test('should throw if index name is not provided', async () => {
            // @ts-ignore
            const toThrow = async () => await (0, configureIndex_1.configureIndex)(MIA)();
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `indexName` to configureIndex.');
        });
        test('should throw if index name is empty string', async () => {
            const toThrow = async () => await (0, configureIndex_1.configureIndex)(MIA)('', { spec: { pod: { replicas: 2 } } });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `indexName` to configureIndex.');
        });
        test('should throw if unknown property is passed at top level', async () => {
            const toThrow = async () => 
            // @ts-ignore
            await (0, configureIndex_1.configureIndex)(MIA)('', { speculoos: { pod: { replicas: 2 } } });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('Object contained invalid properties: speculoos. Valid properties include deletionProtection, spec, tags, embed.');
        });
        test('should throw if spec or deletionProtection are not provided', async () => {
            const toThrowSpec = async () => await (0, configureIndex_1.configureIndex)(MIA)('index-name', {});
            await expect(toThrowSpec).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrowSpec).rejects.toThrowError('You must pass either `spec`, `deletionProtection`, `tags`, or `embed` to configureIndex in order to update.');
        });
        test('should throw if unknown property is passed at spec/pod level', async () => {
            const toThrow = async () => await (0, configureIndex_1.configureIndex)(MIA)('index-name', {
                // @ts-ignore
                spec: { pod: { replicasroonies: 2 } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('Object contained invalid properties: replicasroonies. Valid properties include replicas, podType.');
        });
        test('should throw if replicas is not greater than 0', async () => {
            const toThrow = async () => await (0, configureIndex_1.configureIndex)(MIA)('index-name', {
                // @ts-ignore
                spec: { pod: { replicas: -1 } },
            });
            await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(toThrow).rejects.toThrowError('`replicas` must be a positive integer.');
        });
    });
});
//# sourceMappingURL=configureIndex.validation.test.js.map