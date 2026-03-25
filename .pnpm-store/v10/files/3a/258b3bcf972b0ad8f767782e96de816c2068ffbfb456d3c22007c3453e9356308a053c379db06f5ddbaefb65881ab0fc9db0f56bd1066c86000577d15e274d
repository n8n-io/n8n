"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import throws an error in internal CJS build, but seems to work fine after build
const reporters_1 = require("vitest/reporters");
const reporter_js_1 = require("./utils/reporter.cjs");
class LangSmithEvalReporter extends reporters_1.DefaultReporter {
    async onFinished(files, errors) {
        super.onFinished(files, errors);
        await (0, reporter_js_1.printVitestReporterTable)(files, this.ctx);
    }
    // @ts-expect-error Vitest 4.x introduces a new `onTestRunEnd` method
    async onTestRunEnd(testModules, unhandledErrors, reason) {
        // @ts-expect-error Vitest 4.x introduces a new `onTestRunEnd` method
        super.onTestRunEnd(testModules, unhandledErrors, reason);
        await (0, reporter_js_1.printVitestTestModulesReporterTable)(testModules);
    }
}
exports.default = LangSmithEvalReporter;
