/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import throws an error in internal CJS build, but seems to work fine after build
import { DefaultReporter } from "vitest/reporters";
import { printVitestReporterTable, printVitestTestModulesReporterTable, } from "./utils/reporter.js";
class LangSmithEvalReporter extends DefaultReporter {
    async onFinished(files, errors) {
        super.onFinished(files, errors);
        await printVitestReporterTable(files, this.ctx);
    }
    // @ts-expect-error Vitest 4.x introduces a new `onTestRunEnd` method
    async onTestRunEnd(testModules, unhandledErrors, reason) {
        // @ts-expect-error Vitest 4.x introduces a new `onTestRunEnd` method
        super.onTestRunEnd(testModules, unhandledErrors, reason);
        await printVitestTestModulesReporterTable(testModules);
    }
}
export default LangSmithEvalReporter;
