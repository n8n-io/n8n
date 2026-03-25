import type { Hono } from '../../hono';
import type { Env, Schema } from '../../types';
import type { ALBRequestContext, ApiGatewayRequestContext, ApiGatewayRequestContextV2, Handler, LambdaContext, LatticeRequestContextV2 } from './types';
export type LambdaEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2 | ALBProxyEvent | LatticeProxyEventV2;
export interface LatticeProxyEventV2 {
    version: string;
    path: string;
    method: string;
    headers: Record<string, string[] | undefined>;
    queryStringParameters: Record<string, string[] | undefined>;
    body: string | null;
    isBase64Encoded: boolean;
    requestContext: LatticeRequestContextV2;
}
export interface APIGatewayProxyEventV2 {
    version: string;
    routeKey: string;
    headers: Record<string, string | undefined>;
    multiValueHeaders?: undefined;
    cookies?: string[];
    rawPath: string;
    rawQueryString: string;
    body: string | null;
    isBase64Encoded: boolean;
    requestContext: ApiGatewayRequestContextV2;
    queryStringParameters?: {
        [name: string]: string | undefined;
    };
    pathParameters?: {
        [name: string]: string | undefined;
    };
    stageVariables?: {
        [name: string]: string | undefined;
    };
}
export interface APIGatewayProxyEvent {
    version: string;
    httpMethod: string;
    headers: Record<string, string | undefined>;
    multiValueHeaders?: {
        [headerKey: string]: string[];
    };
    path: string;
    body: string | null;
    isBase64Encoded: boolean;
    queryStringParameters?: Record<string, string | undefined>;
    requestContext: ApiGatewayRequestContext;
    resource: string;
    multiValueQueryStringParameters?: {
        [parameterKey: string]: string[];
    };
    pathParameters?: Record<string, string>;
    stageVariables?: Record<string, string>;
}
export interface ALBProxyEvent {
    httpMethod: string;
    headers?: Record<string, string | undefined>;
    multiValueHeaders?: Record<string, string[] | undefined>;
    path: string;
    body: string | null;
    isBase64Encoded: boolean;
    queryStringParameters?: Record<string, string | undefined>;
    multiValueQueryStringParameters?: {
        [parameterKey: string]: string[];
    };
    requestContext: ALBRequestContext;
}
type WithHeaders = {
    headers: Record<string, string>;
    multiValueHeaders?: undefined;
};
type WithMultiValueHeaders = {
    headers?: undefined;
    multiValueHeaders: Record<string, string[]>;
};
export type APIGatewayProxyResult = {
    statusCode: number;
    statusDescription?: string;
    body: string;
    cookies?: string[];
    isBase64Encoded: boolean;
} & (WithHeaders | WithMultiValueHeaders);
export declare const streamHandle: <E extends Env = Env, S extends Schema = {}, BasePath extends string = "/">(app: Hono<E, S, BasePath>) => Handler;
type HandleOptions = {
    isContentTypeBinary: ((contentType: string) => boolean) | undefined;
};
/**
 * Converts a Hono application to an AWS Lambda handler.
 *
 * Accepts events from API Gateway (v1 and v2), Application Load Balancer (ALB),
 * and Lambda Function URLs.
 *
 * @param app - The Hono application instance
 * @param options - Optional configuration
 * @param options.isContentTypeBinary - A function to determine if the content type is binary.
 *                                      If not provided, the default function will be used.
 * @returns Lambda handler function
 *
 * @example
 * ```js
 * import { Hono } from 'hono'
 * import { handle } from 'hono/aws-lambda'
 *
 * const app = new Hono()
 *
 * app.get('/', (c) => c.text('Hello from Lambda'))
 * app.get('/json', (c) => c.json({ message: 'Hello JSON' }))
 *
 * export const handler = handle(app)
 * ```
 *
 * @example
 * ```js
 * // With custom binary content type detection
 * import { handle, defaultIsContentTypeBinary } from 'hono/aws-lambda'
 * export const handler = handle(app, {
 *   isContentTypeBinary: (contentType) => {
 *     if (defaultIsContentTypeBinary(contentType)) {
 *       // default logic same as prior to v4.8.4
 *       return true
 *     }
 *     return contentType.startsWith('image/') || contentType === 'application/pdf'
 *   }
 * })
 * ```
 */
