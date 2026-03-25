import { FetchFunction } from './core';
export declare const mapResponseFromBedrock: (streaming: boolean, endpoint: string, obj: {}) => Promise<any>;
export declare type AwsProps = {
    awsRegion: string;
    awsAccessKey?: string;
    awsSecretKey?: string;
    awsSessionToken?: string;
};
export declare type AwsPlatform = "sagemaker" | "bedrock";
export declare type AwsEndpoint = "chat" | "generate" | "embed";
export declare const getUrl: (platform: "bedrock" | "sagemaker", awsRegion: string, model: string, stream: boolean) => string;
export declare const getAuthHeaders: (url: URL, method: string, headers: Record<string, string>, body: unknown, service: AwsPlatform, props: AwsProps) => Promise<Record<string, string>>;
export declare const getEndpointFromUrl: (url: string, chatModel?: string | undefined, embedModel?: string | undefined, generateModel?: string | undefined) => string;
export declare const parseAWSEvent: (line: string) => any;
export declare const fetchOverride: (platform: AwsPlatform, { awsRegion, awsAccessKey, awsSecretKey, awsSessionToken, }: AwsProps) => FetchFunction;
