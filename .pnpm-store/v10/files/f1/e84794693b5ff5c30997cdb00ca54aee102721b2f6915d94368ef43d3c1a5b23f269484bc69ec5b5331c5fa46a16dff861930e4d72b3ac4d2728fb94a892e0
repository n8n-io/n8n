import { GraphQLClient as Client } from 'graphql-request';
import ConnectionREST from './http.js';
export default class ConnectionGQL extends ConnectionREST {
    constructor(params) {
        super(params);
        this.query = (query, variables) => {
            if (this.authEnabled) {
                return this.login().then((token) => {
                    const headers = { Authorization: `Bearer ${token}` };
                    return this.gql.query(query, variables, headers);
                });
            }
            return this.gql.query(query, variables);
        };
        this.close = () => this.http.close();
        this.gql = gqlClient(params);
    }
}
export * from './auth.js';
export const gqlClient = (config) => {
    const version = '/v1/graphql';
    const baseUri = `${config.host}${version}`;
    const defaultHeaders = config.headers;
    return {
        // for backward compatibility with replaced graphql-client lib,
        // results are wrapped into { data: data }
        query: (query, variables, headers) => {
            return new Client(baseUri, {
                headers: Object.assign(Object.assign({}, defaultHeaders), headers),
            })
                .request(query, variables, headers)
                .then((data) => ({ data }));
        },
    };
};
