"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepIdUnique = void 0;
const StepIdUnique = () => {
    return {
        Workflow: {
            enter(workflow, { report, location }) {
                if (!workflow.steps)
                    return;
                const seenSteps = new Set();
                for (const step of workflow.steps) {
                    if (!step.stepId)
                        return;
                    if (seenSteps.has(step.stepId)) {
                        report({
                            message: 'The `stepId` must be unique amongst all steps described in the workflow.',
                            location: location.child(['steps', workflow.steps.indexOf(step)]),
                        });
                    }
                    seenSteps.add(step.stepId);
                }
            },
        },
    };
};
exports.StepIdUnique = StepIdUnique;
