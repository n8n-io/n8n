"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closedThemeConfigSchema = exports.themeConfigSchema = void 0;
const graphql_config_schema_1 = require("./graphql-config-schema");
const feedback_config_schema_1 = require("./feedback-config-schema");
const ex_theme_config_schemas_1 = require("./ex-theme-config-schemas");
exports.themeConfigSchema = {
    type: 'object',
    properties: {
        /**
         * @deprecated Should use `plugins` instead
         */
        imports: {
            type: 'array',
            items: { type: 'string' },
        },
        logo: ex_theme_config_schemas_1.logoConfigSchema,
        navbar: ex_theme_config_schemas_1.navbarConfigSchema,
        products: ex_theme_config_schemas_1.productsConfigSchema,
        footer: ex_theme_config_schemas_1.footerConfigSchema,
        sidebar: ex_theme_config_schemas_1.sidebarConfigSchema,
        scripts: ex_theme_config_schemas_1.scriptsConfigSchema,
        links: ex_theme_config_schemas_1.linksConfigSchema,
        feedback: feedback_config_schema_1.feedbackConfigSchema,
        search: ex_theme_config_schemas_1.searchConfigSchema,
        colorMode: ex_theme_config_schemas_1.colorModeConfigSchema,
        navigation: ex_theme_config_schemas_1.navigationConfigSchema,
        codeSnippet: ex_theme_config_schemas_1.codeSnippetConfigSchema,
        markdown: ex_theme_config_schemas_1.markdownConfigSchema,
        openapi: ex_theme_config_schemas_1.openapiConfigSchema,
        graphql: graphql_config_schema_1.graphqlConfigSchema,
        analytics: ex_theme_config_schemas_1.analyticsConfigSchema,
        userMenu: ex_theme_config_schemas_1.userMenuConfigSchema,
        versionPicker: ex_theme_config_schemas_1.versionPickerConfigSchema,
        breadcrumbs: ex_theme_config_schemas_1.breadcrumbsConfigSchema,
        catalog: ex_theme_config_schemas_1.catalogsConfigSchema,
        scorecard: ex_theme_config_schemas_1.scorecardConfigSchema,
    },
    additionalProperties: true,
};
exports.closedThemeConfigSchema = Object.assign(Object.assign({}, exports.themeConfigSchema), { additionalProperties: false });
//# sourceMappingURL=default-theme-config-schema.js.map