import { graphqlConfigSchema } from './graphql-config-schema';
import { feedbackConfigSchema } from './feedback-config-schema';
import { logoConfigSchema, analyticsConfigSchema, breadcrumbsConfigSchema, catalogsConfigSchema, codeSnippetConfigSchema, colorModeConfigSchema, footerConfigSchema, linksConfigSchema, markdownConfigSchema, navbarConfigSchema, navigationConfigSchema, openapiConfigSchema, productsConfigSchema, scorecardConfigSchema, scriptsConfigSchema, searchConfigSchema, sidebarConfigSchema, userMenuConfigSchema, versionPickerConfigSchema, } from './ex-theme-config-schemas';
export const themeConfigSchema = {
    type: 'object',
    properties: {
        /**
         * @deprecated Should use `plugins` instead
         */
        imports: {
            type: 'array',
            items: { type: 'string' },
        },
        logo: logoConfigSchema,
        navbar: navbarConfigSchema,
        products: productsConfigSchema,
        footer: footerConfigSchema,
        sidebar: sidebarConfigSchema,
        scripts: scriptsConfigSchema,
        links: linksConfigSchema,
        feedback: feedbackConfigSchema,
        search: searchConfigSchema,
        colorMode: colorModeConfigSchema,
        navigation: navigationConfigSchema,
        codeSnippet: codeSnippetConfigSchema,
        markdown: markdownConfigSchema,
        openapi: openapiConfigSchema,
        graphql: graphqlConfigSchema,
        analytics: analyticsConfigSchema,
        userMenu: userMenuConfigSchema,
        versionPicker: versionPickerConfigSchema,
        breadcrumbs: breadcrumbsConfigSchema,
        catalog: catalogsConfigSchema,
        scorecard: scorecardConfigSchema,
    },
    additionalProperties: true,
};
export const closedThemeConfigSchema = Object.assign(Object.assign({}, themeConfigSchema), { additionalProperties: false });
//# sourceMappingURL=default-theme-config-schema.js.map