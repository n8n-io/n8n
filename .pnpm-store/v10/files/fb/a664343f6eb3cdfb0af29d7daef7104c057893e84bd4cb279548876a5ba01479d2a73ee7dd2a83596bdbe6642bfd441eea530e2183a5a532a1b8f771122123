"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowsToRun = getWorkflowsToRun;
const colorette_1 = require("colorette");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
function getWorkflowsToRun(workflows, workflowsToRun, workflowsToSkip) {
    let filteredWorkflows = [];
    if (workflowsToRun && workflowsToRun.length) {
        filteredWorkflows = filterWorkflowsToRun(workflows, workflowsToRun);
    }
    else if (workflowsToSkip && workflowsToSkip.length) {
        filteredWorkflows = filterWorkflowsToSkip(workflows, workflowsToSkip);
    }
    else {
        filteredWorkflows = workflows;
    }
    return filteredWorkflows;
}
function filterWorkflowsToSkip(workflows, workflowsToSkip) {
    const workflowsToRun = workflows.filter((workflow) => !workflowsToSkip.includes(workflow.workflowId));
    if (!workflowsToRun.length) {
        logger.log(`${(0, colorette_1.red)('All workflows are skipped')}`);
        logger.printNewLine();
        return [];
    }
    logger.log(`${(0, colorette_1.yellow)(`Following workflows are skipped: ${workflowsToSkip.join(', ')}`)}`);
    logger.printNewLine();
    return workflowsToRun;
}
function filterWorkflowsToRun(workflows, workflowsToRun) {
    const filteredWorkflows = filterWorkflowsByIds(workflows, workflowsToRun);
    if (!filteredWorkflows.length) {
        throw new Error(`Following workflows don't exist: ${workflowsToRun.join(', ')}`);
    }
    if (filteredWorkflows.length === workflowsToRun.length) {
        return filteredWorkflows;
    }
    else {
        const notExistingWorkflows = workflowsToRun.filter((workflowId) => {
            return !workflows.find((workflow) => workflow.workflowId === workflowId);
        });
        logger.log(`Following workflows don't exist: ${notExistingWorkflows.join(', ')}`);
        return filteredWorkflows;
    }
}
function filterWorkflowsByIds(workflows, workflowIds) {
    return workflows.filter((workflow) => workflowIds.includes(workflow.workflowId));
}
//# sourceMappingURL=get-workflows-to-run.js.map