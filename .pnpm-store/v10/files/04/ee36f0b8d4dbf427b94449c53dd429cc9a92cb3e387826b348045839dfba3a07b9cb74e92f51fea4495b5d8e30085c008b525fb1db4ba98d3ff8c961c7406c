"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gqlClient = void 0;
const graphql_request_1 = require("graphql-request");
const http_js_1 = __importDefault(require("./http.js"));
class ConnectionGQL extends http_js_1.default {
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
        this.gql = (0, exports.gqlClient)(params);
    }
}
exports.default = ConnectionGQL;
__exportStar(require("./auth.js"), exports);
const gqlClient = (config) => {
    const version = '/v1/graphql';
    const baseUri = `${config.host}${version}`;
    const defaultHeaders = config.headers;
    return {
        // for backward compatibility with replaced graphql-client lib,
        // results are wrapped into { data: data }
        query: (query, variables, headers) => {
            return new graphql_request_1.GraphQLClient(baseUri, {
                headers: Object.assign(Object.assign({}, defaultHeaders), headers),
            })
                .request(query, variables, headers)
                .then((data) => ({ data }));
        },
    };
};
exports.gqlClient = gqlClient;
