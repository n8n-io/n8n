import { Fetcher } from '@qdrant/openapi-typescript-fetch';
import { paths } from './openapi/generated_schema.js';
import { RestArgs } from './types.js';
import { ClientApi } from './openapi/generated_client_type.js';
export type Client = ReturnType<typeof Fetcher.for<paths>>;
export declare function createApis(baseUrl: string, args: RestArgs): ClientApi;
export type OpenApiClient = ReturnType<typeof createApis>;
export declare function createClient(baseUrl: string, { headers, timeout, connections }: RestArgs): Client;
