import { redocConfigSchema } from './redoc-config-schema';
import { deprecatedRefDocsSchema } from './reference-docs-config-schema';
const hideConfigSchema = {
    type: 'object',
    properties: {
        hide: { type: 'boolean' },
    },
    additionalProperties: false,
};
const scriptConfigSchema = {
    type: 'object',
    properties: {
        src: { type: 'string' },
        async: { type: 'boolean' },
        crossorigin: { type: 'string' },
        defer: { type: 'boolean' },
        fetchpriority: { type: 'string' },
        integrity: { type: 'string' },
        module: { type: 'boolean' },
        nomodule: { type: 'boolean' },
        nonce: { type: 'string' },
        referrerpolicy: { type: 'string' },
        type: { type: 'string' },
    },
    required: ['src'],
    additionalProperties: true,
};
const navItemSchema = {
    type: 'object',
    properties: {
        page: { type: 'string' },
        directory: { type: 'string' },
        disconnect: { type: 'boolean', default: false },
        group: { type: 'string' },
        label: { type: 'string' },
        href: { type: 'string' },
        external: { type: 'boolean' },
        labelTranslationKey: { type: 'string' },
        groupTranslationKey: { type: 'string' },
        icon: {
            oneOf: [
                { type: 'string' },
                { type: 'object', properties: { srcSet: { type: 'string' } }, required: ['srcSet'] },
            ],
        },
        separator: { type: 'string' },
        separatorLine: { type: 'boolean' },
        linePosition: {
            type: 'string',
            enum: ['top', 'bottom'],
            default: 'top',
        },
        version: { type: 'string' },
        menuStyle: { type: 'string', enum: ['drilldown'] },
        expanded: { type: 'string', const: 'always' },
        selectFirstItemOnExpand: { type: 'boolean' },
        flatten: { type: 'boolean' },
        linkedSidebars: {
            type: 'array',
            items: { type: 'string' },
        },
        // Allow users to eject the navbar and implement additional levels of nesting
        items: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
};
export const navItemsSchema = {
    type: 'array',
    items: Object.assign(Object.assign({}, navItemSchema), { properties: Object.assign(Object.assign({}, navItemSchema.properties), { items: { type: 'array', items: navItemSchema } }) }),
};
export const productConfigSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        icon: { type: 'string' },
        folder: { type: 'string' },
    },
    additionalProperties: false,
    required: ['name', 'folder'],
};
export const aiSearchConfigSchema = {
    type: 'object',
    properties: {
        hide: {
            type: 'boolean',
            default: false,
        },
        prompt: {
            type: 'string',
        },
    },
    additionalProperties: false,
};
export const searchFacetsConfigSchema = {
    type: 'array',
    items: {
        type: 'object',
        required: ['name', 'field', 'type'],
        properties: {
            name: { type: 'string' },
            field: { type: 'string' },
            type: {
                type: 'string',
                enum: ['multi-select', 'select', 'tags'],
            },
        },
        additionalProperties: false,
    },
};
export const searchFiltersConfigSchema = {
    type: 'object',
    properties: Object.assign({ facets: searchFacetsConfigSchema }, hideConfigSchema.properties),
    additionalProperties: false,
};
const searchSuggestedPageSchema = {
    type: 'object',
    properties: {
        page: { type: 'string' },
        label: { type: 'string' },
        labelTranslationKey: { type: 'string' },
    },
    required: ['page'],
};
export const logoConfigSchema = {
    type: 'object',
    properties: {
        image: { type: 'string' },
        srcSet: { type: 'string' },
        altText: { type: 'string' },
        link: { type: 'string' },
        favicon: { type: 'string' },
    },
    additionalProperties: false,
};
export const navbarConfigSchema = {
    type: 'object',
    properties: Object.assign({ items: navItemsSchema }, hideConfigSchema.properties),
    additionalProperties: false,
};
export const productsConfigSchema = {
    type: 'object',
    additionalProperties: productConfigSchema,
};
export const footerConfigSchema = {
    type: 'object',
    properties: Object.assign({ items: navItemsSchema, copyrightText: { type: 'string' }, logo: hideConfigSchema }, hideConfigSchema.properties),
    additionalProperties: false,
};
export const sidebarConfigSchema = {
    type: 'object',
    properties: Object.assign({ separatorLine: { type: 'boolean' }, linePosition: {
            type: 'string',
            enum: ['top', 'bottom'],
            default: 'bottom',
        } }, hideConfigSchema.properties),
    additionalProperties: false,
};
export const scriptsConfigSchema = {
    type: 'object',
    properties: {
        head: { type: 'array', items: scriptConfigSchema },
        body: { type: 'array', items: scriptConfigSchema },
    },
    additionalProperties: false,
};
export const linksConfigSchema = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            href: { type: 'string' },
            as: { type: 'string' },
            crossorigin: { type: 'string' },
            fetchpriority: { type: 'string' },
            hreflang: { type: 'string' },
            imagesizes: { type: 'string' },
            imagesrcset: { type: 'string' },
            integrity: { type: 'string' },
            media: { type: 'string' },
            prefetch: { type: 'string' },
            referrerpolicy: { type: 'string' },
            rel: { type: 'string' },
            sizes: { type: 'string' },
            title: { type: 'string' },
            type: { type: 'string' },
        },
        required: ['href'],
        additionalProperties: true,
    },
};
export const searchConfigSchema = {
    type: 'object',
    properties: Object.assign({ engine: {
            type: 'string',
            enum: ['flexsearch', 'typesense'],
            default: 'flexsearch',
        }, ai: aiSearchConfigSchema, filters: searchFiltersConfigSchema, placement: {
            type: 'string',
            default: 'navbar',
        }, shortcuts: {
            type: 'array',
            items: { type: 'string' },
            default: ['/'],
        }, suggestedPages: {
            type: 'array',
            items: searchSuggestedPageSchema,
        } }, hideConfigSchema.properties),
    additionalProperties: false,
};
export const colorModeConfigSchema = {
    type: 'object',
    properties: Object.assign({ ignoreDetection: { type: 'boolean' }, modes: {
            type: 'array',
            items: { type: 'string' },
            default: ['light', 'dark'],
        } }, hideConfigSchema.properties),
    additionalProperties: false,
};
export const navigationConfigSchema = {
    type: 'object',
    properties: {
        nextButton: {
            type: 'object',
            properties: Object.assign({ text: { type: 'string', default: 'Next page' } }, hideConfigSchema.properties),
            additionalProperties: false,
            default: {},
        },
        previousButton: {
            type: 'object',
            properties: Object.assign({ text: { type: 'string', default: 'Previous page' } }, hideConfigSchema.properties),
            additionalProperties: false,
            default: {},
        },
    },
    additionalProperties: false,
};
export const codeSnippetConfigSchema = {
    type: 'object',
    properties: {
        elementFormat: { type: 'string', default: 'icon' },
        copy: {
            type: 'object',
            properties: Object.assign({}, hideConfigSchema.properties),
            additionalProperties: false,
            default: { hide: false },
        },
        report: {
            type: 'object',
            properties: Object.assign({ tooltipText: { type: 'string' }, buttonText: { type: 'string' }, label: { type: 'string' } }, hideConfigSchema.properties),
            additionalProperties: false,
            default: { hide: false },
        },
        expand: {
            type: 'object',
            properties: Object.assign({}, hideConfigSchema.properties),
            additionalProperties: false,
            default: { hide: false },
        },
        collapse: {
            type: 'object',
            properties: Object.assign({}, hideConfigSchema.properties),
            additionalProperties: false,
            default: { hide: false },
        },
    },
    additionalProperties: false,
};
export const markdownConfigSchema = {
    type: 'object',
    properties: {
        frontMatterKeysToResolve: {
            type: 'array',
            items: { type: 'string' },
            default: ['image', 'links'],
        },
        partialsFolders: {
            type: 'array',
            items: { type: 'string' },
            default: ['_partials'],
        },
        lastUpdatedBlock: {
            type: 'object',
            properties: Object.assign({ format: {
                    type: 'string',
                    enum: ['timeago', 'iso', 'long', 'short'],
                    default: 'timeago',
                }, locale: { type: 'string' } }, hideConfigSchema.properties),
            additionalProperties: false,
            default: {},
        },
        toc: {
            type: 'object',
            properties: Object.assign({ header: { type: 'string', default: 'On this page' }, depth: { type: 'integer', default: 3, minimum: 1 } }, hideConfigSchema.properties),
            additionalProperties: false,
            default: {},
        },
        editPage: {
            type: 'object',
            properties: Object.assign({ baseUrl: { type: 'string' } }, hideConfigSchema.properties),
            additionalProperties: false,
            default: {},
        },
    },
    additionalProperties: false,
    default: {},
};
export const openapiConfigSchema = Object.assign(Object.assign({}, redocConfigSchema), { properties: Object.assign(Object.assign({}, redocConfigSchema.properties), deprecatedRefDocsSchema.properties) });
const adobeAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        scriptUrl: { type: 'string' },
        pageViewEventName: { type: 'string' },
    },
    additionalProperties: false,
    required: ['scriptUrl'],
};
export const amplitudeAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        apiKey: { type: 'string' },
        head: { type: 'boolean' },
        respectDNT: { type: 'boolean' },
        exclude: { type: 'array', items: { type: 'string' } },
        outboundClickEventName: { type: 'string' },
        pageViewEventName: { type: 'string' },
        amplitudeConfig: { type: 'object', additionalProperties: true },
    },
    additionalProperties: false,
    required: ['apiKey'],
};
export const fullstoryAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        orgId: { type: 'string' },
    },
    additionalProperties: false,
    required: ['orgId'],
};
export const heapAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        appId: { type: 'string' },
    },
    additionalProperties: false,
    required: ['appId'],
};
export const rudderstackAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        writeKey: { type: 'string', minLength: 10 },
        trackPage: { type: 'boolean' },
        dataPlaneUrl: { type: 'string' },
        controlPlaneUrl: { type: 'string' },
        sdkUrl: { type: 'string' },
        loadOptions: { type: 'object', additionalProperties: true },
    },
    additionalProperties: false,
    required: ['writeKey'],
};
export const segmentAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        writeKey: { type: 'string', minLength: 10 },
        trackPage: { type: 'boolean' },
        includeTitleInPageCall: { type: 'boolean' },
        host: { type: 'string' },
    },
    additionalProperties: false,
    required: ['writeKey'],
};
export const gtmAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        trackingId: { type: 'string' },
        gtmAuth: { type: 'string' },
        gtmPreview: { type: 'string' },
        defaultDataLayer: {},
        dataLayerName: { type: 'string' },
        enableWebVitalsTracking: { type: 'boolean' },
        selfHostedOrigin: { type: 'string' },
        pageViewEventName: { type: 'string' },
    },
    additionalProperties: false,
    required: ['trackingId'],
};
export const productGoogleAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        trackingId: { type: 'string' },
        conversionId: { type: 'string' },
        floodlightId: { type: 'string' },
        optimizeId: { type: 'string' },
        exclude: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
    required: ['trackingId'],
};
export const googleAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        trackingId: { type: 'string' },
        conversionId: { type: 'string' },
        floodlightId: { type: 'string' },
        head: { type: 'boolean' },
        respectDNT: { type: 'boolean' },
        exclude: { type: 'array', items: { type: 'string' } },
        optimizeId: { type: 'string' },
        anonymizeIp: { type: 'boolean' },
        cookieExpires: { type: 'number' },
        // All enabled tracking configs
        trackers: {
            type: 'object',
            additionalProperties: productGoogleAnalyticsConfigSchema,
        },
    },
    additionalProperties: false,
    required: ['trackingId'],
};
export const analyticsConfigSchema = {
    type: 'object',
    properties: {
        adobe: adobeAnalyticsConfigSchema,
        amplitude: amplitudeAnalyticsConfigSchema,
        fullstory: fullstoryAnalyticsConfigSchema,
        heap: heapAnalyticsConfigSchema,
        rudderstack: rudderstackAnalyticsConfigSchema,
        segment: segmentAnalyticsConfigSchema,
        gtm: gtmAnalyticsConfigSchema,
        ga: googleAnalyticsConfigSchema,
    },
};
export const userMenuConfigSchema = {
    type: 'object',
    properties: Object.assign({ items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    label: { type: 'string' },
                    external: { type: 'boolean' },
                    link: { type: 'string' },
                    separatorLine: { type: 'boolean' },
                },
                additionalProperties: true,
            },
            default: [],
        }, hideLoginButton: { type: 'boolean' } }, hideConfigSchema.properties),
    additionalProperties: false,
};
export const versionPickerConfigSchema = {
    type: 'object',
    properties: {
        hide: { type: 'boolean' },
        showForUnversioned: {
            type: 'boolean',
        },
    },
};
export const breadcrumbsConfigSchema = {
    type: 'object',
    properties: {
        hide: { type: 'boolean' },
        prefixItems: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    label: { type: 'string' },
                    labelTranslationKey: { type: 'string' },
                    page: { type: 'string' },
                },
                additionalProperties: false,
                default: {},
            },
        },
    },
    additionalProperties: false,
};
export const catalogFilterSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'property'],
    properties: {
        type: {
            type: 'string',
            enum: ['select', 'checkboxes', 'date-range'],
            default: 'checkboxes',
        },
        title: { type: 'string' },
        titleTranslationKey: { type: 'string' },
        property: { type: 'string' },
        parentFilter: { type: 'string' },
        valuesMapping: { type: 'object', additionalProperties: { type: 'string' } },
        missingCategoryName: { type: 'string' },
        missingCategoryNameTranslationKey: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
    },
};
export const catalogSchema = {
    type: 'object',
    additionalProperties: true,
    required: ['slug', 'items'],
    properties: {
        slug: { type: 'string' },
        filters: { type: 'array', items: catalogFilterSchema },
        groupByFirstFilter: { type: 'boolean' },
        filterValuesCasing: {
            type: 'string',
            enum: ['sentence', 'original', 'lowercase', 'uppercase'],
        },
        items: navItemsSchema,
        requiredPermission: { type: 'string' },
        separateVersions: { type: 'boolean' },
        title: { type: 'string' },
        titleTranslationKey: { type: 'string' },
        description: { type: 'string' },
        descriptionTranslationKey: { type: 'string' },
    },
};
export const catalogsConfigSchema = {
    type: 'object',
    patternProperties: {
        '.*': catalogSchema,
    },
};
export const scorecardConfigSchema = {
    type: 'object',
    additionalProperties: true,
    required: [],
    properties: {
        /**
         * @deprecated Should use `reunite.ignoreLint` instead
         */
        ignoreNonCompliant: { type: 'boolean', default: false },
        teamMetadataProperty: {
            type: 'object',
            properties: {
                property: { type: 'string' },
                label: { type: 'string' },
                default: { type: 'string' },
            },
        },
        levels: {
            type: 'array',
            items: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    color: { type: 'string' },
                    extends: { type: 'array', items: { type: 'string' } },
                    rules: {
                        type: 'object',
                        additionalProperties: {
                            oneOf: [{ type: 'string' }, { type: 'object' }],
                        },
                    },
                },
                additionalProperties: false,
            },
        },
        targets: {
            type: 'array',
            items: {
                type: 'object',
                required: ['where'],
                properties: {
                    minimumLevel: { type: 'string' },
                    rules: { type: 'object', additionalProperties: true },
                    where: {
                        type: 'object',
                        required: ['metadata'],
                        properties: {
                            metadata: { type: 'object', additionalProperties: { type: 'string' } },
                        },
                        additionalProperties: false,
                    },
                },
                additionalProperties: false,
            },
        },
        ignore: {
            type: 'array',
            items: { type: 'string' },
        },
    },
};
//# sourceMappingURL=ex-theme-config-schemas.js.map