"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arazzo1Types = void 0;
const _1 = require(".");
const oas3_1_1 = require("./oas3_1");
const oas3_1 = require("./oas3");
const Root = {
    properties: {
        arazzo: { type: 'string' },
        info: 'Info',
        sourceDescriptions: 'SourceDescriptions',
        workflows: 'Workflows',
        components: 'Components',
    },
    required: ['arazzo', 'info', 'sourceDescriptions', 'workflows'],
    extensionsPrefix: 'x-',
};
const NamedParameters = {
    properties: {},
    additionalProperties: 'Parameter',
};
const NamedSuccessActions = {
    properties: {},
    additionalProperties: 'SuccessActionObject',
};
const NamedFailureActions = {
    properties: {},
    additionalProperties: 'FailureActionObject',
};
const Components = {
    properties: {
        inputs: 'NamedInputs',
        parameters: 'NamedParameters',
        successActions: 'NamedSuccessActions',
        failureActions: 'NamedFailureActions',
    },
    extensionsPrefix: 'x-',
};
const NamedInputs = (0, _1.mapOf)('Schema');
const Info = {
    properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        summary: { type: 'string' },
        version: { type: 'string' },
    },
    required: ['title', 'version'],
    extensionsPrefix: 'x-',
};
const SourceDescriptions = {
    properties: {},
    items: (value) => {
        if (value?.type === 'openapi') {
            return 'OpenAPISourceDescription';
        }
        else {
            return 'ArazzoSourceDescription';
        }
    },
};
const OpenAPISourceDescription = {
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['openapi'] },
        url: { type: 'string' },
        'x-serverUrl': { type: 'string' },
    },
    required: ['name', 'type', 'url'],
    extensionsPrefix: 'x-',
};
const ArazzoSourceDescription = {
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['arazzo'] },
        url: { type: 'string' },
    },
    required: ['name', 'type', 'url'],
    extensionsPrefix: 'x-',
};
const ReusableObject = {
    properties: {
        reference: { type: 'string' },
        value: {}, // any
    },
    required: ['reference'],
    extensionsPrefix: 'x-',
};
const Parameter = {
    properties: {
        in: { type: 'string', enum: ['header', 'query', 'path', 'cookie'] },
        name: { type: 'string' },
        value: {}, // any
    },
    required: ['name', 'value'],
    extensionsPrefix: 'x-',
};
const Parameters = {
    properties: {},
    items: (value) => {
        if (value?.reference) {
            return 'ReusableObject';
        }
        else {
            return 'Parameter';
        }
    },
};
const Workflow = {
    properties: {
        workflowId: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        parameters: 'Parameters',
        dependsOn: { type: 'array', items: { type: 'string' } },
        inputs: 'Schema',
        outputs: 'Outputs',
        steps: 'Steps',
        successActions: 'OnSuccessActionList',
        failureActions: 'OnFailureActionList',
    },
    required: ['workflowId', 'steps'],
    extensionsPrefix: 'x-',
};
const Workflows = (0, _1.listOf)('Workflow');
const Steps = (0, _1.listOf)('Step');
const Step = {
    properties: {
        stepId: { type: 'string' },
        description: { type: 'string' },
        operationId: { type: 'string' },
        operationPath: { type: 'string' },
        workflowId: { type: 'string' },
        parameters: 'Parameters',
        successCriteria: (0, _1.listOf)('CriterionObject'),
        onSuccess: 'OnSuccessActionList',
        onFailure: 'OnFailureActionList',
        outputs: 'Outputs',
        'x-operation': 'ExtendedOperation',
        requestBody: 'RequestBody',
    },
    required: ['stepId'],
    requiredOneOf: ['x-operation', 'operationId', 'operationPath', 'workflowId'],
    extensionsPrefix: 'x-',
};
const Outputs = {
    properties: {},
    additionalProperties: {
        type: 'string',
    },
};
const RequestBody = {
    properties: {
        contentType: { type: 'string' },
        payload: {},
        replacements: (0, _1.listOf)('Replacement'),
    },
    required: ['payload'],
    extensionsPrefix: 'x-',
};
const Replacement = {
    properties: {
        target: { type: 'string' },
        value: {},
    },
    required: ['target', 'value'],
    extensionsPrefix: 'x-',
};
const ExtendedOperation = {
    properties: {
        url: { type: 'string' },
        method: {
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
                'OPTIONS',
                'HEAD',
                'TRACE',
                'CONNECT',
                'QUERY',
            ],
        },
    },
    required: ['url', 'method'],
};
const CriterionObject = {
    properties: {
        condition: { type: 'string' },
        context: { type: 'string' },
        type: (value) => {
            if (!value) {
                return undefined;
            }
            else if (typeof value === 'string') {
                return { enum: ['regex', 'jsonpath', 'simple', 'xpath'] };
            }
            else if (value?.type === 'jsonpath') {
                return 'JSONPathCriterion';
            }
            else {
                return 'XPathCriterion';
            }
        },
    },
    required: ['condition'],
};
const JSONPathCriterion = {
    properties: {
        type: { type: 'string', enum: ['jsonpath'] },
        version: { type: 'string', enum: ['draft-goessner-dispatch-jsonpath-00'] },
    },
};
const XPathCriterion = {
    properties: {
        type: { type: 'string', enum: ['xpath'] },
        version: { type: 'string', enum: ['xpath-30', 'xpath-20', 'xpath-10'] },
    },
};
const SuccessActionObject = {
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['goto', 'end'] },
        stepId: { type: 'string' },
        workflowId: { type: 'string' },
        criteria: (0, _1.listOf)('CriterionObject'),
    },
    required: ['type', 'name'],
};
const OnSuccessActionList = {
    properties: {},
    items: (value) => {
        if (value?.type && value?.name) {
            return 'SuccessActionObject';
        }
        else {
            return 'ReusableObject';
        }
    },
};
const FailureActionObject = {
    properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['goto', 'retry', 'end'] },
        workflowId: { type: 'string' },
        stepId: { type: 'string' },
        retryAfter: { type: 'number' },
        retryLimit: { type: 'number' },
        criteria: (0, _1.listOf)('CriterionObject'),
    },
    required: ['type', 'name'],
};
const OnFailureActionList = {
    properties: {},
    items: (value) => {
        if (value?.type && value?.name) {
            return 'FailureActionObject';
        }
        else {
            return 'ReusableObject';
        }
    },
};
exports.Arazzo1Types = {
    Root,
    Info,
    SourceDescriptions,
    OpenAPISourceDescription,
    ArazzoSourceDescription,
    Parameters,
    Parameter,
    ReusableObject,
    Workflows,
    Workflow,
    Steps,
    Step,
    RequestBody,
    Replacement,
    ExtendedOperation,
    Outputs,
    CriterionObject,
    XPathCriterion,
    JSONPathCriterion,
    SuccessActionObject,
    OnSuccessActionList,
    FailureActionObject,
    OnFailureActionList,
    Schema: oas3_1_1.Schema,
    NamedSchemas: (0, _1.mapOf)('Schema'),
    ExternalDocs: oas3_1.ExternalDocs,
    DiscriminatorMapping: oas3_1.DiscriminatorMapping,
    Discriminator: oas3_1.Discriminator,
    DependentRequired: oas3_1_1.DependentRequired,
    SchemaProperties: oas3_1_1.SchemaProperties,
    PatternProperties: oas3_1_1.SchemaProperties,
    Components,
    NamedInputs,
    NamedParameters,
    NamedSuccessActions,
    NamedFailureActions,
    Xml: oas3_1.Xml,
};
