/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Logger,
    createAuthError,
    AuthErrorCodes,
    IPerformanceClient,
    StringDict,
} from "@azure/msal-common/browser";
import {
    DOMExtraParameters,
    PlatformAuthRequest,
    PlatformDOMTokenRequest,
} from "./PlatformAuthRequest.js";
import { PlatformAuthConstants } from "../../utils/BrowserConstants.js";
import {
    PlatformAuthResponse,
    PlatformDOMTokenResponse,
} from "./PlatformAuthResponse.js";
import { createNativeAuthError } from "../../error/NativeAuthError.js";
import { IPlatformAuthHandler } from "./IPlatformAuthHandler.js";

export class PlatformAuthDOMHandler implements IPlatformAuthHandler {
    protected logger: Logger;
    protected performanceClient: IPerformanceClient;
    protected correlationId: string;
    platformAuthType: string;

    constructor(
        logger: Logger,
        performanceClient: IPerformanceClient,
        correlationId: string
    ) {
        this.logger = logger;
        this.performanceClient = performanceClient;
        this.correlationId = correlationId;
        this.platformAuthType = PlatformAuthConstants.PLATFORM_DOM_PROVIDER;
    }

    static async createProvider(
        logger: Logger,
        performanceClient: IPerformanceClient,
        correlationId: string
    ): Promise<PlatformAuthDOMHandler | undefined> {
        logger.trace("PlatformAuthDOMHandler: createProvider called");

        // @ts-ignore
        if (window.navigator?.platformAuthentication) {
            const supportedContracts =
                // @ts-ignore
                await window.navigator.platformAuthentication.getSupportedContracts(
                    PlatformAuthConstants.MICROSOFT_ENTRA_BROKERID
                );
            if (
                supportedContracts?.includes(
                    PlatformAuthConstants.PLATFORM_DOM_APIS
                )
            ) {
                logger.trace("Platform auth api available in DOM");
                return new PlatformAuthDOMHandler(
                    logger,
                    performanceClient,
                    correlationId
                );
            }
        }
        return undefined;
    }

    /**
     * Returns the Id for the broker extension this handler is communicating with
     * @returns
     */
    getExtensionId(): string {
        return PlatformAuthConstants.MICROSOFT_ENTRA_BROKERID;
    }

    getExtensionVersion(): string | undefined {
        return "";
    }

    getExtensionName(): string | undefined {
        return PlatformAuthConstants.DOM_API_NAME;
    }

    /**
     * Send token request to platform broker via browser DOM API
     * @param request
     * @returns
     */
    async sendMessage(
        request: PlatformAuthRequest
    ): Promise<PlatformAuthResponse> {
        this.logger.trace(
            this.platformAuthType + " - Sending request to browser DOM API"
        );

        try {
            const platformDOMRequest: PlatformDOMTokenRequest =
                this.initializePlatformDOMRequest(request);
            const response: object =
                // @ts-ignore
                await window.navigator.platformAuthentication.executeGetToken(
                    platformDOMRequest
                );
            return this.validatePlatformBrokerResponse(response);
        } catch (e) {
            this.logger.error(
                this.platformAuthType + " - executeGetToken DOM API error"
            );
            throw e;
        }
    }

    private initializePlatformDOMRequest(
        request: PlatformAuthRequest
    ): PlatformDOMTokenRequest {
        this.logger.trace(
            this.platformAuthType + " - initializeNativeDOMRequest called"
        );

        const {
            accountId,
            clientId,
            authority,
            scope,
            redirectUri,
            correlationId,
            state,
            storeInCache,
            embeddedClientId,
            extraParameters,
            ...remainingProperties
        } = request;

        const validExtraParameters: DOMExtraParameters =
            this.getDOMExtraParams(remainingProperties);

        const platformDOMRequest: PlatformDOMTokenRequest = {
            accountId: accountId,
            brokerId: this.getExtensionId(),
            authority: authority,
            clientId: clientId,
            correlationId: correlationId || this.correlationId,
            extraParameters: { ...extraParameters, ...validExtraParameters },
            isSecurityTokenService: false,
            redirectUri: redirectUri,
            scope: scope,
            state: state,
            storeInCache: storeInCache,
            embeddedClientId: embeddedClientId,
        };

        return platformDOMRequest;
    }

    private validatePlatformBrokerResponse(
        response: object
    ): PlatformAuthResponse {
        if (response.hasOwnProperty("isSuccess")) {
            if (
                response.hasOwnProperty("accessToken") &&
                response.hasOwnProperty("idToken") &&
                response.hasOwnProperty("clientInfo") &&
                response.hasOwnProperty("account") &&
                response.hasOwnProperty("scopes") &&
                response.hasOwnProperty("expiresIn")
            ) {
                this.logger.trace(
                    this.platformAuthType +
                        " - platform broker returned successful and valid response"
                );
                return this.convertToPlatformBrokerResponse(
                    response as PlatformDOMTokenResponse
                );
            } else if (response.hasOwnProperty("error")) {
                const errorResponse = response as PlatformDOMTokenResponse;
                if (
                    errorResponse.isSuccess === false &&
                    errorResponse.error &&
                    errorResponse.error.code
                ) {
                    this.logger.trace(
                        this.platformAuthType +
                            " - platform broker returned error response"
                    );
                    throw createNativeAuthError(
                        errorResponse.error.code,
                        errorResponse.error.description,
                        {
                            error: parseInt(errorResponse.error.errorCode),
                            protocol_error: errorResponse.error.protocolError,
                            status: errorResponse.error.status,
                            properties: errorResponse.error.properties,
                        }
                    );
                }
            }
        }
        throw createAuthError(
            AuthErrorCodes.unexpectedError,
            "Response missing expected properties."
        );
    }

    private convertToPlatformBrokerResponse(
        response: PlatformDOMTokenResponse
    ): PlatformAuthResponse {
        this.logger.trace(
            this.platformAuthType + " - convertToNativeResponse called"
        );
        const nativeResponse: PlatformAuthResponse = {
            access_token: response.accessToken,
            id_token: response.idToken,
            client_info: response.clientInfo,
            account: response.account,
            expires_in: response.expiresIn,
            scope: response.scopes,
            state: response.state || "",
            properties: response.properties || {},
            extendedLifetimeToken: response.extendedLifetimeToken ?? false,
            shr: response.proofOfPossessionPayload,
        };

        return nativeResponse;
    }

    private getDOMExtraParams(
        extraParameters: Record<string, unknown>
    ): DOMExtraParameters {
        const stringifiedParams = Object.entries(extraParameters).reduce(
            (record, [key, value]) => {
                record[key] = String(value);
                return record;
            },
            {} as StringDict
        );

        const validExtraParams: DOMExtraParameters = {
            ...stringifiedParams,
        };

        return validExtraParams;
    }
}
