import { EventEmitter } from 'events';
import { validateRunCodeAllItems, validateRunCodeEachItem } from './result-validation';
export function getSandboxContext(index) {
    const helpers = {
        ...this.helpers,
        httpRequestWithAuthentication: this.helpers.httpRequestWithAuthentication.bind(this),
        requestWithAuthenticationPaginated: this.helpers.requestWithAuthenticationPaginated.bind(this),
    };
    return {
        // from NodeExecuteFunctions
        $getNodeParameter: this.getNodeParameter.bind(this),
        $getWorkflowStaticData: this.getWorkflowStaticData.bind(this),
        helpers,
        // to bring in all $-prefixed vars and methods from WorkflowDataProxy
        // $node, $items(), $parameter, $json, $env, etc.
        ...this.getWorkflowDataProxy(index),
    };
}
export class Sandbox extends EventEmitter {
    textKeys;
    helpers;
    constructor(textKeys, helpers) {
        super();
        this.textKeys = textKeys;
        this.helpers = helpers;
    }
    validateRunCodeEachItem(executionResult, itemIndex) {
        return validateRunCodeEachItem(executionResult, itemIndex, this.textKeys, this.helpers.normalizeItems.bind(this.helpers));
    }
    validateRunCodeAllItems(executionResult) {
        return validateRunCodeAllItems(executionResult, this.textKeys, this.helpers.normalizeItems.bind(this.helpers));
    }
}
//# sourceMappingURL=Sandbox.js.map