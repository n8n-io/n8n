"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlerBuildCommand = void 0;
const redoc_1 = require("redoc");
const path_1 = require("path");
const fs_1 = require("fs");
const perf_hooks_1 = require("perf_hooks");
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("./utils");
const miscellaneous_1 = require("../../utils/miscellaneous");
const handlerBuildCommand = async ({ argv, config: configFromFile, collectSpecData, }) => {
    const startedAt = perf_hooks_1.performance.now();
    const config = (0, openapi_core_1.getMergedConfig)(configFromFile, argv.api);
    const apis = await (0, miscellaneous_1.getFallbackApisOrExit)(argv.api ? [argv.api] : [], config);
    const { path: pathToApi } = apis[0];
    const options = {
        output: argv.o,
        title: argv.title,
        disableGoogleFont: argv.disableGoogleFont,
        templateFileName: argv.template,
        templateOptions: argv.templateOptions || {},
        redocOptions: (0, utils_1.getObjectOrJSON)(argv.theme?.openapi, config),
    };
    const redocCurrentVersion = require('../../../package.json').dependencies.redoc;
    try {
        const elapsed = (0, miscellaneous_1.getExecutionTime)(startedAt);
        const api = await (0, redoc_1.loadAndBundleSpec)((0, openapi_core_1.isAbsoluteUrl)(pathToApi) ? pathToApi : (0, path_1.resolve)(pathToApi));
        collectSpecData?.(api);
        const pageHTML = await (0, utils_1.getPageHTML)(api, pathToApi, { ...options, redocCurrentVersion }, argv.config);
        (0, fs_1.mkdirSync)((0, path_1.dirname)(options.output), { recursive: true });
        (0, fs_1.writeFileSync)(options.output, pageHTML);
        const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
        process.stdout.write(`\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`);
    }
    catch (e) {
        (0, miscellaneous_1.exitWithError)(e);
    }
};
exports.handlerBuildCommand = handlerBuildCommand;
