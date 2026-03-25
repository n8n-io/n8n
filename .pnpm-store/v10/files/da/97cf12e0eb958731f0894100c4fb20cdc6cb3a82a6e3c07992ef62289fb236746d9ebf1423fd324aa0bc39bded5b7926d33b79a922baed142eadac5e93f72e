"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const miscellaneous_1 = require("../utils/miscellaneous");
const process = require("process");
const wrapper_1 = require("../wrapper");
const lint_1 = require("../commands/lint");
const push_1 = require("../commands/push");
const openapi_core_1 = require("@redocly/openapi-core");
const mockFetch = jest.fn();
const originalFetch = global.fetch;
jest.mock('../utils/miscellaneous', () => ({
    sendTelemetry: jest.fn(),
    loadConfigAndHandleErrors: jest.fn(),
}));
beforeAll(() => {
    global.fetch = mockFetch;
});
afterAll(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
});
jest.mock('../commands/lint', () => ({
    handleLint: jest.fn().mockImplementation(({ collectSpecData }) => {
        collectSpecData({ openapi: '3.1.0' });
    }),
    lintConfigCallback: jest.fn(),
}));
describe('commandWrapper', () => {
    it('should send telemetry if there is "telemetry: on" in the config', async () => {
        miscellaneous_1.loadConfigAndHandleErrors.mockImplementation(() => {
            return { telemetry: 'on', styleguide: { recommendedFallback: true } };
        });
        openapi_core_1.detectSpec.mockImplementationOnce(() => {
            return 'oas3_1';
        });
        process.env.REDOCLY_TELEMETRY = 'on';
        const wrappedHandler = (0, wrapper_1.commandWrapper)(lint_1.handleLint);
        await wrappedHandler({});
        expect(lint_1.handleLint).toHaveBeenCalledTimes(1);
        expect(miscellaneous_1.sendTelemetry).toHaveBeenCalledTimes(1);
        expect(miscellaneous_1.sendTelemetry).toHaveBeenCalledWith({}, 0, false, 'oas3_1', 'openapi', '3.1.0');
    });
    it('should not collect spec version if the file is not parsed to json', async () => {
        miscellaneous_1.loadConfigAndHandleErrors.mockImplementation(() => {
            return { telemetry: 'on', styleguide: { recommendedFallback: true } };
        });
        lint_1.handleLint.mockImplementation(({ collectSpecData }) => {
            collectSpecData();
        });
        process.env.REDOCLY_TELEMETRY = 'on';
        const wrappedHandler = (0, wrapper_1.commandWrapper)(lint_1.handleLint);
        await wrappedHandler({});
        expect(lint_1.handleLint).toHaveBeenCalledTimes(1);
        expect(miscellaneous_1.sendTelemetry).toHaveBeenCalledTimes(1);
        expect(miscellaneous_1.sendTelemetry).toHaveBeenCalledWith({}, 0, false, undefined, undefined, undefined);
    });
    it('should NOT send telemetry if there is "telemetry: off" in the config', async () => {
        miscellaneous_1.loadConfigAndHandleErrors.mockImplementation(() => {
            return { telemetry: 'off', styleguide: { recommendedFallback: true } };
        });
        process.env.REDOCLY_TELEMETRY = 'on';
        const wrappedHandler = (0, wrapper_1.commandWrapper)(lint_1.handleLint);
        await wrappedHandler({});
        expect(lint_1.handleLint).toHaveBeenCalledTimes(1);
        expect(miscellaneous_1.sendTelemetry).toHaveBeenCalledTimes(0);
    });
    it('should pass files from arguments to config', async () => {
        const filesToPush = ['test1.yaml', 'test2.yaml'];
        const loadConfigMock = miscellaneous_1.loadConfigAndHandleErrors;
        const argv = {
            files: filesToPush,
        };
        await (0, wrapper_1.commandWrapper)(push_1.handlePush)(argv);
        expect(loadConfigMock).toHaveBeenCalledWith(expect.objectContaining({ files: filesToPush }));
    });
});
