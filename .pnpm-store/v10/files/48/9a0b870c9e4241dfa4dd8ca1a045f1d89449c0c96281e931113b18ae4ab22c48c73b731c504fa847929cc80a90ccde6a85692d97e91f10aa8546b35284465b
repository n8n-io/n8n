import { feedbackConfigSchema } from './feedback-config-schema';
const codeSamplesConfigSchema = {
    type: 'object',
    properties: {
        languages: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    lang: {
                        type: 'string',
                        enum: [
                            'curl',
                            'JavaScript',
                            'Node.js',
                            'Python',
                            'Java8+Apache',
                            'Java',
                            'C#',
                            'C#+Newtonsoft',
                            'PHP',
                            'Go',
                            'Ruby',
                            'R',
                            'Payload',
                        ],
                    },
                    label: { type: 'string' },
                    options: {
                        type: 'object',
                        properties: {
                            indent: { type: 'string' },
                            withImports: { type: 'boolean' },
                            withComments: { type: 'boolean' },
                            binary: { type: 'boolean' },
                            credentials: {
                                type: 'string',
                                enum: ['omit', 'same-origin', 'include'],
                            },
                        },
                        additionalProperties: false,
                    },
                },
                required: ['lang'],
                additionalProperties: false,
            },
        },
        skipOptionalParameters: { type: 'boolean' },
        withOAuth2Call: { type: 'boolean' },
    },
    required: ['languages'],
    additionalProperties: false,
};
const downloadUrlsSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            title: { type: 'string' },
            url: { type: 'string' },
        },
        required: ['url'],
        additionalProperties: false,
    },
};
export const redocConfigSchema = {
    type: 'object',
    properties: {
        licenseKey: { type: 'string' },
        hideLoading: { type: 'boolean' },
        disableRouter: { type: 'boolean' },
        hideSidebar: { type: 'boolean' },
        feedback: feedbackConfigSchema,
        hideReplay: { type: 'boolean' },
        oAuth2RedirectURI: { type: 'string', nullable: true },
        corsProxyUrl: { type: 'string' },
        sortRequiredPropsFirst: { type: 'boolean' },
        sanitize: { type: 'boolean' },
        hideDownloadButtons: { type: 'boolean' },
        downloadUrls: downloadUrlsSchema,
        onlyRequiredInSamples: { type: 'boolean' },
        generatedSamplesMaxDepth: { oneOf: [{ type: 'number' }, { type: 'string' }] },
        showExtensions: {
            oneOf: [
                { type: 'boolean' },
                { type: 'string' },
                { type: 'array', items: { type: 'string' } },
            ],
        },
        hideSchemaTitles: { type: 'boolean' },
        jsonSamplesExpandLevel: { oneOf: [{ type: 'number' }, { type: 'string' }] },
        schemasExpansionLevel: { oneOf: [{ type: 'number' }, { type: 'string' }] },
        mockServer: {
            type: 'object',
            properties: {
                url: { type: 'string' },
                position: { type: 'string', enum: ['first', 'last', 'replace', 'off'] },
                description: { type: 'string' },
            },
        },
        maxDisplayedEnumValues: { type: 'number' },
        schemaDefinitionsTagName: { type: 'string' },
        layout: { type: 'string', enum: ['stacked', 'three-panel'] },
        hideInfoMetadata: { type: 'boolean' },
        events: { type: 'object' },
        skipBundle: { type: 'boolean' },
        routingBasePath: { type: 'string' },
        codeSamples: codeSamplesConfigSchema,
        ignoreNamedSchemas: {
            oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
        },
        hidePropertiesPrefix: { type: 'boolean' },
        excludeFromSearch: { type: 'boolean' },
    },
    additionalProperties: false,
};
//# sourceMappingURL=redoc-config-schema.js.map