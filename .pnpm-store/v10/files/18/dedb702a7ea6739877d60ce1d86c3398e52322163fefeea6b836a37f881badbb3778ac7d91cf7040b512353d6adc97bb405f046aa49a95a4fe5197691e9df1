/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// AADAuthorityConstants

import { ClientApplication } from "./ClientApplication.js";
import { Configuration } from "../config/Configuration.js";
import { ClientAssertion } from "./ClientAssertion.js";
import {
    Constants as NodeConstants,
    ApiId,
    REGION_ENVIRONMENT_VARIABLE,
    MSAL_FORCE_REGION,
} from "../utils/Constants.js";
import {
    CommonClientCredentialRequest,
    CommonOnBehalfOfRequest,
    AuthenticationResult,
    AzureRegionConfiguration,
    AuthError,
    IAppTokenProvider,
    OIDC_DEFAULT_SCOPES,
    UrlString,
    AADAuthorityConstants,
    createClientAuthError,
    ClientAuthErrorCodes,
    ClientAssertion as ClientAssertionType,
    getClientAssertion,
    AzureRegion,
} from "@azure/msal-common/node";
import { IConfidentialClientApplication } from "./IConfidentialClientApplication.js";
import { OnBehalfOfRequest } from "../request/OnBehalfOfRequest.js";
import { ClientCredentialRequest } from "../request/ClientCredentialRequest.js";
import { ClientCredentialClient } from "./ClientCredentialClient.js";
import { OnBehalfOfClient } from "./OnBehalfOfClient.js";

/**
 *  This class is to be used to acquire tokens for confidential client applications (webApp, webAPI). Confidential client applications
 *  will configure application secrets, client certificates/assertions as applicable
 * @public
 */
