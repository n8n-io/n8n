"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTestDescription = cleanupTestDescription;
// Scraps-out sensitive information from a test case
function cleanupTestDescription(testDescription) {
    const { workflows, arazzo, sourceDescriptions } = testDescription;
    const workflowsCleaned = [];
    workflows?.map((workflow) => {
        workflowsCleaned.push(cleanupWorkflow(workflow));
    });
    return {
        arazzo,
        sourceDescriptions,
        workflows: workflowsCleaned,
    };
}
function cleanupWorkflow(workflow) {
    const { workflowId, steps } = workflow;
    return {
        workflowId,
        steps: steps?.map(cleanupStep),
    };
}
function cleanupStep(step) {
    const { stepId, parameters, successCriteria } = step;
    return { stepId, successCriteria, parameters: parameters?.map(({ value: _, ...rest }) => rest) };
}
//# sourceMappingURL=cleanup-test-description.js.map