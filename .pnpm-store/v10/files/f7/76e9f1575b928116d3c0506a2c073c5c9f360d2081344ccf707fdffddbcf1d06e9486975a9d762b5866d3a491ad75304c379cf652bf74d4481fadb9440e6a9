"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productConfigOverrideSchema = exports.productThemeOverrideSchema = void 0;
const default_theme_config_schema_1 = require("./default-theme-config-schema");
const ex_theme_config_schemas_1 = require("./ex-theme-config-schemas");
const root_config_schema_1 = require("./root-config-schema");
exports.productThemeOverrideSchema = {
    type: 'object',
    properties: {
        logo: default_theme_config_schema_1.themeConfigSchema.properties.logo,
        navbar: default_theme_config_schema_1.themeConfigSchema.properties.navbar,
        footer: default_theme_config_schema_1.themeConfigSchema.properties.footer,
        sidebar: default_theme_config_schema_1.themeConfigSchema.properties.sidebar,
        search: default_theme_config_schema_1.themeConfigSchema.properties.search,
        codeSnippet: default_theme_config_schema_1.themeConfigSchema.properties.codeSnippet,
        breadcrumbs: default_theme_config_schema_1.themeConfigSchema.properties.breadcrumbs,
        openapi: default_theme_config_schema_1.themeConfigSchema.properties.openapi,
        feedback: default_theme_config_schema_1.themeConfigSchema.properties.feedback,
        analytics: {
            type: 'object',
            properties: {
                ga: ex_theme_config_schemas_1.productGoogleAnalyticsConfigSchema,
            },
        },
    },
    additionalProperties: true,
    default: {},
};
exports.productConfigOverrideSchema = {
    $id: 'product-config-override',
    type: 'object',
    properties: Object.assign(Object.assign({}, exports.productThemeOverrideSchema.properties), { apis: {
            type: 'object',
            additionalProperties: root_config_schema_1.apiConfigSchema,
        }, 
        /**
         * @deprecated left for backwards compatibility
         */
        theme: exports.productThemeOverrideSchema }),
    additionalProperties: false,
};
//# sourceMappingURL=product-override-schema.js.map