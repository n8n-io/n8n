"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arazzoSchema = exports.workflow = exports.step = exports.onFailureObject = exports.onSuccessObject = exports.criteriaObject = exports.requestBody = exports.replacement = exports.infoObject = exports.parameter = exports.reusableObject = exports.extendedOperation = exports.sourceDescriptionSchema = exports.operationMethod = void 0;
exports.operationMethod = {
    type: 'string',
    enum: [
        'get',
        'post',
        'put',
        'delete',
        'patch',
        'head',
        'options',
        'trace',
        'connect',
        'query',
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'HEAD',
        'OPTIONS',
        'TRACE',
        'CONNECT',
        'QUERY',
    ],
};
const openAPISourceDescriptionSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['openapi'] },
        url: { type: 'string' },
        'x-serverUrl': { type: 'string' },
    },
    additionalProperties: false,
    required: ['name', 'type', 'url'],
};
const arazzoSourceDescriptionSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['arazzo'] },
        url: { type: 'string' },
    },
    additionalProperties: false,
    required: ['name', 'type', 'url'],
};
exports.sourceDescriptionSchema = {
    type: 'object',
    oneOf: [openAPISourceDescriptionSchema, arazzoSourceDescriptionSchema],
};
const sourceDescriptionsSchema = {
    type: 'array',
    items: exports.sourceDescriptionSchema,
};
exports.extendedOperation = {
    type: 'object',
    properties: {
        url: { type: 'string' },
        method: exports.operationMethod,
    },
    additionalProperties: false,
    required: ['url', 'method'],
};
exports.reusableObject = {
    type: 'object',
    properties: {
        reference: { type: 'string' },
        value: {
            oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        },
    },
    required: ['reference'],
    additionalProperties: false,
};
exports.parameter = {
    type: 'object',
    oneOf: [
        {
            type: 'object',
            properties: {
                in: { type: 'string', enum: ['header', 'query', 'path', 'cookie'] },
                name: { type: 'string' },
                value: {
                    oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
                },
            },
            required: ['name', 'value'],
            additionalProperties: false,
        },
        exports.reusableObject,
    ],
};
const parameters = {
    type: 'array',
    items: exports.parameter,
};
exports.infoObject = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        summary: { type: 'string' },
        version: { type: 'string' },
    },
    additionalProperties: false,
    required: ['title', 'version'],
};
exports.replacement = {
    type: 'object',
    properties: {
        target: { type: 'string' },
        value: {
            oneOf: [
                { type: 'string' },
                { type: 'object' },
                { type: 'array' },
                { type: 'number' },
                { type: 'boolean' },
            ],
        },
    },
};
exports.requestBody = {
    type: 'object',
    properties: {
        contentType: { type: 'string' },
        payload: {
            oneOf: [
                { type: 'string' },
                { type: 'object', additionalProperties: true },
                { type: 'array' },
                { type: 'number' },
                { type: 'boolean' },
            ],
        },
        encoding: { type: 'string' },
        replacements: {
            type: 'array',
            items: exports.replacement,
        },
    },
    additionalProperties: false,
    required: ['payload'],
};
exports.criteriaObject = {
    type: 'object',
    properties: {
        condition: { type: 'string' },
        context: { type: 'string' },
        type: {
            oneOf: [
                { type: 'string', enum: ['regex', 'jsonpath', 'simple', 'xpath'] },
                {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['jsonpath'] },
                        version: { type: 'string', enum: ['draft-goessner-dispatch-jsonpath-00'] },
                    },
                },
                {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['xpath'] },
                        version: { type: 'string', enum: ['xpath-30', 'xpath-20', 'xpath-10'] },
                    },
                },
            ],
        },
    },
    required: ['condition'],
    additionalProperties: false,
};
const criteriaObjects = {
    type: 'array',
    items: exports.criteriaObject,
};
exports.onSuccessObject = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['goto', 'end'] },
        stepId: { type: 'string' },
        workflowId: { type: 'string' },
        criteria: criteriaObjects,
    },
    additionalProperties: false,
    required: ['type', 'name'],
};
const onSuccessList = {
    type: 'array',
    items: {
        oneOf: [exports.onSuccessObject, exports.reusableObject],
    },
};
exports.onFailureObject = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['goto', 'retry', 'end'] },
        workflowId: { type: 'string' },
        stepId: { type: 'string' },
        retryAfter: { type: 'number' },
        retryLimit: { type: 'number' },
        criteria: criteriaObjects,
    },
    additionalProperties: false,
    required: ['type', 'name'],
};
const onFailureList = {
    type: 'array',
    items: {
        oneOf: [exports.onFailureObject, exports.reusableObject],
    },
};
exports.step = {
    type: 'object',
    properties: {
        stepId: { type: 'string' },
        description: { type: 'string' },
        operationId: { type: 'string' },
        operationPath: { type: 'string' },
        workflowId: { type: 'string' },
        parameters: parameters,
        successCriteria: criteriaObjects,
        onSuccess: onSuccessList,
        onFailure: onFailureList,
        outputs: {
            type: 'object',
            additionalProperties: {
                oneOf: [
                    {
                        type: 'string',
                    },
                    {
                        type: 'object',
                    },
                    {
                        type: 'array',
                    },
                    {
                        type: 'boolean',
                    },
                    {
                        type: 'number',
                    },
                ],
            },
        },
        'x-operation': exports.extendedOperation,
        requestBody: exports.requestBody,
    },
    required: ['stepId'],
    oneOf: [
        { required: ['x-operation'] },
        { required: ['operationId'] },
        { required: ['operationPath'] },
        { required: ['workflowId'] },
    ],
};
const steps = {
    type: 'array',
    items: exports.step,
};
const JSONSchema = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
        },
        format: {
            type: 'string',
        },
        properties: {
            type: 'object',
            additionalProperties: true,
        },
        required: {
            type: 'array',
            items: { type: 'string' },
        },
        items: {
            type: 'object',
            additionalProperties: true,
        },
    },
    required: ['type'],
    additionalProperties: true,
};
exports.workflow = {
    type: 'object',
    properties: {
        workflowId: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        parameters: parameters,
        dependsOn: { type: 'array', items: { type: 'string' } },
        inputs: JSONSchema,
        outputs: {
            type: 'object',
            additionalProperties: {
                type: 'string',
            },
        },
        steps: steps,
        successActions: {
            type: 'array',
            items: {
                oneOf: [exports.onSuccessObject, exports.reusableObject],
            },
        },
        failureActions: {
            type: 'array',
            items: exports.onFailureObject,
        },
    },
    additionalProperties: false,
    required: ['workflowId', 'steps'],
};
const workflows = {
    type: 'array',
    items: exports.workflow,
};
exports.arazzoSchema = {
    type: 'object',
    properties: {
        arazzo: { type: 'string', enum: ['1.0.0'] },
        info: exports.infoObject,
        sourceDescriptions: sourceDescriptionsSchema,
        workflows: workflows,
        components: {
            type: 'object',
            properties: {
                inputs: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        additionalProperties: true,
                        properties: {
                            type: {
                                type: 'string',
                            },
                            properties: {
                                type: 'object',
                                additionalProperties: true,
                            },
                        },
                        required: ['type'],
                    },
                },
                parameters: {
                    type: 'object',
                    additionalProperties: exports.parameter,
                },
                successActions: {
                    type: 'object',
                    additionalProperties: exports.onSuccessObject,
                },
                failureActions: {
                    type: 'object',
                    additionalProperties: exports.onFailureObject,
                },
            },
        },
    },
    additionalProperties: false,
    required: ['arazzo', 'info', 'sourceDescriptions', 'workflows'],
};
//# sourceMappingURL=arazzo-schema.js.map