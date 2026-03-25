import { Agent } from 'http';
import { Authorization, Client, Middleware } from 'mappersmith';
import { RetryMiddlewareOptions } from 'mappersmith/middleware/retry/v2';
export interface SchemaRegistryAPIClientArgs {
    host: string;
    auth?: Authorization;
    clientId?: string;
    retry?: Partial<RetryMiddlewareOptions>;
    /** HTTP Agent that will be passed to underlying API calls */
    agent?: Agent;
    middlewares?: Middleware[];
}
export type SchemaRegistryAPIClient = Client<{
    Schema: {
        find: (_: any) => any;
    };
    Subject: {
        all: (_: any) => any;
        latestVersion: (_: any) => any;
        version: (_: any) => any;
        config: (_: any) => any;
        updateConfig: (_: any) => any;
        register: (_: any) => any;
        registered: (_: any) => any;
        compatible: (_: any) => any;
    };
}>;
declare const _default: ({ auth, clientId: userClientId, host, retry, agent, middlewares, }: SchemaRegistryAPIClientArgs) => SchemaRegistryAPIClient;
export default _default;
