import type { IExecuteFunctions, IHttpRequestOptions, ILoadOptionsFunctions } from 'n8n-workflow';
import type { OpenAPISchema } from './interfaces';
/**
 * Single egress point for the Databricks API, so every request carries the
 * partner User-Agent. Enforced by eslint-user-agent-restriction.mjs.
 *
 * Takes `context` explicitly rather than the house `this`-binding style because
 * some callers (e.g. `fetchResourcesInSchema` in methods/listSearch.ts) are plain
 * functions with no `this`.
 *
 * Setting a User-Agent deliberately opts these calls out of the instance-wide
 * outbound UA, including `N8N_GLOBAL_USER_AGENT_VALUE` — partner attribution
 * requires a single predictable token.
 */
export declare function databricksApiRequest(context: IExecuteFunctions | ILoadOptionsFunctions, credentialType: 'databricksApi' | 'databricksOAuth2Api', options: IHttpRequestOptions): ReturnType<IExecuteFunctions['helpers']['httpRequestWithAuthentication']>;
export declare function getActiveCredentialType(context: IExecuteFunctions | ILoadOptionsFunctions, itemIndex?: number): 'databricksApi' | 'databricksOAuth2Api';
export declare function getHost(context: IExecuteFunctions | ILoadOptionsFunctions, credentialType: 'databricksApi' | 'databricksOAuth2Api'): Promise<string>;
export declare function sanitizeApiMessage(message: string): string;
export declare function makePermissionErrorLegible(error: unknown): void;
export declare function extractResourceLocatorValue(param: unknown): string;
type DetectFormatResult = {
    format: string;
    schema: unknown;
    requiredFields: string[];
    invocationUrl: string;
};
export declare function detectInputFormat(openApiSchema: OpenAPISchema): DetectFormatResult;
export declare function generateExampleFromSchema(schema: unknown, format: string): string;
export declare function validateRequestBody(requestBody: Record<string, unknown>, detectedFormat: string): void;
export {};
//# sourceMappingURL=helpers.d.ts.map