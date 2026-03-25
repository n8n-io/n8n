"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const path = require("path");
const openapiCore = require("@redocly/openapi-core");
const colorette_1 = require("colorette");
const miscellaneous_1 = require("../../../utils/__mocks__/miscellaneous");
const utils = require('../../../utils/miscellaneous');
jest.mock('../../../utils/miscellaneous', () => ({
    ...jest.requireActual('../../../utils/miscellaneous'),
    writeToFileByExtension: jest.fn(),
}));
jest.mock('@redocly/openapi-core', () => ({
    ...jest.requireActual('@redocly/openapi-core'),
    isRef: jest.fn(),
}));
describe('#split', () => {
    const openapiDir = 'test';
    const componentsFiles = {};
    it('should split the file and show the success message', async () => {
        const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
        await (0, index_1.handleSplit)({
            argv: {
                api: filePath,
                outDir: openapiDir,
                separator: '_',
            },
            config: (0, miscellaneous_1.loadConfigAndHandleErrors)(),
            version: 'cli-version',
        });
        expect(process.stderr.write).toBeCalledTimes(2);
        expect(process.stderr.write.mock.calls[0][0]).toBe(`🪓 Document: ${(0, colorette_1.blue)(filePath)} ${(0, colorette_1.green)('is successfully split')}
    and all related files are saved to the directory: ${(0, colorette_1.blue)(openapiDir)} \n`);
        expect(process.stderr.write.mock.calls[1][0]).toContain(`${filePath}: split processed in <test>ms`);
    });
    it('should use the correct separator', async () => {
        const filePath = 'packages/cli/src/commands/split/__tests__/fixtures/spec.json';
        jest.spyOn(utils, 'pathToFilename').mockImplementation(() => 'newFilePath');
        await (0, index_1.handleSplit)({
            argv: {
                api: filePath,
                outDir: openapiDir,
                separator: '_',
            },
            config: (0, miscellaneous_1.loadConfigAndHandleErrors)(),
            version: 'cli-version',
        });
        expect(utils.pathToFilename).toBeCalledWith(expect.anything(), '_');
        utils.pathToFilename.mockRestore();
    });
    it('should have correct path with paths', () => {
        const openapi = require('./fixtures/spec.json');
        jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'paths/test.yaml');
        jest.spyOn(path, 'relative').mockImplementation(() => 'paths/test.yaml');
        (0, index_1.iteratePathItems)(openapi.paths, openapiDir, path.join(openapiDir, 'paths'), componentsFiles, '_', undefined, 'yaml');
        expect(openapiCore.slash).toHaveBeenCalledWith('paths/test.yaml');
        expect(path.relative).toHaveBeenCalledWith('test', 'test/paths/test.yaml');
    });
    it('should have correct path with webhooks', () => {
        const openapi = require('./fixtures/webhooks.json');
        jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
        jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
        (0, index_1.iteratePathItems)(openapi.webhooks, openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, 'webhook_', undefined, 'yaml');
        expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
        expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
    });
    it('should have correct path with x-webhooks', () => {
        const openapi = require('./fixtures/spec.json');
        jest.spyOn(openapiCore, 'slash').mockImplementation(() => 'webhooks/test.yaml');
        jest.spyOn(path, 'relative').mockImplementation(() => 'webhooks/test.yaml');
        (0, index_1.iteratePathItems)(openapi['x-webhooks'], openapiDir, path.join(openapiDir, 'webhooks'), componentsFiles, 'webhook_', undefined, 'yaml');
        expect(openapiCore.slash).toHaveBeenCalledWith('webhooks/test.yaml');
        expect(path.relative).toHaveBeenCalledWith('test', 'test/webhooks/test.yaml');
    });
    it('should create correct folder name for code samples', async () => {
        const openapi = require('./fixtures/samples.json');
        const fs = require('fs');
        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { });
        jest.spyOn(utils, 'escapeLanguageName');
        (0, index_1.iteratePathItems)(openapi.paths, openapiDir, path.join(openapiDir, 'paths'), componentsFiles, '_', undefined, 'yaml');
        expect(utils.escapeLanguageName).nthCalledWith(1, 'C#');
        expect(utils.escapeLanguageName).nthReturnedWith(1, 'C_sharp');
        expect(utils.escapeLanguageName).nthCalledWith(2, 'C/AL');
        expect(utils.escapeLanguageName).nthReturnedWith(2, 'C_AL');
        expect(utils.escapeLanguageName).nthCalledWith(3, 'Visual Basic');
        expect(utils.escapeLanguageName).nthReturnedWith(3, 'VisualBasic');
        expect(utils.escapeLanguageName).toBeCalledTimes(3);
        utils.escapeLanguageName.mockRestore();
    });
});
