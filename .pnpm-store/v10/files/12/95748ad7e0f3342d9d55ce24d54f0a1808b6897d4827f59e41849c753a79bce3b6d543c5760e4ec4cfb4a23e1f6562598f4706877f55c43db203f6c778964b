"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scorecardConfigSchema = exports.catalogsConfigSchema = exports.catalogSchema = exports.catalogFilterSchema = exports.breadcrumbsConfigSchema = exports.versionPickerConfigSchema = exports.userMenuConfigSchema = exports.analyticsConfigSchema = exports.googleAnalyticsConfigSchema = exports.productGoogleAnalyticsConfigSchema = exports.gtmAnalyticsConfigSchema = exports.segmentAnalyticsConfigSchema = exports.rudderstackAnalyticsConfigSchema = exports.heapAnalyticsConfigSchema = exports.fullstoryAnalyticsConfigSchema = exports.amplitudeAnalyticsConfigSchema = exports.openapiConfigSchema = exports.markdownConfigSchema = exports.codeSnippetConfigSchema = exports.navigationConfigSchema = exports.colorModeConfigSchema = exports.searchConfigSchema = exports.linksConfigSchema = exports.scriptsConfigSchema = exports.sidebarConfigSchema = exports.footerConfigSchema = exports.productsConfigSchema = exports.navbarConfigSchema = exports.logoConfigSchema = exports.searchFiltersConfigSchema = exports.searchFacetsConfigSchema = exports.aiSearchConfigSchema = exports.productConfigSchema = exports.navItemsSchema = void 0;
const redoc_config_schema_1 = require("./redoc-config-schema");
const reference_docs_config_schema_1 = require("./reference-docs-config-schema");
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
exports.navItemsSchema = {
    type: 'array',
    items: Object.assign(Object.assign({}, navItemSchema), { properties: Object.assign(Object.assign({}, navItemSchema.properties), { items: { type: 'array', items: navItemSchema } }) }),
};
exports.productConfigSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        icon: { type: 'string' },
        folder: { type: 'string' },
    },
    additionalProperties: false,
    required: ['name', 'folder'],
};
exports.aiSearchConfigSchema = {
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
exports.searchFacetsConfigSchema = {
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
exports.searchFiltersConfigSchema = {
    type: 'object',
    properties: Object.assign({ facets: exports.searchFacetsConfigSchema }, hideConfigSchema.properties),
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
exports.logoConfigSchema = {
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
exports.navbarConfigSchema = {
    type: 'object',
    properties: Object.assign({ items: exports.navItemsSchema }, hideConfigSchema.properties),
    additionalProperties: false,
};
exports.productsConfigSchema = {
    type: 'object',
    additionalProperties: exports.productConfigSchema,
};
exports.footerConfigSchema = {
    type: 'object',
    properties: Object.assign({ items: exports.navItemsSchema, copyrightText: { type: 'string' }, logo: hideConfigSchema }, hideConfigSchema.properties),
    additionalProperties: false,
};
exports.sidebarConfigSchema = {
    type: 'object',
    properties: Object.assign({ separatorLine: { type: 'boolean' }, linePosition: {
            type: 'string',
            enum: ['top', 'bottom'],
            default: 'bottom',
        } }, hideConfigSchema.properties),
    additionalProperties: false,
};
exports.scriptsConfigSchema = {
    type: 'object',
    properties: {
        head: { type: 'array', items: scriptConfigSchema },
        body: { type: 'array', items: scriptConfigSchema },
    },
    additionalProperties: false,
};
exports.linksConfigSchema = {
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
exports.searchConfigSchema = {
    type: 'object',
    properties: Object.assign({ engine: {
            type: 'string',
            enum: ['flexsearch', 'typesense'],
            default: 'flexsearch',
        }, ai: exports.aiSearchConfigSchema, filters: exports.searchFiltersConfigSchema, placement: {
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
exports.colorModeConfigSchema = {
    type: 'object',
    properties: Object.assign({ ignoreDetection: { type: 'boolean' }, modes: {
            type: 'array',
            items: { type: 'string' },
            default: ['light', 'dark'],
        } }, hideConfigSchema.properties),
    additionalProperties: false,
};
exports.navigationConfigSchema = {
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
exports.codeSnippetConfigSchema = {
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
exports.markdownConfigSchema = {
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
exports.openapiConfigSchema = Object.assign(Object.assign({}, redoc_config_schema_1.redocConfigSchema), { properties: Object.assign(Object.assign({}, redoc_config_schema_1.redocConfigSchema.properties), reference_docs_config_schema_1.deprecatedRefDocsSchema.properties) });
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
exports.amplitudeAnalyticsConfigSchema = {
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
exports.fullstoryAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        orgId: { type: 'string' },
    },
    additionalProperties: false,
    required: ['orgId'],
};
exports.heapAnalyticsConfigSchema = {
    type: 'object',
    properties: {
        includeInDevelopment: { type: 'boolean' },
        appId: { type: 'string' },
    },
    additionalProperties: false,
    required: ['appId'],
};
exports.rudderstackAnalyticsConfigSchema = {
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
exports.segmentAnalyticsConfigSchema = {
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
exports.gtmAnalyticsConfigSchema = {
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
exports.productGoogleAnalyticsConfigSchema = {
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
exports.googleAnalyticsConfigSchema = {
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
            additionalProperties: exports.productGoogleAnalyticsConfigSchema,
        },
    },
    additionalProperties: false,
    required: ['trackingId'],
};
exports.analyticsConfigSchema = {
    type: 'object',
    properties: {
        adobe: adobeAnalyticsConfigSchema,
        amplitude: exports.amplitudeAnalyticsConfigSchema,
        fullstory: exports.fullstoryAnalyticsConfigSchema,
        heap: exports.heapAnalyticsConfigSchema,
        rudderstack: exports.rudderstackAnalyticsConfigSchema,
        segment: exports.segmentAnalyticsConfigSchema,
        gtm: exports.gtmAnalyticsConfigSchema,
        ga: exports.googleAnalyticsConfigSchema,
    },
};
exports.userMenuConfigSchema = {
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
exports.versionPickerConfigSchema = {
    type: 'object',
    properties: {
        hide: { type: 'boolean' },
        showForUnversioned: {
            type: 'boolean',
        },
    },
};
exports.breadcrumbsConfigSchema = {
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
exports.catalogFilterSchema = {
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
exports.catalogSchema = {
    type: 'object',
    additionalProperties: true,
    required: ['slug', 'items'],
    properties: {
        slug: { type: 'string' },
        filters: { type: 'array', items: exports.catalogFilterSchema },
        groupByFirstFilter: { type: 'boolean' },
        filterValuesCasing: {
            type: 'string',
            enum: ['sentence', 'original', 'lowercase', 'uppercase'],
        },
        items: exports.navItemsSchema,
        requiredPermission: { type: 'string' },
        separateVersions: { type: 'boolean' },
        title: { type: 'string' },
        titleTranslationKey: { type: 'string' },
        description: { type: 'string' },
        descriptionTranslationKey: { type: 'string' },
    },
};
exports.catalogsConfigSchema = {
    type: 'object',
    patternProperties: {
        '.*': exports.catalogSchema,
    },
};
exports.scorecardConfigSchema = {
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