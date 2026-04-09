import type { CollectFn } from '@redocly/openapi-core/src/utils';
import type { TestContext, RunArgv, Workflow, RunWorkflowInput, WorkflowExecutionResult } from '../../types';
export declare function runTestFile(argv: RunArgv, output: {
    harFile?: string;
    jsonFile?: string;
}, collectSpecData?: CollectFn): Promise<{
    ctx: TestContext;
    harLogs: any;
    executedWorkflows: WorkflowExecutionResult[];
}>;
export declare function runWorkflow({ workflowInput, ctx, fromStepId, skipLineSeparator, parentStepId, invocationContext, }: RunWorkflowInput): Promise<WorkflowExecutionResult>;
export declare function resolveWorkflowContext(workflowId: string | undefined, resolvedWorkflow: Workflow, ctx: TestContext): Promise<TestContext>;
//# sourceMappingURL=runner.d.ts.map