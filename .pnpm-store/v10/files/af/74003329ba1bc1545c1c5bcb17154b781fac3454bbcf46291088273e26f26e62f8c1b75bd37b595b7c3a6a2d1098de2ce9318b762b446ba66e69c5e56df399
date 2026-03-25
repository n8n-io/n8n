"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowIdUnique = void 0;
const WorkflowIdUnique = () => {
    const seenWorkflow = new Set();
    return {
        Workflow: {
            enter(workflow, { report, location }) {
                if (!workflow.workflowId)
                    return;
                if (seenWorkflow.has(workflow.workflowId)) {
                    report({
                        message: 'Every workflow must have a unique `workflowId`.',
                        location: location.child([workflow.workflowId]),
                    });
                }
                seenWorkflow.add(workflow.workflowId);
            },
        },
    };
};
exports.WorkflowIdUnique = WorkflowIdUnique;
