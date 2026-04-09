"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRunningWorkflows = resolveRunningWorkflows;
function resolveRunningWorkflows(workflows) {
    if (!workflows) {
        return undefined;
    }
    if (typeof workflows === 'string') {
        return workflows.includes(',') ? workflows.split(',').map((w) => w.trim()) : [workflows];
    }
    if (Array.isArray(workflows)) {
        const result = [];
        for (const workflow of workflows) {
            if (workflow.includes(',')) {
                result.push(...workflow.split(',').map((w) => w.trim()));
            }
            else {
                result.push(workflow);
            }
        }
        return result;
    }
    return undefined;
}
//# sourceMappingURL=resolve-running-workflows.js.map