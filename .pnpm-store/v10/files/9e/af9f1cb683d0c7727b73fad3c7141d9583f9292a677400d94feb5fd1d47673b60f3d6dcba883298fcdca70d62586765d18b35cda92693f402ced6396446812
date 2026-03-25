"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redoc_1 = require("redoc");
const server_1 = require("react-dom/server");
const build_docs_1 = require("../../commands/build-docs");
const utils_1 = require("../../commands/build-docs/utils");
const miscellaneous_1 = require("../../utils/miscellaneous");
jest.mock('redoc');
jest.mock('fs');
jest.mock('../../utils/miscellaneous');
const config = {
    output: '',
    title: 'Test',
    disableGoogleFont: false,
    templateFileName: '',
    templateOptions: {},
    redocOptions: {},
};
jest.mock('react-dom/server', () => ({
    renderToString: jest.fn(),
}));
jest.mock('handlebars', () => ({
    compile: jest.fn(() => jest.fn(() => '<html></html>')),
}));
describe('build-docs', () => {
    it('should return correct html and call function for ssr', async () => {
        const result = await (0, utils_1.getPageHTML)({}, '../some-path/openapi.yaml', {
            ...config,
            redocCurrentVersion: '2.0.0',
        });
        expect(server_1.renderToString).toBeCalledTimes(1);
        expect(redoc_1.createStore).toBeCalledTimes(1);
        expect(result).toBe('<html></html>');
    });
    it('should work correctly when calling handlerBuildCommand', async () => {
        const processExitMock = jest.spyOn(process, 'exit').mockImplementation();
        await (0, build_docs_1.handlerBuildCommand)({
            argv: {
                o: '',
                title: 'test',
                disableGoogleFont: false,
                template: '',
                templateOptions: {},
                theme: { openapi: {} },
                api: '../some-path/openapi.yaml',
            },
            config: {},
            version: 'cli-version',
        });
        expect(redoc_1.loadAndBundleSpec).toBeCalledTimes(1);
        expect(miscellaneous_1.getFallbackApisOrExit).toBeCalledTimes(1);
        expect(processExitMock).toBeCalledTimes(0);
    });
});
