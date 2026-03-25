"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vectorOperationsProvider_1 = require("../../vectors/vectorOperationsProvider");
const indexHostSingleton_1 = require("../../indexHostSingleton");
const db_data_1 = require("../../../pinecone-generated-ts-fetch/db_data");
jest.mock('../../../pinecone-generated-ts-fetch/db_data', () => ({
    ...jest.requireActual('../../../pinecone-generated-ts-fetch/db_data'),
    Configuration: jest.fn(),
}));
describe('DataOperationsProvider', () => {
    let real;
    const config = {
        apiKey: 'test-api-key',
    };
    beforeAll(() => {
        real = indexHostSingleton_1.IndexHostSingleton.getHostUrl;
    });
    afterAll(() => {
        indexHostSingleton_1.IndexHostSingleton.getHostUrl = real;
    });
    beforeEach(() => {
        indexHostSingleton_1.IndexHostSingleton.getHostUrl = jest.fn();
    });
    afterEach(() => {
        indexHostSingleton_1.IndexHostSingleton._reset();
    });
    test('makes no API calls on instantiation', async () => {
        const config = {
            apiKey: 'test-api-key',
        };
        new vectorOperationsProvider_1.VectorOperationsProvider(config, 'index-name');
        expect(indexHostSingleton_1.IndexHostSingleton.getHostUrl).not.toHaveBeenCalled();
    });
    test('api calls occur only the first time the provide method is called', async () => {
        const config = {
            apiKey: 'test-api-key',
        };
        const provider = new vectorOperationsProvider_1.VectorOperationsProvider(config, 'index-name');
        expect(indexHostSingleton_1.IndexHostSingleton.getHostUrl).not.toHaveBeenCalled();
        const api = await provider.provide();
        expect(indexHostSingleton_1.IndexHostSingleton.getHostUrl).toHaveBeenCalled();
        const api2 = await provider.provide();
        expect(indexHostSingleton_1.IndexHostSingleton.getHostUrl).toHaveBeenCalledTimes(1);
        expect(api).toEqual(api2);
    });
    test('passing indexHostUrl skips hostUrl resolution', async () => {
        const indexHostUrl = 'http://index-host-url';
        const provider = new vectorOperationsProvider_1.VectorOperationsProvider(config, 'index-name', indexHostUrl);
        jest.spyOn(provider, 'buildDataOperationsConfig');
        await provider.provide();
        expect(indexHostSingleton_1.IndexHostSingleton.getHostUrl).not.toHaveBeenCalled();
        expect(provider.buildDataOperationsConfig).toHaveBeenCalled();
    });
    test('passing additionalHeaders applies them to the API Configuration', async () => {
        const additionalHeaders = { 'x-custom-header': 'custom-value' };
        const provider = new vectorOperationsProvider_1.VectorOperationsProvider(config, 'index-name', undefined, additionalHeaders);
        await provider.provide();
        expect(db_data_1.Configuration).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining(additionalHeaders),
        }));
    });
});
//# sourceMappingURL=vectorOperationsProvider.test.js.map