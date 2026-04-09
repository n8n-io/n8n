"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuntimeExpressionCtx = createRuntimeExpressionCtx;
// import type { OperationDetails } from '../../description-parser';
function createRuntimeExpressionCtx({ ctx, workflowId, step, }) {
    if (!step || !workflowId) {
        return {
            $statusCode: undefined,
            $method: '',
            $response: undefined,
            $url: '',
            $request: undefined,
            $outputs: ctx.$outputs,
            $steps: ctx.$steps,
            $workflows: ctx.$workflows,
            $inputs: ctx.$inputs,
            $sourceDescriptions: ctx.$sourceDescriptions,
            $components: ctx.$components,
            $faker: ctx.$faker,
        };
    }
    const request = ctx.$workflows[workflowId].steps[step.stepId].request;
    const requestPathParameters = request?.path;
    const requestQueryParameters = request?.query;
    const requestBody = request?.body || {};
    const requestHeaders = request?.header;
    const method = request?.method;
    const resultStatusCode = step.response?.statusCode;
    const responseHeaders = step.response?.header || {};
    const responseBody = step.response?.body || {};
    return {
        $statusCode: resultStatusCode,
        $method: method,
        $response: {
            header: responseHeaders,
            body: responseBody,
            path: requestPathParameters,
            query: requestQueryParameters,
        },
        $url: request && request.url,
        $request: {
            header: requestHeaders,
            body: requestBody,
            path: requestPathParameters,
            query: requestQueryParameters,
        },
        $outputs: ctx.$outputs,
        $steps: ctx.$steps,
        $workflows: ctx.$workflows,
        $inputs: ctx.$inputs,
        $sourceDescriptions: ctx.$sourceDescriptions,
        $components: ctx.$components,
        $faker: ctx.$faker,
    };
}
//# sourceMappingURL=create-runtime-expression-ctx.js.map