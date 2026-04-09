const jobInputsSchema = {
    type: 'object',
    additionalProperties: { type: 'string' },
};
const jobServersSchema = {
    type: 'object',
    additionalProperties: false,
    patternProperties: {
        '^[a-zA-Z0-9_-]+$': {
            type: 'string',
            pattern: '^https?://[^\\s/$.?#].[^\\s]*$',
        },
    },
};
const severitySchema = {
    type: 'string',
    enum: ['error', 'warn', 'off'],
};
const jobSeveritySchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        schemaCheck: severitySchema,
        statusCodeCheck: severitySchema,
        contentTypeCheck: severitySchema,
        successCriteriaCheck: severitySchema,
    },
};
const jobTriggerSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        event: {
            type: 'string',
            enum: ['schedule'],
        },
        interval: { type: 'string', pattern: '^[1-9]\\d*[mhdw]$' },
    },
    required: ['event'],
};
export const reuniteConfigSchema = {
    type: 'object',
    properties: {
        ignoreLint: {
            oneOf: [
                { type: 'boolean', default: false },
                {
                    type: 'object',
                    additionalProperties: { type: 'boolean' },
                },
            ],
        },
        ignoreLinkChecker: { type: 'boolean' },
        ignoreMarkdocErrors: { type: 'boolean' },
        jobs: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        pattern: '^(?!\\.\\./)(/[a-zA-Z0-9_\\-\\./]+|./[a-zA-Z0-9_\\-\\./]+|[a-zA-Z0-9_\\-\\./]+)$',
                    },
                    agent: {
                        type: 'string',
                        enum: ['respect'],
                    },
                    trigger: jobTriggerSchema,
                    inputs: jobInputsSchema,
                    servers: jobServersSchema,
                    severity: jobSeveritySchema,
                },
                required: ['path', 'trigger', 'agent'],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
};
//# sourceMappingURL=reunite-config-schema.js.map