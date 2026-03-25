"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openapi_core_1 = require("@redocly/openapi-core");
const bundle_1 = require("../../commands/bundle");
const miscellaneous_1 = require("../../utils/miscellaneous");
const wrapper_1 = require("../../wrapper");
jest.mock('@redocly/openapi-core');
jest.mock('../../utils/miscellaneous');
// @ts-ignore
miscellaneous_1.getOutputFileName = jest.requireActual('../../utils/miscellaneous').getOutputFileName;
openapi_core_1.getMergedConfig.mockImplementation((config) => config);
describe('bundle', () => {
    let processExitMock;
    let exitCb;
    let stderrWriteMock;
    let stdoutWriteMock;
    beforeEach(() => {
        processExitMock = jest.spyOn(process, 'exit').mockImplementation();
        jest.spyOn(process, 'once').mockImplementation((_e, cb) => {
            exitCb = cb;
            return process.on(_e, cb);
        });
        stderrWriteMock = jest.spyOn(process.stderr, 'write').mockImplementation(jest.fn());
        stdoutWriteMock = jest.spyOn(process.stdout, 'write').mockImplementation(jest.fn());
    });
    afterEach(() => {
        openapi_core_1.bundle.mockClear();
        openapi_core_1.getTotals.mockReset();
        stderrWriteMock.mockRestore();
        stdoutWriteMock.mockRestore();
    });
    it('bundles definitions', async () => {
        const apis = ['foo.yaml', 'bar.yaml'];
        await (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)({
            apis,
            ext: 'yaml',
        });
        expect(openapi_core_1.bundle).toBeCalledTimes(apis.length);
    });
    it('exits with code 0 when bundles definitions', async () => {
        const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];
        await (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)({
            apis,
            ext: 'yaml',
        });
        await exitCb?.();
        expect(processExitMock).toHaveBeenCalledWith(0);
    });
    it('exits with code 0 when bundles definitions w/o errors', async () => {
        const apis = ['foo.yaml', 'bar.yaml', 'foobar.yaml'];
        await (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)({
            apis,
            ext: 'yaml',
        });
        await exitCb?.();
        expect(processExitMock).toHaveBeenCalledWith(0);
    });
    it('exits with code 1 when bundles definitions w/errors', async () => {
        const apis = ['foo.yaml'];
        openapi_core_1.getTotals.mockReturnValue({
            errors: 1,
            warnings: 0,
            ignored: 0,
        });
        await (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)({
            apis,
            ext: 'yaml',
        });
        await exitCb?.();
        expect(processExitMock).toHaveBeenCalledWith(1);
    });
    it('handleError is called when bundles an invalid definition', async () => {
        const apis = ['invalid.json'];
        openapi_core_1.bundle.mockImplementationOnce(() => {
            throw new Error('Invalid definition');
        });
        await (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)({
            apis,
            ext: 'json',
        });
        expect(miscellaneous_1.handleError).toHaveBeenCalledTimes(1);
        expect(miscellaneous_1.handleError).toHaveBeenCalledWith(new Error('Invalid definition'), 'invalid.json');
    });
    it("handleError isn't called when bundles a valid definition", async () => {
        const apis = ['foo.yaml'];
        openapi_core_1.getTotals.mockReturnValue({
            errors: 0,
            warnings: 0,
            ignored: 0,
        });
        await (0, wrapper_1.commandWrapper)(bundle_1.handleBundle)({
            apis,
            ext: 'yaml',
        });
        expect(miscellaneous_1.handleError).toHaveBeenCalledTimes(0);
    });
    describe('per api output', () => {
        it('should store bundled API descriptions in the output files described in the apis section of config IF no positional apis provided AND output is specified for both apis', async () => {
            const apis = {
                foo: {
                    root: 'foo.yaml',
                    output: 'output/foo.yaml',
                },
                bar: {
                    root: 'bar.yaml',
                    output: 'output/bar.json',
                },
            };
            const config = {
                apis,
                styleguide: {
                    skipPreprocessors: jest.fn(),
                    skipDecorators: jest.fn(),
                },
            };
            // @ts-ignore
            miscellaneous_1.getFallbackApisOrExit = jest
                .fn()
                .mockResolvedValueOnce(Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias })));
            openapi_core_1.getTotals.mockReturnValue({
                errors: 0,
                warnings: 0,
                ignored: 0,
            });
            await (0, bundle_1.handleBundle)({
                argv: { apis: [] }, // positional
                version: 'test',
                config,
            });
            expect(miscellaneous_1.saveBundle).toBeCalledTimes(2);
            expect(miscellaneous_1.saveBundle).toHaveBeenNthCalledWith(1, 'output/foo.yaml', expect.any(String));
            expect(miscellaneous_1.saveBundle).toHaveBeenNthCalledWith(2, 'output/bar.json', expect.any(String));
        });
        it('should store bundled API descriptions in the output files described in the apis section of config AND print the bundled api without the output specified to the terminal IF no positional apis provided AND output is specified for one api', async () => {
            const apis = {
                foo: {
                    root: 'foo.yaml',
                    output: 'output/foo.yaml',
                },
                bar: {
                    root: 'bar.yaml',
                },
            };
            const config = {
                apis,
                styleguide: {
                    skipPreprocessors: jest.fn(),
                    skipDecorators: jest.fn(),
                },
            };
            // @ts-ignore
            miscellaneous_1.getFallbackApisOrExit = jest
                .fn()
                .mockResolvedValueOnce(Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias })));
            openapi_core_1.getTotals.mockReturnValue({
                errors: 0,
                warnings: 0,
                ignored: 0,
            });
            await (0, bundle_1.handleBundle)({
                argv: { apis: [] }, // positional
                version: 'test',
                config,
            });
            expect(miscellaneous_1.saveBundle).toBeCalledTimes(1);
            expect(miscellaneous_1.saveBundle).toHaveBeenCalledWith('output/foo.yaml', expect.any(String));
            expect(process.stdout.write).toHaveBeenCalledTimes(1);
        });
        it('should NOT store bundled API descriptions in the output files described in the apis section of config IF there is a positional api provided', async () => {
            const apis = {
                foo: {
                    root: 'foo.yaml',
                    output: 'output/foo.yaml',
                },
            };
            const config = {
                apis,
                styleguide: {
                    skipPreprocessors: jest.fn(),
                    skipDecorators: jest.fn(),
                },
            };
            // @ts-ignore
            miscellaneous_1.getFallbackApisOrExit = jest.fn().mockResolvedValueOnce([{ path: 'openapi.yaml' }]);
            openapi_core_1.getTotals.mockReturnValue({
                errors: 0,
                warnings: 0,
                ignored: 0,
            });
            await (0, bundle_1.handleBundle)({
                argv: { apis: ['openapi.yaml'] }, // positional
                version: 'test',
                config,
            });
            expect(miscellaneous_1.saveBundle).toBeCalledTimes(0);
            expect(process.stdout.write).toHaveBeenCalledTimes(1);
        });
        it('should store bundled API descriptions in the directory specified in argv IF multiple positional apis provided AND --output specified', async () => {
            const apis = {
                foo: {
                    root: 'foo.yaml',
                    output: 'output/foo.yaml',
                },
                bar: {
                    root: 'bar.yaml',
                    output: 'output/bar.json',
                },
            };
            const config = {
                apis,
                styleguide: {
                    skipPreprocessors: jest.fn(),
                    skipDecorators: jest.fn(),
                },
            };
            // @ts-ignore
            miscellaneous_1.getFallbackApisOrExit = jest
                .fn()
                .mockResolvedValueOnce(Object.entries(apis).map(([alias, { root, ...api }]) => ({ ...api, path: root, alias })));
            openapi_core_1.getTotals.mockReturnValue({
                errors: 0,
                warnings: 0,
                ignored: 0,
            });
            await (0, bundle_1.handleBundle)({
                argv: { apis: ['foo.yaml', 'bar.yaml'], output: 'dist' }, // cli options
                version: 'test',
                config,
            });
            expect(miscellaneous_1.saveBundle).toBeCalledTimes(2);
            expect(miscellaneous_1.saveBundle).toHaveBeenNthCalledWith(1, 'dist/foo.yaml', expect.any(String));
            expect(miscellaneous_1.saveBundle).toHaveBeenNthCalledWith(2, 'dist/bar.yaml', expect.any(String));
        });
    });
});