export class ConfidentialClientApplication
    extends ClientApplication
    implements IConfidentialClientApplication
{
    private appTokenProvider?: IAppTokenProvider;

    /**
     * Constructor for the ConfidentialClientApplication
     *
     * Required attributes in the Configuration object are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our application registration portal
     * - authority: the authority URL for your application.
     * - client credential: Must set either client secret, certificate, or assertion for confidential clients. You can obtain a client secret from the application registration portal.
     *
     * In Azure AD, authority is a URL indicating of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://\{instance\}/tfp/\{tenant\}/\{policyName\}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param Configuration - configuration object for the MSAL ConfidentialClientApplication instance
     */
    constructor(configuration: Configuration) {
        super(configuration);

        const clientSecretNotEmpty = !!this.config.auth.clientSecret;
        const clientAssertionNotEmpty = !!this.config.auth.clientAssertion;
        const certificateNotEmpty =
            (!!this.config.auth.clientCertificate?.thumbprint ||
                !!this.config.auth.clientCertificate?.thumbprintSha256) &&
            !!this.config.auth.clientCertificate?.privateKey;

        /*
         * If app developer configures this callback, they don't need a credential
         * i.e. AzureSDK can get token from Managed Identity without a cert / secret
         */
        if (this.appTokenProvider) {
            return;
        }

        // Check that at most one credential is set on the application
        if (
            (clientSecretNotEmpty && clientAssertionNotEmpty) ||
            (clientAssertionNotEmpty && certificateNotEmpty) ||
            (clientSecretNotEmpty && certificateNotEmpty)
        ) {
            throw createClientAuthError(
                ClientAuthErrorCodes.invalidClientCredential
            );
        }

        if (this.config.auth.clientSecret) {
            this.clientSecret = this.config.auth.clientSecret;
            return;
        }

        if (this.config.auth.clientAssertion) {
            this.developerProvidedClientAssertion =
                this.config.auth.clientAssertion;
            return;
        }

        if (!certificateNotEmpty) {
            throw createClientAuthError(
                ClientAuthErrorCodes.invalidClientCredential
            );
        } else {
            this.clientAssertion = !!this.config.auth.clientCertificate
                .thumbprintSha256
                ? ClientAssertion.fromCertificateWithSha256Thumbprint(
                      this.config.auth.clientCertificate.thumbprintSha256,
                      this.config.auth.clientCertificate.privateKey,
                      this.config.auth.clientCertificate.x5c
                  )
                : ClientAssertion.fromCertificate(
                      // guaranteed to be a string, due to prior error checking in this function
                      this.config.auth.clientCertificate.thumbprint as string,
                      this.config.auth.clientCertificate.privateKey,
                      this.config.auth.clientCertificate.x5c
                  );
        }
        this.appTokenProvider = undefined;
    }

    /**
     * This extensibility point only works for the client_credential flow, i.e. acquireTokenByClientCredential and
     * is meant for Azure SDK to enhance Managed Identity support.
     *
     * @param IAppTokenProvider  - Extensibility interface, which allows the app developer to return a token from a custom source.
     */
    SetAppTokenProvider(provider: IAppTokenProvider): void {
        this.appTokenProvider = provider;
    }

    /**
     * Acquires tokens from the authority for the application (not for an end user).
     */
    public async acquireTokenByClientCredential(
        request: ClientCredentialRequest
    ): Promise<AuthenticationResult | null> {
        this.logger.info(
            "acquireTokenByClientCredential called",
            request.correlationId
        );

        // If there is a client assertion present in the request, it overrides the one present in the client configuration
        let clientAssertion: ClientAssertionType | undefined;
        if (request.clientAssertion) {
            clientAssertion = {
                assertion: await getClientAssertion(
                    request.clientAssertion,
                    this.config.auth.clientId
                    // tokenEndpoint will be undefined. resourceRequestUri is omitted in ClientCredentialRequest
                ),
                assertionType: NodeConstants.JWT_BEARER_ASSERTION_TYPE,
            };
        }

        const baseRequest = await this.initializeBaseRequest(request);

        // valid base request should not contain oidc scopes in this grant type
        const validBaseRequest = {
            ...baseRequest,
            scopes: baseRequest.scopes.filter(
                (scope: string) => !OIDC_DEFAULT_SCOPES.includes(scope)
            ),
        };

        const validRequest: CommonClientCredentialRequest = {
            ...request,
            ...validBaseRequest,
            clientAssertion,
        };

        /*
         * valid request should not have "common" or "organizations" in lieu of the tenant_id in the authority in the auth configuration
         * example authority: "https://login.microsoftonline.com/TenantId",
         */
        const authority = new UrlString(validRequest.authority);
        const tenantId = authority.getUrlComponents().PathSegments[0];
        if (
            Object.values(AADAuthorityConstants).includes(
                tenantId as AADAuthorityConstants
            )
        ) {
            throw createClientAuthError(
                ClientAuthErrorCodes.missingTenantIdError
            );
        }

        /*
         * if this env variable is set, and the developer provided region isn't defined and isn't "DisableMsalForceRegion",
         * MSAL shall opt-in to ESTS-R with the value of this variable
         */
        const ENV_MSAL_FORCE_REGION: AzureRegion | undefined =
            process.env[MSAL_FORCE_REGION];

        let region: AzureRegion | undefined;
        if (validRequest.azureRegion !== "DisableMsalForceRegion") {
            if (!validRequest.azureRegion && ENV_MSAL_FORCE_REGION) {
                region = ENV_MSAL_FORCE_REGION;
            } else {
                region = validRequest.azureRegion;
            }
        }

        const azureRegionConfiguration: AzureRegionConfiguration = {
            azureRegion: region,
            environmentRegion: process.env[REGION_ENVIRONMENT_VARIABLE],
        };

        const serverTelemetryManager = this.initializeServerTelemetryManager(
            ApiId.acquireTokenByClientCredential,
            validRequest.correlationId,
            validRequest.skipCache
        );
        try {
            const discoveredAuthority = await this.createAuthority(
                validRequest.authority,
                validRequest.correlationId,
                azureRegionConfiguration,
                request.azureCloudOptions
            );
            const clientCredentialConfig =
                await this.buildOauthClientConfiguration(
                    discoveredAuthority,
                    validRequest.correlationId,
                    "",
                    serverTelemetryManager
                );
            const clientCredentialClient = new ClientCredentialClient(
                clientCredentialConfig,
                this.appTokenProvider
            );
            this.logger.verbose(
                "Client credential client created",
                validRequest.correlationId
            );
            return await clientCredentialClient.acquireToken(validRequest);
        } catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(validRequest.correlationId);
            }
            serverTelemetryManager.cacheFailedRequest(e);
            throw e;
        }
    }

    /**
     * Acquires tokens from the authority for the application.
     *
     * Used in scenarios where the current app is a middle-tier service which was called with a token
     * representing an end user. The current app can use the token (oboAssertion) to request another
     * token to access downstream web API, on behalf of that user.
     *
     * The current middle-tier app has no user interaction to obtain consent.
     * See how to gain consent upfront for your middle-tier app from this article.
     * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow#gaining-consent-for-the-middle-tier-application
     */
    public async acquireTokenOnBehalfOf(
        request: OnBehalfOfRequest
    ): Promise<AuthenticationResult | null> {
        this.logger.info(
            "acquireTokenOnBehalfOf called",
            request.correlationId
        );
        const validRequest: CommonOnBehalfOfRequest = {
            ...request,
            ...(await this.initializeBaseRequest(request)),
        };
        try {
            const discoveredAuthority = await this.createAuthority(
                validRequest.authority,
                validRequest.correlationId,
                undefined,
                request.azureCloudOptions
            );
            const onBehalfOfConfig = await this.buildOauthClientConfiguration(
                discoveredAuthority,
                validRequest.correlationId,
                "",
                undefined
            );
            const oboClient = new OnBehalfOfClient(onBehalfOfConfig);
            this.logger.verbose(
                "On behalf of client created",
                validRequest.correlationId
            );
            return await oboClient.acquireToken(validRequest);
        } catch (e) {
            if (e instanceof AuthError) {
                e.setCorrelationId(validRequest.correlationId);
            }
            throw e;
        }
    }
}
