"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicWorkflows = getPublicWorkflows;
const inputs_1 = require("../inputs");
const set_public_steps_1 = require("./set-public-steps");
function getPublicWorkflows({ workflows, inputs, env = {}, }) {
    const publicWorkflows = {};
    for (const workflow of workflows) {
        const workflowInputSchema = workflow.inputs;
        let resolvedInputs = {};
        let resolvedDotEnvInputs = {};
        if (workflowInputSchema) {
            resolvedInputs = (0, inputs_1.resolveInputValuesToSchema)(inputs, workflowInputSchema);
        }
        if (workflowInputSchema?.properties?.env) {
            resolvedDotEnvInputs = (0, inputs_1.resolveInputValuesToSchema)(env || {}, workflowInputSchema.properties.env);
        }
        const mergedInputs = Object.keys(resolvedDotEnvInputs).length > 0
            ? { ...resolvedInputs, env: resolvedDotEnvInputs }
            : resolvedInputs;
        publicWorkflows[workflow.workflowId] = {
            steps: (0, set_public_steps_1.getPublicSteps)(workflow.steps || []),
            inputs: workflowInputSchema ? mergedInputs : undefined,
            outputs: workflow.outputs,
        };
    }
    return publicWorkflows;
}
//# sourceMappingURL=set-public-workflows.js.map