import { DEFAULT_TEAM_CLAIM_NAME, AuthProviderType, ApigeeDevOnboardingIntegrationAuthType, } from './constants';
import { themeConfigSchema } from './default-theme-config-schema';
import { feedbackConfigSchema } from './feedback-config-schema';
import { graphqlConfigSchema } from './graphql-config-schema';
import { removePropertyRecursively } from './remove-property-recursively';
import { reuniteConfigSchema } from './reunite-config-schema';
import { analyticsConfigSchema, breadcrumbsConfigSchema, catalogsConfigSchema, codeSnippetConfigSchema, colorModeConfigSchema, footerConfigSchema, linksConfigSchema, logoConfigSchema, markdownConfigSchema, navbarConfigSchema, navigationConfigSchema, openapiConfigSchema, productsConfigSchema, scorecardConfigSchema, scriptsConfigSchema, searchConfigSchema, sidebarConfigSchema, userMenuConfigSchema, versionPickerConfigSchema, } from './ex-theme-config-schemas';
export const oidcIssuerMetadataSchema = {
    type: 'object',
    properties: {
        end_session_endpoint: { type: 'string' },
        token_endpoint: { type: 'string' },
        authorization_endpoint: { type: 'string' },
        jwks_uri: { type: 'string' },
    },
    required: ['token_endpoint', 'authorization_endpoint'],
    additionalProperties: true,
};
export const oidcProviderConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: AuthProviderType.OIDC },
        title: { type: 'string' },
        pkce: { type: 'boolean', default: false },
        configurationUrl: { type: 'string', minLength: 1 },
        configuration: oidcIssuerMetadataSchema,
        clientId: { type: 'string', minLength: 1 },
        clientSecret: { type: 'string', minLength: 0 },
        teamsClaimName: { type: 'string' },
        teamsClaimMap: { type: 'object', additionalProperties: { type: 'string' } },
        defaultTeams: { type: 'array', items: { type: 'string' } },
        scopes: { type: 'array', items: { type: 'string' } },
        tokenExpirationTime: { type: 'number' },
        authorizationRequestCustomParams: { type: 'object', additionalProperties: { type: 'string' } },
        tokenRequestCustomParams: { type: 'object', additionalProperties: { type: 'string' } },
        audience: { type: 'array', items: { type: 'string' } },
    },
    required: ['type', 'clientId'],
    oneOf: [{ required: ['configurationUrl'] }, { required: ['configuration'] }],
    additionalProperties: false,
};
export const saml2ProviderConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: AuthProviderType.SAML2 },
        title: { type: 'string' },
        issuerId: { type: 'string' },
        entityId: { type: 'string' },
        ssoUrl: { type: 'string' },
        x509PublicCert: { type: 'string' },
        teamsAttributeName: { type: 'string', default: DEFAULT_TEAM_CLAIM_NAME },
        teamsAttributeMap: { type: 'object', additionalProperties: { type: 'string' } },
        defaultTeams: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
    required: ['type', 'issuerId', 'ssoUrl', 'x509PublicCert'],
};
export const authProviderConfigSchema = {
    oneOf: [oidcProviderConfigSchema, saml2ProviderConfigSchema],
    discriminator: { propertyName: 'type' },
};
export const ssoDirectConfigSchema = {
    type: 'object',
    additionalProperties: authProviderConfigSchema,
};
export const ssoConfigSchema = {
    oneOf: [
        {
            type: 'array',
            items: {
                type: 'string',
                enum: ['REDOCLY', 'CORPORATE', 'GUEST'],
            },
            uniqueItems: true,
        },
        {
            type: 'string',
            enum: ['REDOCLY', 'CORPORATE', 'GUEST'],
        },
    ],
};
export const redirectConfigSchema = {
    type: 'object',
    properties: {
        to: { type: 'string' },
        type: { type: 'number', default: 301 },
    },
    additionalProperties: false,
};
export const redirectsConfigSchema = {
    type: 'object',
    additionalProperties: redirectConfigSchema,
    default: {},
};
const rulesSchema = {
    type: 'object',
    additionalProperties: {
        oneOf: [{ type: 'string' }, { type: 'object' }],
    },
};
export const apiConfigSchema = {
    type: 'object',
    properties: {
        root: { type: 'string' },
        output: { type: 'string', pattern: '(.ya?ml|.json)$' },
        rbac: { type: 'object', additionalProperties: true },
        openapi: openapiConfigSchema,
        graphql: graphqlConfigSchema,
        /**
         * @deprecated left for backwards compatibility
         */
        theme: {
            type: 'object',
            properties: {
                openapi: openapiConfigSchema,
                graphql: graphqlConfigSchema,
            },
            additionalProperties: false,
        },
        title: { type: 'string' },
        metadata: { type: 'object', additionalProperties: true },
        rules: rulesSchema,
        decorators: { type: 'object', additionalProperties: true },
        preprocessors: { type: 'object', additionalProperties: true },
    },
    required: ['root'],
};
const metadataConfigSchema = {
    type: 'object',
    additionalProperties: true,
};
const metadataGlobsConfigSchema = {
    type: 'object',
    additionalProperties: {
        type: 'object',
        additionalProperties: true,
    },
};
export const seoConfigSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        siteUrl: { type: 'string' },
        image: { type: 'string' },
        keywords: {
            oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
        },
        lang: { type: 'string' },
        jsonLd: { type: 'object' },
        meta: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    content: { type: 'string' },
                },
                required: ['name', 'content'],
                additionalProperties: false,
            },
        },
    },
    additionalProperties: false,
};
export const apiFunctionsConfigSchema = {
    type: 'object',
    properties: {
        folders: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
};
export const rbacScopeItemsSchema = {
    type: 'object',
    additionalProperties: { type: 'string' },
};
export const rbacConfigSchema = {
    type: 'object',
    properties: {
        teamNamePatterns: { type: 'array', items: { type: 'string' } },
        teamFolders: { type: 'array', items: { type: 'string' } },
        teamFoldersBaseRoles: rbacScopeItemsSchema,
        cms: rbacScopeItemsSchema, // deprecated in favor of reunite
        reunite: rbacScopeItemsSchema,
        features: {
            type: 'object',
            properties: {
                aiSearch: rbacScopeItemsSchema,
            },
            additionalProperties: false,
        },
        content: {
            type: 'object',
            properties: {
                '**': rbacScopeItemsSchema,
            },
            additionalProperties: rbacScopeItemsSchema,
        },
    },
    additionalProperties: rbacScopeItemsSchema,
};
export const graviteeAdapterAuthStaticSchema = {
    type: 'object',
    properties: { static: { type: 'string' } },
    additionalProperties: false,
    required: ['static'],
};
export const graviteeAdapterAuthIdpSchema = {
    type: 'object',
    properties: { idp: { type: 'string' } },
    additionalProperties: false,
    required: ['idp'],
};
export const graviteeAdapterConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: 'GRAVITEE' },
        apiBaseUrl: { type: 'string' },
        env: { type: 'string' },
        allowApiProductsOutsideCatalog: { type: 'boolean', default: false },
        stage: { type: 'string', default: 'non-production' },
        auth: {
            oneOf: [graviteeAdapterAuthStaticSchema, graviteeAdapterAuthIdpSchema],
        },
    },
    additionalProperties: false,
    required: ['type', 'apiBaseUrl'],
};
export const apigeeAdapterAuthOauth2Schema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: ApigeeDevOnboardingIntegrationAuthType.OAUTH2 },
        tokenEndpoint: { type: 'string' },
        clientId: { type: 'string' },
        clientSecret: { type: 'string' },
    },
    additionalProperties: false,
    required: ['type', 'tokenEndpoint', 'clientId', 'clientSecret'],
};
export const apigeeAdapterAuthServiceAccountSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: ApigeeDevOnboardingIntegrationAuthType.SERVICE_ACCOUNT },
        serviceAccountEmail: { type: 'string' },
        serviceAccountPrivateKey: { type: 'string' },
    },
    additionalProperties: false,
    required: ['type', 'serviceAccountEmail', 'serviceAccountPrivateKey'],
};
export const apigeeXAdapterConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: 'APIGEE_X' },
        apiUrl: { type: 'string' },
        stage: { type: 'string', default: 'non-production' },
        organizationName: { type: 'string' },
        ignoreApiProducts: { type: 'array', items: { type: 'string' } },
        allowApiProductsOutsideCatalog: { type: 'boolean', default: false },
        auth: {
            type: 'object',
            oneOf: [apigeeAdapterAuthOauth2Schema, apigeeAdapterAuthServiceAccountSchema],
            discriminator: { propertyName: 'type' },
        },
    },
    additionalProperties: false,
    required: ['type', 'organizationName', 'auth'],
};
export const apigeeEdgeAdapterConfigSchema = Object.assign(Object.assign({}, apigeeXAdapterConfigSchema), { properties: Object.assign(Object.assign({}, apigeeXAdapterConfigSchema.properties), { type: { type: 'string', const: 'APIGEE_EDGE' } }) });
export const devOnboardingAdapterConfigSchema = {
    type: 'object',
    oneOf: [apigeeXAdapterConfigSchema, apigeeEdgeAdapterConfigSchema, graviteeAdapterConfigSchema],
    discriminator: { propertyName: 'type' },
};
const devOnboardingConfigSchema = {
    type: 'object',
    required: ['adapters'],
    additionalProperties: false,
    properties: {
        adapters: {
            type: 'array',
            items: devOnboardingAdapterConfigSchema,
        },
    },
};
export const l10nConfigSchema = {
    type: 'object',
    properties: {
        defaultLocale: {
            type: 'string',
        },
        locales: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    code: {
                        type: 'string',
                    },
                    name: {
                        type: 'string',
                    },
                },
                required: ['code'],
            },
        },
    },
    additionalProperties: false,
    required: ['defaultLocale'],
};
const responseHeaderSchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        value: { type: 'string' },
    },
    additionalProperties: false,
    required: ['name', 'value'],
};
export const redoclyConfigSchema = {
    type: 'object',
    properties: {
        /**
         * @deprecated Should use `plugins` instead
         */
        imports: {
            type: 'array',
            items: { type: 'string' },
        },
        licenseKey: { type: 'string' },
        redirects: redirectsConfigSchema,
        seo: seoConfigSchema,
        rbac: rbacConfigSchema,
        apiFunctions: apiFunctionsConfigSchema,
        requiresLogin: { type: 'boolean' },
        responseHeaders: {
            type: 'object',
            additionalProperties: {
                type: 'array',
                items: responseHeaderSchema,
            },
        },
        mockServer: {
            type: 'object',
            properties: {
                off: { type: 'boolean', default: false },
                position: { type: 'string', enum: ['first', 'last', 'replace', 'off'], default: 'first' },
                strictExamples: { type: 'boolean', default: false },
                errorIfForcedExampleNotFound: { type: 'boolean', default: false },
                description: { type: 'string' },
            },
        },
        apis: {
            type: 'object',
            additionalProperties: apiConfigSchema,
        },
        rules: rulesSchema,
        decorators: { type: 'object', additionalProperties: true },
        preprocessors: { type: 'object', additionalProperties: true },
        ssoDirect: ssoDirectConfigSchema,
        sso: ssoConfigSchema,
        residency: { type: 'string' },
        developerOnboarding: devOnboardingConfigSchema,
        removeAttribution: { type: 'boolean' },
        i18n: l10nConfigSchema, // deprecated
        l10n: l10nConfigSchema,
        metadata: metadataConfigSchema,
        metadataGlobs: metadataGlobsConfigSchema,
        ignore: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        /**
         * @deprecated properties moved to the root of the config
         */
        theme: themeConfigSchema,
        reunite: reuniteConfigSchema,
        // Ex theme properties
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
    default: { redirects: {} },
    additionalProperties: true,
};
const environmentSchema = Object.assign(Object.assign({}, removePropertyRecursively(redoclyConfigSchema, 'default')), { additionalProperties: false });
export const rootRedoclyConfigSchema = Object.assign(Object.assign({ $id: 'root-redocly-config' }, redoclyConfigSchema), { properties: Object.assign(Object.assign({ plugins: {
            type: 'array',
            items: { type: 'string' },
        } }, redoclyConfigSchema.properties), { env: {
            type: 'object',
            additionalProperties: environmentSchema, // TODO: if we want full validation we need to override apis, theme and the root
        } }), default: {}, additionalProperties: false });
//# sourceMappingURL=root-config-schema.js.map