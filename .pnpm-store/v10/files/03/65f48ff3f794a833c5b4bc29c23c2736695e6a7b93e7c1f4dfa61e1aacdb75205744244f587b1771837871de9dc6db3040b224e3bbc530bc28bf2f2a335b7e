import { Metadata } from 'nice-grpc';
import { RetryOptions } from 'nice-grpc-client-middleware-retry';
import { TenantsGetReply } from '../proto/v1/tenants.js';
import { WeaviateClient } from '../proto/v1/weaviate.js';
import Base from './base.js';
export type TenantsGetArgs = {
    names?: string[];
};
export interface Tenants {
    withGet: (args: TenantsGetArgs) => Promise<TenantsGetReply>;
}
export default class TenantsManager extends Base implements Tenants {
    static use(connection: WeaviateClient<RetryOptions>, collection: string, metadata: Metadata, timeout: number): Tenants;
    withGet: (args: TenantsGetArgs) => Promise<TenantsGetReply>;
    private call;
}
