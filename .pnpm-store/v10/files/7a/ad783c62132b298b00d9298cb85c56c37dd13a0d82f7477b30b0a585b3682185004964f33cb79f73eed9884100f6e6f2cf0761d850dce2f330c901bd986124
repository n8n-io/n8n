export interface APIErrorObject {
    message: string;
    type: 'api_error';
}
export interface AuthenticationError {
    message: string;
    type: 'authentication_error';
}
export interface BillingError {
    message: string;
    type: 'billing_error';
}
export type ErrorObject = InvalidRequestError | AuthenticationError | BillingError | PermissionError | NotFoundError | RateLimitError | GatewayTimeoutError | APIErrorObject | OverloadedError;
export interface ErrorResponse {
    error: ErrorObject;
    request_id: string | null;
    type: 'error';
}
export interface GatewayTimeoutError {
    message: string;
    type: 'timeout_error';
}
export interface InvalidRequestError {
    message: string;
    type: 'invalid_request_error';
}
export interface NotFoundError {
    message: string;
    type: 'not_found_error';
}
export interface OverloadedError {
    message: string;
    type: 'overloaded_error';
}
export interface PermissionError {
    message: string;
    type: 'permission_error';
}
export interface RateLimitError {
    message: string;
    type: 'rate_limit_error';
}
//# sourceMappingURL=shared.d.mts.map