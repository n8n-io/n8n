import { type VitestTestModule } from "./utils/reporter.js";
declare const DefaultReporter: any;
declare class LangSmithEvalReporter extends DefaultReporter {
    private skipOnFinished;
    onFinished(files: unknown[], errors: unknown[]): Promise<void>;
    onTestRunEnd(testModules: VitestTestModule[], unhandledErrors: {
        message: string;
        name?: string;
    }[], reason: "passed" | "interrupted" | "failed"): Promise<void>;
}
export default LangSmithEvalReporter;
