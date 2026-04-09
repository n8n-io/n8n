"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareRequest = prepareRequest;
const description_parser_1 = require("../description-parser");
const config_parser_1 = require("../config-parser");
const get_server_url_1 = require("./get-server-url");
const context_1 = require("./context");
const runtime_expressions_1 = require("../runtime-expressions");
async function prepareRequest(ctx, step, workflowName) {
    const { stepId, operationId, operationPath, 'x-operation': xOperation } = step;
    const activeWorkflow = ctx.workflows.find((workflow) => workflow.workflowId === workflowName);
    const workflowLevelParameters = (activeWorkflow && activeWorkflow.parameters) || [];
    const openapiOperation = xOperation
        ? undefined
        : (0, description_parser_1.getOperationFromDescriptionBySource)({
            operationId,
            operationPath,
        }, ctx);
    let path = '';
    let method;
    const serverUrl = (0, get_server_url_1.getServerUrl)({
        ctx,
        descriptionName: openapiOperation?.descriptionName,
        openapiOperation,
        xOperation,
    });
    if (xOperation) {
        method = xOperation.method;
    }
    else if (openapiOperation) {
        path = openapiOperation?.path;
        method = openapiOperation?.method;
    }
    else {
        // this should never happen, making typescript happy
        throw new Error('No operation found');
    }
    if (!serverUrl && !path.includes('http')) {
        throw new Error('No servers found in API description');
    }
    if (!method) {
        throw new Error('"method" is required to make a request');
    }
    const requestDataFromOpenAPI = openapiOperation && (0, description_parser_1.getRequestDataFromOpenApi)(openapiOperation);
    const { payload: stepRequestBodyPayload, 
    // encoding: stepRequestBodyEncoding,
    contentType: stepRequestBodyContentType, replacements, } = await (0, config_parser_1.parseRequestBody)(step['requestBody'], ctx);
    const requestBody = stepRequestBodyPayload || requestDataFromOpenAPI?.requestBody;
    const contentType = stepRequestBodyContentType || requestDataFromOpenAPI?.contentType;
    const parameters = joinParameters(
    // order is important here, the last one wins
    typeof requestBody === 'object'
        ? [{ in: 'header', name: 'content-type', value: 'application/json' }]
        : [], serverUrl?.parameters || [], requestDataFromOpenAPI?.contentTypeParameters || [], 
    // if step.parameters is defined, we do not auto-populate parameters from the openapi operation
    step.parameters ? [] : requestDataFromOpenAPI?.parameters || [], resolveParameters(workflowLevelParameters, ctx), stepRequestBodyContentType
        ? [{ in: 'header', name: 'content-type', value: stepRequestBodyContentType }]
        : [], resolveParameters(step.parameters || [], ctx));
    // save local $steps context before evaluating runtime expressions
    if (!ctx.$steps[stepId]) {
        ctx.$steps[stepId] = {};
    }
    // save local $workflows context
    if (!ctx.$workflows[workflowName].steps[stepId]) {
        ctx.$workflows[workflowName].steps[stepId] = {};
    }
    // Supporting temporal extension of query method https://httpwg.org/http-extensions/draft-ietf-httpbis-safe-method-w-body.html
    if (method?.toLowerCase() === 'x-query') {
        method = 'query';
    }
    ctx.$workflows[workflowName].steps[stepId].request = {
        body: requestBody,
        header: groupParametersValuesByName(parameters, 'header'),
        path: groupParametersValuesByName(parameters, 'path'),
        query: groupParametersValuesByName(parameters, 'query'),
        url: serverUrl?.url && path ? `${serverUrl?.url}${path}` : serverUrl?.url,
        method,
    };
    const ctxWithInputs = {
        ...ctx,
        $inputs: {
            ...(ctx.$inputs || {}),
            ...(ctx.$workflows[workflowName]?.inputs || {}),
        },
    };
    const expressionContext = (0, context_1.createRuntimeExpressionCtx)({
        ctx: ctxWithInputs,
        workflowId: workflowName,
        step,
    });
    const evaluatedParameters = parameters.map((parameter) => {
        return {
            ...parameter,
            value: (0, runtime_expressions_1.evaluateRuntimeExpressionPayload)({
                payload: parameter.value,
                context: expressionContext,
                // contentType,
            }),
        };
    });
    for (const param of openapiOperation?.parameters || []) {
        const { schema, name } = param;
        (0, context_1.collectSecretFields)(ctx, schema, groupParametersValuesByName(parameters, param.in), [name]);
    }
    const evaluatedBody = (0, runtime_expressions_1.evaluateRuntimeExpressionPayload)({
        payload: requestBody,
        context: expressionContext,
        contentType,
    });
    if (replacements && typeof evaluatedBody === 'object') {
        (0, config_parser_1.handlePayloadReplacements)(evaluatedBody, replacements, expressionContext);
    }
    if (contentType && openapiOperation?.requestBody) {
        const requestBodySchema = (0, description_parser_1.getRequestBodySchema)(contentType, openapiOperation);
        if (typeof requestBody === 'object') {
            (0, context_1.collectSecretFields)(ctx, requestBodySchema, requestBody);
        }
    }
    // set evaluated values to the context
    ctx.$workflows[workflowName].steps[stepId].request = {
        body: evaluatedBody,
        header: groupParametersValuesByName(evaluatedParameters, 'header'),
        path: groupParametersValuesByName(evaluatedParameters, 'path'),
        query: groupParametersValuesByName(evaluatedParameters, 'query'),
        url: serverUrl?.url && path ? `${serverUrl?.url}${path}` : serverUrl?.url,
        method,
    };
    return {
        serverUrl,
        path,
        method,
        parameters: extractCookieParametersFromHeaderParameters(evaluatedParameters),
        requestBody: evaluatedBody,
        openapiOperation,
    };
}
function joinParameters(...parameters) {
    const parametersWithNames = parameters.flat().filter((param) => 'name' in param);
    const parameterMap = parametersWithNames.reduce((map, param) => {
        map[param.name] = param;
        return map;
    }, {});
    return Object.values(parameterMap);
}
function groupParametersValuesByName(parameters, inValue) {
    return parameters.reduce((acc, param) => {
        if (param.in === inValue && 'name' in param) {
            acc[param.in === 'header' ? param.name.toLowerCase() : param.name] = param.value;
        }
        return acc;
    }, {});
}
function resolveParameters(parameters, ctx) {
    return parameters
        .map((parameter) => {
        const resolvedParameter = (0, config_parser_1.resolveReusableComponentItem)(parameter, ctx);
        if (!(0, config_parser_1.isParameterWithIn)(resolvedParameter)) {
            return undefined;
        }
        return resolvedParameter;
    })
        .filter((parameter) => parameter !== undefined);
}
function extractCookieParametersFromHeaderParameters(parameters) {
    const result = [];
    for (const parameter of parameters) {
        if (parameter.in === 'header' && parameter.name.toLowerCase() === 'cookie') {
            const cookieParameters = String(parameter.value)
                .split(';')
                .map((cookie) => {
                const [key, value] = cookie.split('=');
                return { name: key, value, in: 'cookie' };
            });
            result.push(...cookieParameters);
        }
        else {
            result.push(parameter);
        }
    }
    return result;
}
//# sourceMappingURL=prepare-request.js.map