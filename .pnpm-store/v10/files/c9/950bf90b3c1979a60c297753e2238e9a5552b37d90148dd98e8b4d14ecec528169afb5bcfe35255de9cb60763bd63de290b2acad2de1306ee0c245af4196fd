"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printVitestTestModulesReporterTable = exports.printVitestReporterTable = void 0;
const reporter_js_1 = require("../../utils/jestlike/reporter.cjs");
// Can't use types here because of module resolution issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const printVitestReporterTable = async (files, ctx) => {
    for (const file of files) {
        for (const task of file.tasks) {
            const testModule = ctx.state.getReportedEntity(task);
            const tests = [...testModule.children.allTests()].map((test) => {
                return {
                    title: test.name,
                    status: test.result()?.state ?? "skipped",
                    duration: Math.round(test.diagnostic()?.duration ?? 0),
                };
            });
            const result = ["pass", "fail", "skip"].includes(task.result?.state ?? "")
                ? task.result?.state
                : "skip";
            await (0, reporter_js_1.printReporterTable)(task.name, tests, result);
        }
    }
};
exports.printVitestReporterTable = printVitestReporterTable;
const printVitestTestModulesReporterTable = async (testModules) => {
    for (const testModule of testModules) {
        const tests = [...testModule.children.allTests()].map((test) => {
            return {
                title: test.name,
                status: test.result()?.state ?? "skipped",
                duration: Math.round(test.diagnostic()?.duration ?? 0),
            };
        });
        await (0, reporter_js_1.printReporterTable)(testModule.relativeModuleId, tests, testModule.state());
    }
};
exports.printVitestTestModulesReporterTable = printVitestTestModulesReporterTable;
