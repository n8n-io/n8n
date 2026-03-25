import type { Hono } from '../../hono';
interface CloudFrontHeader {
    key: string;
    value: string;
}
interface CloudFrontHeaders {
    [name: string]: CloudFrontHeader[];
}
interface CloudFrontCustomOrigin {
    customHeaders: CloudFrontHeaders;
    domainName: string;
    keepaliveTimeout: number;
    path: string;
    port: number;
    protocol: string;
    readTimeout: number;
    sslProtocols: string[];
}
interface CloudFrontS3Origin {
    authMethod: 'origin-access-identity' | 'none';
    customHeaders: CloudFrontHeaders;
    domainName: string;
    path: string;
    region: string;
}
type CloudFrontOrigin = {
    s3: CloudFrontS3Origin;
    custom?: never;
} | {
    custom: CloudFrontCustomOrigin;
    s3?: never;
};
export interface CloudFrontRequest {
    clientIp: string;
    headers: CloudFrontHeaders;
    method: string;
    querystring: string;
    uri: string;
    body?: {
        inputTruncated: boolean;
        action: string;
        encoding: string;
        data: string;
    };
    origin?: CloudFrontOrigin;
}
export interface CloudFrontResponse {
    headers: CloudFrontHeaders;
    status: string;
    statusDescription?: string;
}
export interface CloudFrontConfig {
    distributionDomainName: string;
    distributionId: string;
    eventType: string;
    requestId: string;
}
interface CloudFrontEvent {
    cf: {
        config: CloudFrontConfig;
        request: CloudFrontRequest;
        response?: CloudFrontResponse;
    };
}
export interface CloudFrontEdgeEvent {
    Records: CloudFrontEvent[];
}
type CloudFrontContext = {};
export interface Callback {
    (err: Error | null, result?: CloudFrontRequest | CloudFrontResult): void;
}
interface CloudFrontResult {
    status: string;
    statusDescription?: string;
    headers?: {
        [header: string]: {
            key: string;
            value: string;
        }[];
    };
    body?: string;
    bodyEncoding?: 'text' | 'base64';
}
export declare const handle: (app: Hono<any>) => ((event: CloudFrontEdgeEvent, context?: CloudFrontContext, callback?: Callback) => Promise<CloudFrontResult>);
export declare const createBody: (method: string, requestBody: CloudFrontRequest["body"]) => string | Uint8Array<ArrayBuffer> | undefined;
export declare const isContentTypeBinary: (contentType: string) => boolean;
export {};
