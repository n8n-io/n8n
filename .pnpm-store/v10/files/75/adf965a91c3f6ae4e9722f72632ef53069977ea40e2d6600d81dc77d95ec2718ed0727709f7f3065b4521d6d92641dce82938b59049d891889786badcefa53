"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createIndexForModel_1 = require("../createIndexForModel");
const errors_1 = require("../../errors");
// describeIndexResponse can either be a single response, or an array of responses for testing polling scenarios
const setupCreateIndexForModelResponse = (createIndexForModelResponse, describeIndexResponse, isCreateIndexSuccess = true, isDescribeIndexSuccess = true) => {
    const fakeCreateIndexForModel = jest
        .fn()
        .mockImplementation(() => isCreateIndexSuccess
        ? Promise.resolve(createIndexForModelResponse)
        : Promise.reject(createIndexForModelResponse));
    // unfold describeIndexResponse
    const describeIndexResponses = Array.isArray(describeIndexResponse)
        ? describeIndexResponse
        : [describeIndexResponse];
    const describeIndexMock = jest.fn();
    describeIndexResponses.forEach((response) => {
        describeIndexMock.mockImplementationOnce(() => isDescribeIndexSuccess
            ? Promise.resolve(response)
            : Promise.reject({ response }));
    });
    const fakeDescribeIndex = describeIndexMock;
    const MIA = {
        createIndexForModel: fakeCreateIndexForModel,
        describeIndex: fakeDescribeIndex,
    };
    return MIA;
};
describe('createIndexForModel', () => {
    test('calls the openapi create index for model endpoint', async () => {
        const MIA = setupCreateIndexForModelResponse({ name: 'test-index' }, {
            status: { ready: true, state: 'Ready' },
        });
        const mockCreateReq = {
            name: 'test-index',
            cloud: 'aws',
            region: 'us-east-1',
            embed: {
                model: 'test-model',
                metric: 'cosine',
                fieldMap: { testField: 'test-field' },
                readParameters: { testReadParam: 'test-read-param' },
                writeParameters: { testWriteParam: 'test-write-param' },
            },
            deletionProtection: 'enabled',
            tags: { testTag: 'test-tag' },
        };
        await (0, createIndexForModel_1.createIndexForModel)(MIA)(mockCreateReq);
        expect(MIA.createIndexForModel).toHaveBeenCalledWith({
            createIndexForModelRequest: mockCreateReq,
        });
    });
    test('throws error if no name is passed', async () => {
        const MIA = setupCreateIndexForModelResponse(undefined, undefined);
        try {
            // @ts-ignore
            await (0, createIndexForModel_1.createIndexForModel)(MIA)({
                cloud: 'aws',
                region: 'us-east-1',
                embed: {
                    model: 'test-model',
                },
            });
        }
        catch (err) {
            expect(err).toBeInstanceOf(errors_1.PineconeArgumentError);
            expect(err.message).toBe('You must pass a non-empty string for `name` in order to create an index.');
        }
    });
    test('throws error if no cloud is passed', async () => {
        const MIA = setupCreateIndexForModelResponse(undefined, undefined);
        try {
            // @ts-ignore
            await (0, createIndexForModel_1.createIndexForModel)(MIA)({
                name: 'test-index',
                region: 'us-east-1',
                embed: {
                    model: 'test-model',
                },
            });
        }
        catch (err) {
            expect(err).toBeInstanceOf(errors_1.PineconeArgumentError);
            expect(err.message).toBe('You must pass a non-empty string for `cloud` in order to create an index.');
        }
    });
    test('throws error if no region is passed', async () => {
        const MIA = setupCreateIndexForModelResponse(undefined, undefined);
        try {
            // @ts-ignore
            await (0, createIndexForModel_1.createIndexForModel)(MIA)({
                name: 'test-index',
                cloud: 'aws',
                embed: {
                    model: 'test-model',
                },
            });
        }
        catch (err) {
            expect(err).toBeInstanceOf(errors_1.PineconeArgumentError);
            expect(err.message).toBe('You must pass a non-empty string for `region` in order to create an index.');
        }
    });
    test('throws error if no embed object is passed', async () => {
        const MIA = setupCreateIndexForModelResponse(undefined, undefined);
        try {
            // @ts-ignore
            await (0, createIndexForModel_1.createIndexForModel)(MIA)({
                name: 'test-index',
                cloud: 'aws',
                region: 'us-east-1',
            });
        }
        catch (err) {
            expect(err).toBeInstanceOf(errors_1.PineconeArgumentError);
            expect(err.message).toBe('You must pass an `embed` object in order to create an index.');
        }
    });
});
//# sourceMappingURL=createIndexForModel.test.js.map