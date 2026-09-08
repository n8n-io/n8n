import { NodeOperationError, } from 'n8n-workflow';
import { validateRunCodeAllItems, validateRunCodeEachItem } from './result-validation';
import { throwExecutionError } from './throw-execution-error';
const PYTHON_TEXT_KEYS = {
    object: { singular: 'dictionary', plural: 'dictionaries' },
};
export class PythonTaskRunnerSandbox {
    pythonCode;
    nodeMode;
    workflowMode;
    executeFunctions;
    additionalProperties;
    constructor(pythonCode, nodeMode, workflowMode, executeFunctions, additionalProperties = {}) {
        this.pythonCode = pythonCode;
        this.nodeMode = nodeMode;
        this.workflowMode = workflowMode;
        this.executeFunctions = executeFunctions;
        this.additionalProperties = additionalProperties;
    }
    validateCode() {
        if (typeof this.pythonCode !== 'string') {
            throw new NodeOperationError(this.executeFunctions.getNode(), 'No Python code found to execute. Please add code to the Code node.');
        }
    }
    /**
     * Run a script by forwarding it to a Python task runner, together with input items.
     *
     * The Python runner receives input items together with the task, whereas the
     * JavaScript runner does _not_ receive input items together with the task and
     * instead retrieves them later, only if needed, via an RPC request.
     */
    async runUsingIncomingItems() {
        this.validateCode();
        const itemIndex = 0;
        const node = this.executeFunctions.getNode();
        const workflow = this.executeFunctions.getWorkflow();
        const taskSettings = {
            code: this.pythonCode,
            nodeMode: this.nodeMode,
            workflowMode: this.workflowMode,
            continueOnFail: this.executeFunctions.continueOnFail(),
            items: this.executeFunctions.getInputData(),
            nodeId: node.id,
            nodeName: node.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
        };
        const executionResult = await this.executeFunctions.startJob('python', taskSettings, itemIndex);
        if (!executionResult.ok) {
            return throwExecutionError('error' in executionResult ? executionResult.error : {});
        }
        if (this.nodeMode === 'runOnceForAllItems') {
            return validateRunCodeAllItems(executionResult.result, PYTHON_TEXT_KEYS, this.executeFunctions.helpers.normalizeItems.bind(this.executeFunctions.helpers));
        }
        return executionResult.result.map((item, index) => validateRunCodeEachItem(item, index, PYTHON_TEXT_KEYS, this.executeFunctions.helpers.normalizeItems.bind(this.executeFunctions.helpers)));
    }
    /**
     * Run a script for tool execution.
     *
     * Unlike `runUsingIncomingItems`, this method:
     * - Sends empty items (tools don't process workflow items)
     * - Passes `query` from `additionalProperties` to the runner
     * - Does not validate the result from the runner (tools can return any type)
     */
    async runCodeForTool() {
        this.validateCode();
        const itemIndex = 0;
        const node = this.executeFunctions.getNode();
        const workflow = this.executeFunctions.getWorkflow();
        const taskSettings = {
            code: this.pythonCode,
            nodeMode: 'runOnceForAllItems',
            workflowMode: this.workflowMode,
            continueOnFail: this.executeFunctions.continueOnFail(),
            items: [],
            nodeId: node.id,
            nodeName: node.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
            query: this.additionalProperties.query,
        };
        const executionResult = await this.executeFunctions.startJob('python', taskSettings, itemIndex);
        if (!executionResult.ok) {
            return throwExecutionError('error' in executionResult ? executionResult.error : {});
        }
        return executionResult.result;
    }
}
//# sourceMappingURL=PythonTaskRunnerSandbox.js.map