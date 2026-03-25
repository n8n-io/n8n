"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const startImport_1 = require("../../bulk/startImport");
const listImports_1 = require("../../bulk/listImports");
const describeImport_1 = require("../../bulk/describeImport");
const cancelImport_1 = require("../../bulk/cancelImport");
const db_data_1 = require("../../../pinecone-generated-ts-fetch/db_data");
const errors_1 = require("../../../errors");
describe('StartImportCommand', () => {
    let apiProviderMock;
    let apiMock; // Mocking the API returned by `provide`
    let startImportCommand;
    let listImportCommand;
    let describeImportCommand;
    let cancelImportCommand;
    beforeEach(() => {
        apiMock = {
            startBulkImport: jest.fn(),
            listBulkImports: jest.fn(),
            describeBulkImport: jest.fn(),
            cancelBulkImport: jest.fn(),
        };
        apiProviderMock = {
            provide: jest.fn().mockResolvedValue(apiMock),
        };
        startImportCommand = new startImport_1.StartImportCommand(apiProviderMock, '');
        listImportCommand = new listImports_1.ListImportsCommand(apiProviderMock, '');
        describeImportCommand = new describeImport_1.DescribeImportCommand(apiProviderMock, '');
        cancelImportCommand = new cancelImport_1.CancelImportCommand(apiProviderMock, '');
    });
    test('should call startImport with correct request when errorMode is "continue"', async () => {
        const uri = 's3://my-bucket/my-file.csv';
        const errorMode = 'continue';
        const expectedRequest = {
            startImportRequest: {
                uri,
                errorMode: { onError: db_data_1.ImportErrorModeOnErrorEnum.Continue },
            },
        };
        await startImportCommand.run(uri, errorMode);
        expect(apiProviderMock.provide).toHaveBeenCalled();
        expect(apiMock.startBulkImport).toHaveBeenCalledWith(expectedRequest);
    });
    test('should call startImport with correct request when errorMode is "abort"', async () => {
        const uri = 's3://my-bucket/my-file.csv';
        const errorMode = 'abort';
        const expectedRequest = {
            startImportRequest: {
                uri,
                errorMode: { onError: db_data_1.ImportErrorModeOnErrorEnum.Abort },
            },
        };
        await startImportCommand.run(uri, errorMode);
        expect(apiProviderMock.provide).toHaveBeenCalled();
        expect(apiMock.startBulkImport).toHaveBeenCalledWith(expectedRequest);
    });
    test('should throw PineconeArgumentError for invalid errorMode', async () => {
        const uri = 's3://my-bucket/my-file.csv';
        const errorMode = 'invalid';
        await expect(startImportCommand.run(uri, errorMode)).rejects.toThrow(errors_1.PineconeArgumentError);
        expect(apiMock.startBulkImport).not.toHaveBeenCalled();
    });
    test('should use "continue" as default when errorMode is undefined', async () => {
        const uri = 's3://my-bucket/my-file.csv';
        const expectedRequest = {
            startImportRequest: {
                uri,
                errorMode: { onError: db_data_1.ImportErrorModeOnErrorEnum.Continue },
            },
        };
        await startImportCommand.run(uri, undefined);
        expect(apiProviderMock.provide).toHaveBeenCalled();
        expect(apiMock.startBulkImport).toHaveBeenCalledWith(expectedRequest);
    });
    test('should throw error when URI/1st arg is missing', async () => {
        const toThrow = async () => {
            // @ts-ignore
            await startImportCommand.run();
        };
        await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
        await expect(toThrow).rejects.toThrowError('`uri` field is required and must start with the scheme of a supported storage provider.');
    });
    test('should call listImport with correct request', async () => {
        const limit = 1;
        const expectedRequest = {
            limit,
        };
        await listImportCommand.run(limit);
        expect(apiProviderMock.provide).toHaveBeenCalled();
        expect(apiMock.listBulkImports).toHaveBeenCalledWith(expectedRequest);
    });
    test('should call describeImport with correct request', async () => {
        const importId = 'import-id';
        const req = { id: importId };
        await describeImportCommand.run(importId);
        expect(apiProviderMock.provide).toHaveBeenCalled();
        expect(apiMock.describeBulkImport).toHaveBeenCalledWith(req);
    });
    test('should call cancelImport with correct request', async () => {
        const importId = 'import-id';
        const req = { id: importId };
        await cancelImportCommand.run(importId);
        expect(apiProviderMock.provide).toHaveBeenCalled();
        expect(apiMock.cancelBulkImport).toHaveBeenCalledWith(req);
    });
});
//# sourceMappingURL=bulkImport.test.js.map