import { Variables } from 'graphql-request';
import ConnectionREST, { InternalConnectionParams } from './http.js';
export default class ConnectionGQL extends ConnectionREST {
    private gql;
    constructor(params: InternalConnectionParams);
    query: <V extends Variables, T = any>(query: any, variables?: V | undefined) => Promise<{
        data: T;
    }>;
    close: () => void;
}
export * from './auth.js';
export type TQuery = any;
export interface GraphQLClient {
    query: <V extends Variables, T>(query: TQuery, variables?: V, headers?: HeadersInit) => Promise<{
        data: T;
    }>;
}
export declare const gqlClient: (config: InternalConnectionParams) => GraphQLClient;
