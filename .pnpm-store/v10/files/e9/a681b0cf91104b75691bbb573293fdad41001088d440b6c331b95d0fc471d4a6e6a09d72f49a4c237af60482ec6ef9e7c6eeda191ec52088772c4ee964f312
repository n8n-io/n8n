// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AuthenticationError, CredentialUnavailableError } from "../errors.js";
import { createHttpHeaders, createPipelineRequest } from "@azure/core-rest-pipeline";
import { ClientAssertionCredential } from "./clientAssertionCredential.js";
import { IdentityClient } from "../client/identityClient.js";
import { checkTenantId } from "../util/tenantIdUtils.js";
import { credentialLogger } from "../util/logging.js";
const credentialName = "AzurePipelinesCredential";
const logger = credentialLogger(credentialName);
const OIDC_API_VERSION = "7.1";
/**
 * This credential is designed to be used in Azure Pipelines with service connections
 * as a setup for workload identity federation.
 */
export class AzurePipelinesCredential {
    clientAssertionCredential;
    identityClient;
    /**
     * AzurePipelinesCredential supports Federated Identity on Azure Pipelines through Service Connections.
     * @param tenantId - tenantId associated with the service connection
     * @param clientId - clientId associated with the service connection
     * @param serviceConnectionId - Unique ID for the service connection, as found in the querystring's resourceId key
     * @param systemAccessToken - The pipeline's <see href="https://learn.microsoft.com/azure/devops/pipelines/build/variables?view=azure-devops%26tabs=yaml#systemaccesstoken">System.AccessToken</see> value.
     * @param options - The identity client options to use for authentication.
     */
    constructor(tenantId, clientId, serviceConnectionId, systemAccessToken, options = {}) {
        if (!clientId) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. clientId is a required parameter.`);
        }
        if (!tenantId) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. tenantId is a required parameter.`);
        }
        if (!serviceConnectionId) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. serviceConnectionId is a required parameter.`);
        }
        if (!systemAccessToken) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. systemAccessToken is a required parameter.`);
        }
        // Allow these headers to be logged for troubleshooting by AzurePipelines.
        options.loggingOptions = {
            ...options?.loggingOptions,
            additionalAllowedHeaderNames: [
                ...(options.loggingOptions?.additionalAllowedHeaderNames ?? []),
                "x-vss-e2eid",
                "x-msedge-ref",
            ],
        };
        this.identityClient = new IdentityClient(options);
        checkTenantId(logger, tenantId);
        logger.info(`Invoking AzurePipelinesCredential with tenant ID: ${tenantId}, client ID: ${clientId}, and service connection ID: ${serviceConnectionId}`);
        if (!process.env.SYSTEM_OIDCREQUESTURI) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. Ensure that you're running this task in an Azure Pipeline, so that following missing system variable(s) can be defined- "SYSTEM_OIDCREQUESTURI"`);
        }
        const oidcRequestUrl = `${process.env.SYSTEM_OIDCREQUESTURI}?api-version=${OIDC_API_VERSION}&serviceConnectionId=${serviceConnectionId}`;
        logger.info(`Invoking ClientAssertionCredential with tenant ID: ${tenantId}, client ID: ${clientId} and service connection ID: ${serviceConnectionId}`);
        this.clientAssertionCredential = new ClientAssertionCredential(tenantId, clientId, this.requestOidcToken.bind(this, oidcRequestUrl, systemAccessToken), options);
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} or {@link AuthenticationError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    async getToken(scopes, options) {
        if (!this.clientAssertionCredential) {
            const errorMessage = `${credentialName}: is unavailable. To use Federation Identity in Azure Pipelines, the following parameters are required - 
      tenantId,
      clientId,
      serviceConnectionId,
      systemAccessToken,
      "SYSTEM_OIDCREQUESTURI".      
      See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`;
            logger.error(errorMessage);
            throw new CredentialUnavailableError(errorMessage);
        }
        logger.info("Invoking getToken() of Client Assertion Credential");
        return this.clientAssertionCredential.getToken(scopes, options);
    }
    /**
     *
     * @param oidcRequestUrl - oidc request url
     * @param systemAccessToken - system access token
     * @returns OIDC token from Azure Pipelines
     */
    async requestOidcToken(oidcRequestUrl, systemAccessToken) {
        logger.info("Requesting OIDC token from Azure Pipelines...");
        logger.info(oidcRequestUrl);
        const request = createPipelineRequest({
            url: oidcRequestUrl,
            method: "POST",
            headers: createHttpHeaders({
                "Content-Type": "application/json",
                Authorization: `Bearer ${systemAccessToken}`,
                // Prevents the service from responding with a redirect HTTP status code (useful for automation).
                "X-TFS-FedAuthRedirect": "Suppress",
            }),
        });
        const response = await this.identityClient.sendRequest(request);
        return handleOidcResponse(response);
    }
}
export function handleOidcResponse(response) {
    // OIDC token is present in `bodyAsText` field
    const text = response.bodyAsText;
    if (!text) {
        logger.error(`${credentialName}: Authentication Failed. Received null token from OIDC request. Response status- ${response.status}. Complete response - ${JSON.stringify(response)}`);
        throw new AuthenticationError(response.status, {
            error: `${credentialName}: Authentication Failed. Received null token from OIDC request.`,
            error_description: `${JSON.stringify(response)}. See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`,
        });
    }
    try {
        const result = JSON.parse(text);
        if (result?.oidcToken) {
            return result.oidcToken;
        }
        else {
            const errorMessage = `${credentialName}: Authentication Failed. oidcToken field not detected in the response.`;
            let errorDescription = ``;
            if (response.status !== 200) {
                errorDescription = `Response body = ${text}. Response Headers ["x-vss-e2eid"] = ${response.headers.get("x-vss-e2eid")} and ["x-msedge-ref"] = ${response.headers.get("x-msedge-ref")}. See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`;
            }
            logger.error(errorMessage);
            logger.error(errorDescription);
            throw new AuthenticationError(response.status, {
                error: errorMessage,
                error_description: errorDescription,
            });
        }
    }
    catch (e) {
        const errorDetails = `${credentialName}: Authentication Failed. oidcToken field not detected in the response.`;
        logger.error(`Response from service = ${text}, Response Headers ["x-vss-e2eid"] = ${response.headers.get("x-vss-e2eid")} 
      and ["x-msedge-ref"] = ${response.headers.get("x-msedge-ref")}, error message = ${e.message}`);
        logger.error(errorDetails);
        throw new AuthenticationError(response.status, {
            error: errorDetails,
            error_description: `Response = ${text}. Response headers ["x-vss-e2eid"] = ${response.headers.get("x-vss-e2eid")} and ["x-msedge-ref"] =  ${response.headers.get("x-msedge-ref")}. See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/azurepipelinescredential/troubleshoot`,
        });
    }
}
//# sourceMappingURL=azurePipelinesCredential.js.map