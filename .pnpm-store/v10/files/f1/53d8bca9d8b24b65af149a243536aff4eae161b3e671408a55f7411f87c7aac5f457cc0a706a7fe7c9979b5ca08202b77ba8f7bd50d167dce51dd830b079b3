"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const indexOperationsBuilder_1 = require("../indexOperationsBuilder");
const db_control_1 = require("../../pinecone-generated-ts-fetch/db_control");
jest.mock('../../pinecone-generated-ts-fetch/db_control', () => ({
    ...jest.requireActual('../../pinecone-generated-ts-fetch/db_control'),
    Configuration: jest.fn(),
}));
describe('indexOperationsBuilder', () => {
    test('API Configuration basePath is set to api.pinecone.io by default', () => {
        const config = { apiKey: 'test-api-key' };
        (0, indexOperationsBuilder_1.indexOperationsBuilder)(config);
        expect(db_control_1.Configuration).toHaveBeenCalledWith(expect.objectContaining({ basePath: 'https://api.pinecone.io' }));
    });
    test('controllerHostUrl overwrites the basePath in API Configuration', () => {
        const controllerHostUrl = 'https://test-controller-host-url.io';
        const config = {
            apiKey: 'test-api-key',
            controllerHostUrl,
        };
        (0, indexOperationsBuilder_1.indexOperationsBuilder)(config);
        expect(db_control_1.Configuration).toHaveBeenCalledWith(expect.objectContaining({ basePath: controllerHostUrl }));
    });
    test('additionalHeaders are passed to the API Configuration', () => {
        const additionalHeaders = { 'x-test-header': 'test-value' };
        const config = { apiKey: 'test-api-key', additionalHeaders };
        (0, indexOperationsBuilder_1.indexOperationsBuilder)(config);
        expect(db_control_1.Configuration).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining(additionalHeaders),
        }));
    });
});
//# sourceMappingURL=indexOperationsBuilder.test.js.map