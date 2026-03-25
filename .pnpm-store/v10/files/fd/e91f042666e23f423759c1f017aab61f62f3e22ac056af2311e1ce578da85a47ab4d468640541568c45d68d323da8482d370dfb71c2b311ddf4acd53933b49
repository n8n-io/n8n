/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ConnectionMapItem } from './msalConnectionManager';
/**
 * Represents the authentication configuration.
 */
export interface AuthConfiguration {
    /**
     * The tenant ID for the authentication configuration.
     */
    tenantId?: string;
    /**
     * The client ID for the authentication configuration. Required in production.
     */
    clientId?: string;
    /**
     * The client secret for the authentication configuration.
     */
    clientSecret?: string;
    /**
     * The path to the certificate PEM file.
     */
    certPemFile?: string;
    /**
     * The path to the certificate key file.
     */
    certKeyFile?: string;
    /**
     * Indicates whether to send the X5C param or not (for SNI authentication).
     */
    sendX5C?: boolean;
    /**
     * A list of valid issuers for the authentication configuration.
     */
    issuers?: string[];
    /**
     * The connection name for the authentication configuration.
     */
    connectionName?: string;
    /**
     * The FIC (First-Party Integration Channel) client ID.
     */
    FICClientId?: string;
    /**
     * Entra Authentication Endpoint to use.
     *
     * @remarks
     * If not populated the Entra Public Cloud endpoint is assumed.
     * This example of Public Cloud Endpoint is https://login.microsoftonline.com
     * see also https://learn.microsoft.com/entra/identity-platform/authentication-national-cloud
     */
    authority?: string;
    scope?: string;
    /**
     * A map of connection names to their respective authentication configurations.
     */
    connections?: Map<string, AuthConfiguration>;
    /**
     * A list of connection map items to map service URLs to connection names.
     */
    connectionsMap?: ConnectionMapItem[];
    /**
     * An optional alternative blueprint Connection name used when constructing a connector client.
     */
    altBlueprintConnectionName?: string;
    /**
     * The path to K8s provided token.
     */
    WIDAssertionFile?: string;
}
/**
 * Loads the authentication configuration from environment variables.
 *
 * @returns The authentication configuration.
 * @throws Will throw an error if clientId is not provided in production.
 *
 * @remarks
 * - `clientId` is required
 *
 * @example
 * ```
 * tenantId=your-tenant-id
 * clientId=your-client-id
 * clientSecret=your-client-secret
 *
 * certPemFile=your-cert-pem-file
 * certKeyFile=your-cert-key-file
 * sendX5C=false
 *
 * FICClientId=your-FIC-client-id
 *
 * connectionName=your-connection-name
 * authority=your-authority-endpoint
 * ```
 *
 */
export declare const loadAuthConfigFromEnv: (cnxName?: string) => AuthConfiguration;
/**
 * Loads the agent authentication configuration from previous version environment variables.
 *
 * @returns The agent authentication configuration.
 * @throws Will throw an error if MicrosoftAppId is not provided in production.
 *
 * @example
 * ```
 * MicrosoftAppId=your-client-id
 * MicrosoftAppPassword=your-client-secret
 * MicrosoftAppTenantId=your-tenant-id
 * ```
 *
 */
export declare const loadPrevAuthConfigFromEnv: () => AuthConfiguration;
/**
 * Loads the authentication configuration from the provided config or from the environment variables
 * providing default values for authority and issuers.
 *
 * @returns The authentication configuration.
 * @throws Will throw an error if clientId is not provided in production.
 *
 * @example
 * ```
 * tenantId=your-tenant-id
 * clientId=your-client-id
 * clientSecret=your-client-secret
 *
 * certPemFile=your-cert-pem-file
 * certKeyFile=your-cert-key-file
 * sendX5C=false
 *
 * FICClientId=your-FIC-client-id
 *
 * connectionName=your-connection-name
 * authority=your-authority-endpoint
 * ```
 *
 */
export declare function getAuthConfigWithDefaults(config?: AuthConfiguration): AuthConfiguration;
