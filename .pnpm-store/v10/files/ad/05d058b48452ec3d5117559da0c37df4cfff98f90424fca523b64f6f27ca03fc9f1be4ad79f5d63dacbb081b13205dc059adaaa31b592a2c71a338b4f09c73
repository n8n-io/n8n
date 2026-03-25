import { UserAttribute } from "../network_client/custom_auth_api/types/ApiErrorResponseTypes.js";
import { CustomAuthError } from "./CustomAuthError.js";
/**
 * Error when no required authentication method by Microsoft Entra is supported
 */
export declare class RedirectError extends CustomAuthError {
    redirectReason?: string | undefined;
    constructor(correlationId?: string, redirectReason?: string | undefined);
}
/**
 * Custom Auth API error.
 */
export declare class CustomAuthApiError extends CustomAuthError {
    attributes?: UserAttribute[] | undefined;
    continuationToken?: string | undefined;
    traceId?: string | undefined;
    timestamp?: string | undefined;
    constructor(error: string, errorDescription: string, correlationId?: string, errorCodes?: Array<number>, subError?: string, attributes?: UserAttribute[] | undefined, continuationToken?: string | undefined, traceId?: string | undefined, timestamp?: string | undefined);
}
//# sourceMappingURL=CustomAuthApiError.d.ts.map