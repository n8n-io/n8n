"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTotals = calculateTotals;
function calculateTotals(workflows) {
    const totalWorkflows = workflows.length;
    let failedChecks = 0;
    let totalChecks = 0;
    let totalSteps = 0;
    let totalRequests = 0;
    let totalWarnings = 0;
    let totalSkipped = 0;
    let failedWorkflows = 0;
    const workflowsWithWarningsStepsChecks = new Set();
    let failedSteps = 0;
    const skippedSteps = new Set();
    const warningsSteps = new Set();
    for (const workflow of workflows) {
        const steps = flattenNestedSteps(workflow.executedSteps);
        let hasFailedSteps = false;
        for (const step of steps) {
            totalRequests++;
            if (step.retriesLeft && step.retriesLeft !== 0) {
                continue; // do not count retried steps as a step
            }
            totalSteps++;
            let hasFailedChecks = false;
            for (const check of step.checks) {
                totalChecks++;
                if (!check.passed) {
                    switch (check.severity) {
                        case 'warn':
                            totalWarnings++;
                            workflowsWithWarningsStepsChecks.add(workflow.workflowId);
                            warningsSteps.add(workflow.workflowId + ':' + step.stepId);
                            break;
                        case 'off':
                            totalSkipped++;
                            skippedSteps.add(workflow.workflowId + ':' + step.stepId);
                            break;
                        default:
                            failedChecks++;
                            hasFailedChecks = true;
                    }
                }
            }
            if (hasFailedChecks) {
                failedSteps++;
                hasFailedSteps = true;
            }
        }
        if (hasFailedSteps) {
            failedWorkflows++;
        }
    }
    return {
        workflows: {
            passed: totalWorkflows - failedWorkflows,
            failed: failedWorkflows,
            warnings: workflowsWithWarningsStepsChecks.size,
            skipped: 0,
            total: totalWorkflows,
        },
        steps: {
            passed: totalSteps - failedSteps,
            failed: failedSteps,
            warnings: warningsSteps.size,
            skipped: skippedSteps.size,
            total: totalSteps,
        },
        checks: {
            passed: totalChecks - failedChecks,
            failed: failedChecks,
            warnings: totalWarnings,
            skipped: totalSkipped,
            total: totalChecks,
        },
        totalRequests,
    };
}
function flattenNestedSteps(steps) {
    return steps.flatMap((step) => {
        if ('executedSteps' in step) {
            return flattenNestedSteps(step.executedSteps);
        }
        return [step];
    });
}
//# sourceMappingURL=calculate-tests-passed.js.map