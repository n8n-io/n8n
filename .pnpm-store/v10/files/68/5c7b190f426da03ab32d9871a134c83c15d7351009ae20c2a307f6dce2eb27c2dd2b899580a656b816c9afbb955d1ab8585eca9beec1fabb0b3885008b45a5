import { feedbackConfigSchema } from './feedback-config-schema';
const typeGroupConfig = {
    type: 'object',
    properties: {
        includeByName: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        excludeByName: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
    },
    additionalProperties: false,
};
const menuGroupConfig = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
        },
        items: typeGroupConfig,
        queries: typeGroupConfig,
        mutations: typeGroupConfig,
        subscriptions: typeGroupConfig,
        types: typeGroupConfig,
        directives: typeGroupConfig,
    },
    required: ['name'],
    additionalProperties: false,
};
const menuGroupingConfig = {
    type: 'object',
    properties: {
        requireExactGroups: {
            type: 'boolean',
        },
        groups: {
            type: 'array',
            items: menuGroupConfig,
        },
        otherItemsGroupName: {
            type: 'string',
        },
    },
    required: ['requireExactGroups', 'groups', 'otherItemsGroupName'],
    additionalProperties: false,
};
export const graphqlConfigSchema = {
    type: 'object',
    properties: {
        hidePaginationButtons: {
            type: 'boolean',
        },
        menu: {
            type: 'object',
            properties: Object.assign({}, menuGroupingConfig.properties),
            additionalProperties: false,
        },
        sidebar: {
            type: 'object',
            properties: {
                hide: {
                    type: 'boolean',
                },
            },
        },
        apiLogo: {
            type: 'object',
            properties: {
                imageUrl: {
                    type: 'string',
                },
                href: {
                    type: 'string',
                },
                altText: {
                    type: 'string',
                },
                backgroundColor: {
                    type: 'string',
                },
            },
        },
        jsonSamplesDepth: {
            type: 'number',
        },
        samplesMaxInlineArgs: {
            type: 'number',
        },
        licenseKey: {
            type: 'string',
        },
        fieldExpandLevel: {
            type: 'number',
        },
        baseUrlPath: {
            type: 'string',
        },
        feedback: feedbackConfigSchema,
    },
    additionalProperties: false,
};
//# sourceMappingURL=graphql-config-schema.js.map