import type { FromSchema } from 'json-schema-to-ts';
import type { themeConfigSchema } from '../default-theme-config-schema';
import type { productConfigOverrideSchema } from '../product-override-schema';
import type { apiConfigSchema, apigeeAdapterAuthOauth2Schema, apigeeAdapterAuthServiceAccountSchema, apigeeEdgeAdapterConfigSchema, apigeeXAdapterConfigSchema, authProviderConfigSchema, devOnboardingAdapterConfigSchema, graviteeAdapterConfigSchema, l10nConfigSchema, oidcIssuerMetadataSchema, oidcProviderConfigSchema, rbacConfigSchema, rbacScopeItemsSchema, redirectConfigSchema, redirectsConfigSchema, rootRedoclyConfigSchema, saml2ProviderConfigSchema, seoConfigSchema, ssoDirectConfigSchema } from '../root-config-schema';
import type { RedocConfigTypes } from './redoc-types';
import type { GraphQLConfigTypes } from './graphql-types';
import type { productConfigSchema, productGoogleAnalyticsConfigSchema, markdownConfigSchema, amplitudeAnalyticsConfigSchema, rudderstackAnalyticsConfigSchema, segmentAnalyticsConfigSchema, gtmAnalyticsConfigSchema, googleAnalyticsConfigSchema, scorecardConfigSchema, catalogFilterSchema, catalogSchema, searchFacetsConfigSchema } from '../ex-theme-config-schemas';
import type { reuniteConfigSchema } from '../reunite-config-schema';
import type { optionalEmailSettings, reasonsSettings } from '../feedback-config-schema';
/**
 * @deprecated left for backwards compatibility. To be removed in Realm 1.0
 */
export type ThemeConfig = Omit<FromSchema<typeof themeConfigSchema>, 'openapi'> & {
    openapi?: RedocConfigTypes;
};
export type RedocConfig = RedocConfigTypes;
export type GraphQLConfig = GraphQLConfigTypes;
export type ProductConfig = FromSchema<typeof productConfigSchema>;
export type ProductGoogleAnalyticsConfig = FromSchema<typeof productGoogleAnalyticsConfigSchema>;
export type MarkdownConfig = FromSchema<typeof markdownConfigSchema>;
export type AmplitudeAnalyticsConfig = FromSchema<typeof amplitudeAnalyticsConfigSchema>;
export type RudderstackAnalyticsConfig = FromSchema<typeof rudderstackAnalyticsConfigSchema>;
export type SegmentAnalyticsConfig = FromSchema<typeof segmentAnalyticsConfigSchema>;
export type GtmAnalyticsConfig = FromSchema<typeof gtmAnalyticsConfigSchema>;
export type GoogleAnalyticsConfig = FromSchema<typeof googleAnalyticsConfigSchema>;
export type CatalogConfig = FromSchema<typeof catalogSchema>;
export type CatalogFilterConfig = FromSchema<typeof catalogFilterSchema>;
export type ReuniteConfig = FromSchema<typeof reuniteConfigSchema>;
export type ScorecardConfig = FromSchema<typeof scorecardConfigSchema>;
export type SearchFacetsConfig = FromSchema<typeof searchFacetsConfigSchema>;
export type RedoclyConfig = Omit<FromSchema<typeof rootRedoclyConfigSchema>, 'theme' | 'apis'> & {
    /**
     * @deprecated properties moved to the root of the config
     */
    theme?: any;
    apis?: Record<string, ApiConfig>;
};
export type RedirectConfig = FromSchema<typeof redirectConfigSchema>;
export type RedirectsConfig = FromSchema<typeof redirectsConfigSchema>;
export type AuthProviderConfig = FromSchema<typeof authProviderConfigSchema>;
export type OidcProviderConfig = FromSchema<typeof oidcProviderConfigSchema>;
export type Saml2ProviderConfig = FromSchema<typeof saml2ProviderConfigSchema>;
export type SeoConfig = FromSchema<typeof seoConfigSchema>;
export type RbacConfig = FromSchema<typeof rbacConfigSchema>;
export type RbacScopeItems = FromSchema<typeof rbacScopeItemsSchema>;
export type OidcIssuerMetadata = FromSchema<typeof oidcIssuerMetadataSchema>;
export type DevOnboardingAdapterConfig = FromSchema<typeof devOnboardingAdapterConfigSchema>;
export type GraviteeAdapterConfig = FromSchema<typeof graviteeAdapterConfigSchema>;
export type ApigeeAdapterConfig = FromSchema<typeof apigeeXAdapterConfigSchema | typeof apigeeEdgeAdapterConfigSchema>;
export type ApigeeAdapterAuthOauth2 = FromSchema<typeof apigeeAdapterAuthOauth2Schema>;
export type ApigeeAdapterAuthServiceAccount = FromSchema<typeof apigeeAdapterAuthServiceAccountSchema>;
export type SsoConfig = FromSchema<typeof ssoDirectConfigSchema>;
export type L10nConfig = FromSchema<typeof l10nConfigSchema>;
type BasicApiConfig = FromSchema<typeof apiConfigSchema>;
export type ApiConfig = BasicApiConfig & {
    /**
     * @deprecated left for backwards compatibility
     */
    theme?: {
        openapi?: RedocConfig;
        graphql?: GraphQLConfig;
    };
};
export type ProductConfigOverride = FromSchema<typeof productConfigOverrideSchema>;
export type ReasonsSettingsSchema = FromSchema<typeof reasonsSettings>;
export type OptionalEmailSettings = FromSchema<typeof optionalEmailSettings>;
export {};
