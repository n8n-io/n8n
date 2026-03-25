"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootRedoclyConfigSchema = exports.redoclyConfigSchema = exports.l10nConfigSchema = exports.devOnboardingAdapterConfigSchema = exports.apigeeEdgeAdapterConfigSchema = exports.apigeeXAdapterConfigSchema = exports.apigeeAdapterAuthServiceAccountSchema = exports.apigeeAdapterAuthOauth2Schema = exports.graviteeAdapterConfigSchema = exports.graviteeAdapterAuthIdpSchema = exports.graviteeAdapterAuthStaticSchema = exports.rbacConfigSchema = exports.rbacScopeItemsSchema = exports.seoConfigSchema = exports.apiConfigSchema = exports.redirectsConfigSchema = exports.redirectConfigSchema = exports.ssoConfigSchema = exports.ssoDirectConfigSchema = exports.authProviderConfigSchema = exports.saml2ProviderConfigSchema = exports.oidcProviderConfigSchema = exports.oidcIssuerMetadataSchema = void 0;
const constants_1 = require("./constants");
const default_theme_config_schema_1 = require("./default-theme-config-schema");
const feedback_config_schema_1 = require("./feedback-config-schema");
const graphql_config_schema_1 = require("./graphql-config-schema");
const remove_property_recursively_1 = require("./remove-property-recursively");
const reunite_config_schema_1 = require("./reunite-config-schema");
const ex_theme_config_schemas_1 = require("./ex-theme-config-schemas");
exports.oidcIssuerMetadataSchema = {
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
exports.oidcProviderConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: constants_1.AuthProviderType.OIDC },
        title: { type: 'string' },
        pkce: { type: 'boolean', default: false },
        configurationUrl: { type: 'string', minLength: 1 },
        configuration: exports.oidcIssuerMetadataSchema,
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
exports.saml2ProviderConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: constants_1.AuthProviderType.SAML2 },
        title: { type: 'string' },
        issuerId: { type: 'string' },
        entityId: { type: 'string' },
        ssoUrl: { type: 'string' },
        x509PublicCert: { type: 'string' },
        teamsAttributeName: { type: 'string', default: constants_1.DEFAULT_TEAM_CLAIM_NAME },
        teamsAttributeMap: { type: 'object', additionalProperties: { type: 'string' } },
        defaultTeams: { type: 'array', items: { type: 'string' } },
    },
    additionalProperties: false,
    required: ['type', 'issuerId', 'ssoUrl', 'x509PublicCert'],
};
exports.authProviderConfigSchema = {
    oneOf: [exports.oidcProviderConfigSchema, exports.saml2ProviderConfigSchema],
    discriminator: { propertyName: 'type' },
};
exports.ssoDirectConfigSchema = {
    type: 'object',
    additionalProperties: exports.authProviderConfigSchema,
};
exports.ssoConfigSchema = {
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
exports.redirectConfigSchema = {
    type: 'object',
    properties: {
        to: { type: 'string' },
        type: { type: 'number', default: 301 },
    },
    additionalProperties: false,
};
exports.redirectsConfigSchema = {
    type: 'object',
    additionalProperties: exports.redirectConfigSchema,
    default: {},
};
const rulesSchema = {
    type: 'object',
    additionalProperties: {
        oneOf: [{ type: 'string' }, { type: 'object' }],
    },
};
exports.apiConfigSchema = {
    type: 'object',
    properties: {
        root: { type: 'string' },
        output: { type: 'string', pattern: '(.ya?ml|.json)$' },
        rbac: { type: 'object', additionalProperties: true },
        openapi: ex_theme_config_schemas_1.openapiConfigSchema,
        graphql: graphql_config_schema_1.graphqlConfigSchema,
        /**
         * @deprecated left for backwards compatibility
         */
        theme: {
            type: 'object',
            properties: {
                openapi: ex_theme_config_schemas_1.openapiConfigSchema,
                graphql: graphql_config_schema_1.graphqlConfigSchema,
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
exports.seoConfigSchema = {
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
exports.rbacScopeItemsSchema = {
    type: 'object',
    additionalProperties: { type: 'string' },
};
exports.rbacConfigSchema = {
    type: 'object',
    properties: {
        teamNamePatterns: { type: 'array', items: { type: 'string' } },
        teamFolders: { type: 'array', items: { type: 'string' } },
        teamFoldersBaseRoles: exports.rbacScopeItemsSchema,
        cms: exports.rbacScopeItemsSchema, // deprecated in favor of reunite
        reunite: exports.rbacScopeItemsSchema,
        features: {
            type: 'object',
            properties: {
                aiSearch: exports.rbacScopeItemsSchema,
            },
            additionalProperties: false,
        },
        content: {
            type: 'object',
            properties: {
                '**': exports.rbacScopeItemsSchema,
            },
            additionalProperties: exports.rbacScopeItemsSchema,
        },
    },
    additionalProperties: exports.rbacScopeItemsSchema,
};
exports.graviteeAdapterAuthStaticSchema = {
    type: 'object',
    properties: { static: { type: 'string' } },
    additionalProperties: false,
    required: ['static'],
};
exports.graviteeAdapterAuthIdpSchema = {
    type: 'object',
    properties: { idp: { type: 'string' } },
    additionalProperties: false,
    required: ['idp'],
};
exports.graviteeAdapterConfigSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: 'GRAVITEE' },
        apiBaseUrl: { type: 'string' },
        env: { type: 'string' },
        allowApiProductsOutsideCatalog: { type: 'boolean', default: false },
        stage: { type: 'string', default: 'non-production' },
        auth: {
            oneOf: [exports.graviteeAdapterAuthStaticSchema, exports.graviteeAdapterAuthIdpSchema],
        },
    },
    additionalProperties: false,
    required: ['type', 'apiBaseUrl'],
};
exports.apigeeAdapterAuthOauth2Schema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: constants_1.ApigeeDevOnboardingIntegrationAuthType.OAUTH2 },
        tokenEndpoint: { type: 'string' },
        clientId: { type: 'string' },
        clientSecret: { type: 'string' },
    },
    additionalProperties: false,
    required: ['type', 'tokenEndpoint', 'clientId', 'clientSecret'],
};
exports.apigeeAdapterAuthServiceAccountSchema = {
    type: 'object',
    properties: {
        type: { type: 'string', const: constants_1.ApigeeDevOnboardingIntegrationAuthType.SERVICE_ACCOUNT },
        serviceAccountEmail: { type: 'string' },
        serviceAccountPrivateKey: { type: 'string' },
    },
    additionalProperties: false,
    required: ['type', 'serviceAccountEmail', 'serviceAccountPrivateKey'],
};
exports.apigeeXAdapterConfigSchema = {
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
            oneOf: [exports.apigeeAdapterAuthOauth2Schema, exports.apigeeAdapterAuthServiceAccountSchema],
            discriminator: { propertyName: 'type' },
        },
    },
    additionalProperties: false,
    required: ['type', 'organizationName', 'auth'],
};
exports.apigeeEdgeAdapterConfigSchema = Object.assign(Object.assign({}, exports.apigeeXAdapterConfigSchema), { properties: Object.assign(Object.assign({}, exports.apigeeXAdapterConfigSchema.properties), { type: { type: 'string', const: 'APIGEE_EDGE' } }) });
exports.devOnboardingAdapterConfigSchema = {
    type: 'object',
    oneOf: [exports.apigeeXAdapterConfigSchema, exports.apigeeEdgeAdapterConfigSchema, exports.graviteeAdapterConfigSchema],
    discriminator: { propertyName: 'type' },
};
const devOnboardingConfigSchema = {
    type: 'object',
    required: ['adapters'],
    additionalProperties: false,
    properties: {
        adapters: {
            type: 'array',
            items: exports.devOnboardingAdapterConfigSchema,
        },
    },
};
exports.l10nConfigSchema = {
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
exports.redoclyConfigSchema = {
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
        redirects: exports.redirectsConfigSchema,
        seo: exports.seoConfigSchema,
        rbac: exports.rbacConfigSchema,
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
            additionalProperties: exports.apiConfigSchema,
        },
        rules: rulesSchema,
        decorators: { type: 'object', additionalProperties: true },
        preprocessors: { type: 'object', additionalProperties: true },
        ssoDirect: exports.ssoDirectConfigSchema,
        sso: exports.ssoConfigSchema,
        residency: { type: 'string' },
        developerOnboarding: devOnboardingConfigSchema,
        removeAttribution: { type: 'boolean' },
        i18n: exports.l10nConfigSchema, // deprecated
        l10n: exports.l10nConfigSchema,
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
        theme: default_theme_config_schema_1.themeConfigSchema,
        reunite: reunite_config_schema_1.reuniteConfigSchema,
        // Ex theme properties
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
    default: { redirects: {} },
    additionalProperties: true,
};
const environmentSchema = Object.assign(Object.assign({}, (0, remove_property_recursively_1.removePropertyRecursively)(exports.redoclyConfigSchema, 'default')), { additionalProperties: false });
exports.rootRedoclyConfigSchema = Object.assign(Object.assign({ $id: 'root-redocly-config' }, exports.redoclyConfigSchema), { properties: Object.assign(Object.assign({ plugins: {
            type: 'array',
            items: { type: 'string' },
        } }, exports.redoclyConfigSchema.properties), { env: {
            type: 'object',
            additionalProperties: environmentSchema, // TODO: if we want full validation we need to override apis, theme and the root
        } }), default: {}, additionalProperties: false });
//# sourceMappingURL=root-config-schema.js.map