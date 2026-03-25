import { themeConfigSchema } from './default-theme-config-schema';
import { productGoogleAnalyticsConfigSchema } from './ex-theme-config-schemas';
import { apiConfigSchema } from './root-config-schema';
export const productThemeOverrideSchema = {
    type: 'object',
    properties: {
        logo: themeConfigSchema.properties.logo,
        navbar: themeConfigSchema.properties.navbar,
        footer: themeConfigSchema.properties.footer,
        sidebar: themeConfigSchema.properties.sidebar,
        search: themeConfigSchema.properties.search,
        codeSnippet: themeConfigSchema.properties.codeSnippet,
        breadcrumbs: themeConfigSchema.properties.breadcrumbs,
        openapi: themeConfigSchema.properties.openapi,
        feedback: themeConfigSchema.properties.feedback,
        analytics: {
            type: 'object',
            properties: {
                ga: productGoogleAnalyticsConfigSchema,
            },
        },
    },
    additionalProperties: true,
    default: {},
};
export const productConfigOverrideSchema = {
    $id: 'product-config-override',
    type: 'object',
    properties: Object.assign(Object.assign({}, productThemeOverrideSchema.properties), { apis: {
            type: 'object',
            additionalProperties: apiConfigSchema,
        }, 
        /**
         * @deprecated left for backwards compatibility
         */
        theme: productThemeOverrideSchema }),
    additionalProperties: false,
};
//# sourceMappingURL=product-override-schema.js.map