export declare const handle: <E extends Env = Env, S extends Schema = {}, BasePath extends string = "/">(app: Hono<E, S, BasePath>, { isContentTypeBinary }?: HandleOptions) => (<L extends LambdaEvent>(event: L, lambdaContext?: LambdaContext) => Promise<APIGatewayProxyResult & (L extends {
    multiValueHeaders: Record<string, string[]>;
} ? WithMultiValueHeaders : WithHeaders)>);
export declare abstract class EventProcessor<E extends LambdaEvent> {
    protected abstract getPath(event: E): string;
    protected abstract getMethod(event: E): string;
    protected abstract getQueryString(event: E): string;
    protected abstract getHeaders(event: E): Headers;
    protected abstract getCookies(event: E, headers: Headers): void;
    protected abstract setCookiesToResult(result: APIGatewayProxyResult, cookies: string[]): void;
    protected getHeaderValue(headers: E['headers'], key: string): string | undefined;
    protected getDomainName(event: E): string | undefined;
    createRequest(event: E): Request;
    createResult(event: E, res: Response, options: Pick<HandleOptions, 'isContentTypeBinary'>): Promise<APIGatewayProxyResult>;
    setCookies(_event: E, res: Response, result: APIGatewayProxyResult): void;
}
export declare class EventV2Processor extends EventProcessor<APIGatewayProxyEventV2> {
    protected getPath(event: APIGatewayProxyEventV2): string;
    protected getMethod(event: APIGatewayProxyEventV2): string;
    protected getQueryString(event: APIGatewayProxyEventV2): string;
    protected getCookies(event: APIGatewayProxyEventV2, headers: Headers): void;
    protected setCookiesToResult(result: APIGatewayProxyResult, cookies: string[]): void;
    protected getHeaders(event: APIGatewayProxyEventV2): Headers;
}
export declare class EventV1Processor extends EventProcessor<APIGatewayProxyEvent> {
    protected getPath(event: APIGatewayProxyEvent): string;
    protected getMethod(event: APIGatewayProxyEvent): string;
    protected getQueryString(event: APIGatewayProxyEvent): string;
    protected getCookies(_event: APIGatewayProxyEvent, _headers: Headers): void;
    protected getHeaders(event: APIGatewayProxyEvent): Headers;
    protected setCookiesToResult(result: APIGatewayProxyResult, cookies: string[]): void;
}
export declare class ALBProcessor extends EventProcessor<ALBProxyEvent> {
    protected getHeaders(event: ALBProxyEvent): Headers;
    protected getPath(event: ALBProxyEvent): string;
    protected getMethod(event: ALBProxyEvent): string;
    protected getQueryString(event: ALBProxyEvent): string;
    protected getCookies(event: ALBProxyEvent, headers: Headers): void;
    protected setCookiesToResult(result: APIGatewayProxyResult, cookies: string[]): void;
}
export declare class LatticeV2Processor extends EventProcessor<LatticeProxyEventV2> {
    protected getPath(event: LatticeProxyEventV2): string;
    protected getMethod(event: LatticeProxyEventV2): string;
    protected getQueryString(): string;
    protected getHeaders(event: LatticeProxyEventV2): Headers;
    protected getCookies(): void;
    protected setCookiesToResult(result: APIGatewayProxyResult, cookies: string[]): void;
}
export declare const getProcessor: (event: LambdaEvent) => EventProcessor<LambdaEvent>;
/**
 * Check if the given content type is binary.
 * This is a default function and may be overwritten by the user via `isContentTypeBinary` option in handler().
 * @param contentType The content type to check.
 * @returns True if the content type is binary, false otherwise.
 */
export declare const defaultIsContentTypeBinary: (contentType: string) => boolean;
export declare const isContentEncodingBinary: (contentEncoding: string | null) => boolean;
export {};
