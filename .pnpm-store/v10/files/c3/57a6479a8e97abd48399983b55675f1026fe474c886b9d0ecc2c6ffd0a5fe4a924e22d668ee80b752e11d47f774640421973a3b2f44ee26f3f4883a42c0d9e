import { DefaultReporter } from "vitest/reporters";
import { RunnerTestFile } from "vitest";
import { type VitestTestModule } from "./utils/reporter.js";
declare class LangSmithEvalReporter extends DefaultReporter {
    onFinished(files: RunnerTestFile[], errors: unknown[]): Promise<void>;
    onTestRunEnd(testModules: VitestTestModule[], unhandledErrors: unknown[], reason: "passed" | "interrupted" | "failed"): Promise<void>;
}
export default LangSmithEvalReporter;
