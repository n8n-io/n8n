import { type Totals } from '@redocly/openapi-core';
import { type Check, type VerboseLog, type Step } from '../types';
export declare const RESET_ESCAPE_CODE: string;
export declare function removeExtraIndentation(message: string | undefined): string;
export declare function indent(str: string, level: number): string;
export declare function printWorkflowSeparatorLine(): void;
export declare function printWorkflowSeparator(fileName: string, workflowName: string | undefined, skipLineSeparator?: boolean): void;
export declare function printRequiredWorkflowSeparator(parentWorkflowId: string): void;
export declare function printChildWorkflowSeparator(parentStepId: string): void;
export declare function printActionsSeparator(stepId: string, actionName: string, kind: 'failure' | 'success'): void;
export declare function printStepSeparatorLine(): void;
export declare function printConfigLintTotals(totals: Totals): void;
export declare function printStepDetails({ testNameToDisplay, checks, verboseLogs, verboseResponseLogs, }: {
    testNameToDisplay: string;
    checks: Check[];
    verboseLogs?: VerboseLog;
    verboseResponseLogs?: VerboseLog;
}): void;
export declare function printUnknownStep(step: Step): void;
//# sourceMappingURL=cli-outputs.d.ts.map