"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowDependsOn = void 0;
const WorkflowDependsOn = () => {
    const seenWorkflow = new Set();
    const existingSourceDescriptions = new Set();
    const existingWorkflowIds = new Set();
    return {
        SourceDescriptions: {
            enter(sourceDescriptions) {
                for (const sourceDescription of sourceDescriptions) {
                    existingSourceDescriptions.add(sourceDescription.name);
                }
            },
        },
        Workflows: {
            enter(workflows) {
                for (const workflow of workflows) {
                    existingWorkflowIds.add(workflow.workflowId);
                }
            },
        },
        Workflow: {
            leave(workflow, { report, location }) {
                if (!workflow.dependsOn)
                    return;
                for (const item of workflow.dependsOn) {
                    // Possible dependsOn workflow pattern: $sourceDescriptions.<name>.<workflowId>
                    if (item.startsWith('$sourceDescriptions.')) {
                        const sourceDescriptionName = item.split('.')[1];
                        if (!existingSourceDescriptions.has(sourceDescriptionName)) {
                            report({
                                message: `SourceDescription ${sourceDescriptionName} must be defined in sourceDescriptions.`,
                                location: location.child([`dependsOn`, workflow.dependsOn.indexOf(item)]),
                            });
                        }
                    }
                    if (!item.startsWith('$sourceDescriptions') && !existingWorkflowIds.has(item)) {
                        report({
                            message: `Workflow ${item} must be defined in workflows.`,
                            location: location.child([`dependsOn`, workflow.dependsOn.indexOf(item)]),
                        });
                    }
                    if (seenWorkflow.has(item)) {
                        report({
                            message: 'Every workflow in dependsOn must be unique.',
                            location: location.child([`dependsOn`]),
                        });
                    }
                    seenWorkflow.add(item);
                }
            },
        },
    };
};
exports.WorkflowDependsOn = WorkflowDependsOn;
