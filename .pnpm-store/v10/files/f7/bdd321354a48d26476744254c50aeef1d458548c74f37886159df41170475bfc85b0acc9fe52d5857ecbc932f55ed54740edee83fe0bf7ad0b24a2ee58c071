import { defaultJsonSerializer } from './defaultJsonSerializer.js';
import { HeadersInstanceToPlainObject, uppercase } from './helpers.js';
import { parseBatchRequestArgs, parseRawRequestArgs, parseRawRequestExtendedArgs, parseRequestArgs, parseRequestExtendedArgs, } from './parseArgs.js';
import { resolveRequestDocument } from './resolveRequestDocument.js';
import { ClientError, } from './types.js';
import crossFetch, * as CrossFetch from 'cross-fetch';
/**
 * Convert the given headers configuration into a plain object.
 */
const resolveHeaders = (headers) => {
    let oHeaders = {};
    if (headers) {
        if ((typeof Headers !== `undefined` && headers instanceof Headers) ||
            (CrossFetch && CrossFetch.Headers && headers instanceof CrossFetch.Headers)) {
            oHeaders = HeadersInstanceToPlainObject(headers);
        }
        else if (Array.isArray(headers)) {
            headers.forEach(([name, value]) => {
                if (name && value !== undefined) {
                    oHeaders[name] = value;
                }
            });
        }
        else {
            oHeaders = headers;
        }
    }
    return oHeaders;
};
/**
 * Clean a GraphQL document to send it via a GET query
 */
const cleanQuery = (str) => str.replace(/([\s,]|#[^\n\r]+)+/g, ` `).trim();
/**
 * Create query string for GraphQL request
 */
const buildRequestConfig = (params) => {
    if (!Array.isArray(params.query)) {
        const params_ = params;
        const search = [`query=${encodeURIComponent(cleanQuery(params_.query))}`];
        if (params.variables) {
            search.push(`variables=${encodeURIComponent(params_.jsonSerializer.stringify(params_.variables))}`);
        }
        if (params_.operationName) {
            search.push(`operationName=${encodeURIComponent(params_.operationName)}`);
        }
        return search.join(`&`);
    }
    if (typeof params.variables !== `undefined` && !Array.isArray(params.variables)) {
        throw new Error(`Cannot create query with given variable type, array expected`);
    }
    // Batch support
    const params_ = params;
    const payload = params.query.reduce((acc, currentQuery, index) => {
        acc.push({
            query: cleanQuery(currentQuery),
            variables: params_.variables ? params_.jsonSerializer.stringify(params_.variables[index]) : undefined,
        });
        return acc;
    }, []);
    return `query=${encodeURIComponent(params_.jsonSerializer.stringify(payload))}`;
};
const createHttpMethodFetcher = (method) => async (params) => {
    const { url, query, variables, operationName, fetch, fetchOptions, middleware } = params;
    const headers = { ...params.headers };
    let queryParams = ``;
    let body = undefined;
    if (method === `POST`) {
        body = createRequestBody(query, variables, operationName, fetchOptions.jsonSerializer);
        if (typeof body === `string`) {
            // @ts-expect-error todo
            headers[`Content-Type`] = `application/json`;
        }
    }
    else {
        // @ts-expect-error todo needs ADT for TS to understand the different states
        queryParams = buildRequestConfig({
            query,
            variables,
            operationName,
            jsonSerializer: fetchOptions.jsonSerializer ?? defaultJsonSerializer,
        });
    }
    const init = {
        method,
        headers,
        body,
        ...fetchOptions,
    };
    let urlResolved = url;
    let initResolved = init;
    if (middleware) {
        const result = await Promise.resolve(middleware({ ...init, url, operationName, variables }));
        const { url: urlNew, ...initNew } = result;
        urlResolved = urlNew;
        initResolved = initNew;
    }
    if (queryParams) {
        urlResolved = `${urlResolved}?${queryParams}`;
    }
    return await fetch(urlResolved, initResolved);
};
/**
 * GraphQL Client.
 */
class GraphQLClient {
    constructor(url, requestConfig = {}) {
        this.url = url;
        this.requestConfig = requestConfig;
        /**
         * Send a GraphQL query to the server.
         */
        this.rawRequest = async (...args) => {
            const [queryOrOptions, variables, requestHeaders] = args;
            const rawRequestOptions = parseRawRequestArgs(queryOrOptions, variables, requestHeaders);
            const { headers, fetch = crossFetch, method = `POST`, requestMiddleware, responseMiddleware, ...fetchOptions } = this.requestConfig;
            const { url } = this;
            if (rawRequestOptions.signal !== undefined) {
                fetchOptions.signal = rawRequestOptions.signal;
            }
            const { operationName } = resolveRequestDocument(rawRequestOptions.query);
            return makeRequest({
                url,
                query: rawRequestOptions.query,
                variables: rawRequestOptions.variables,
                headers: {
                    ...resolveHeaders(callOrIdentity(headers)),
                    ...resolveHeaders(rawRequestOptions.requestHeaders),
                },
                operationName,
                fetch,
                method,
                fetchOptions,
                middleware: requestMiddleware,
            })
                .then((response) => {
                if (responseMiddleware) {
                    responseMiddleware(response);
                }
                return response;
            })
                .catch((error) => {
                if (responseMiddleware) {
                    responseMiddleware(error);
                }
                throw error;
            });
        };
    }
    async request(documentOrOptions, ...variablesAndRequestHeaders) {
        const [variables, requestHeaders] = variablesAndRequestHeaders;
        const requestOptions = parseRequestArgs(documentOrOptions, variables, requestHeaders);
        const { headers, fetch = crossFetch, method = `POST`, requestMiddleware, responseMiddleware, ...fetchOptions } = this.requestConfig;
        const { url } = this;
        if (requestOptions.signal !== undefined) {
            fetchOptions.signal = requestOptions.signal;
        }
        const { query, operationName } = resolveRequestDocument(requestOptions.document);
        return makeRequest({
            url,
            query,
            variables: requestOptions.variables,
            headers: {
                ...resolveHeaders(callOrIdentity(headers)),
                ...resolveHeaders(requestOptions.requestHeaders),
            },
            operationName,
            fetch,
            method,
            fetchOptions,
            middleware: requestMiddleware,
        })
            .then((response) => {
            if (responseMiddleware) {
                responseMiddleware(response);
            }
            return response.data;
        })
            .catch((error) => {
            if (responseMiddleware) {
                responseMiddleware(error);
            }
            throw error;
        });
    }
    // prettier-ignore
    batchRequests(documentsOrOptions, requestHeaders) {
        const batchRequestOptions = parseBatchRequestArgs(documentsOrOptions, requestHeaders);
        const { headers, ...fetchOptions } = this.requestConfig;
        if (batchRequestOptions.signal !== undefined) {
            fetchOptions.signal = batchRequestOptions.signal;
        }
        const queries = batchRequestOptions.documents.map(({ document }) => resolveRequestDocument(document).query);
        const variables = batchRequestOptions.documents.map(({ variables }) => variables);
        return makeRequest({
            url: this.url,
            query: queries,
            // @ts-expect-error TODO reconcile batch variables into system.
            variables,
            headers: {
                ...resolveHeaders(callOrIdentity(headers)),
                ...resolveHeaders(batchRequestOptions.requestHeaders),
            },
            operationName: undefined,
            fetch: this.requestConfig.fetch ?? crossFetch,
            method: this.requestConfig.method || `POST`,
            fetchOptions,
            middleware: this.requestConfig.requestMiddleware,
        })
            .then((response) => {
            if (this.requestConfig.responseMiddleware) {
                this.requestConfig.responseMiddleware(response);
            }
            return response.data;
        })
            .catch((error) => {
            if (this.requestConfig.responseMiddleware) {
                this.requestConfig.responseMiddleware(error);
            }
            throw error;
        });
    }
    setHeaders(headers) {
        this.requestConfig.headers = headers;
        return this;
    }
    /**
     * Attach a header to the client. All subsequent requests will have this header.
     */
    setHeader(key, value) {
        const { headers } = this.requestConfig;
        if (headers) {
            // todo what if headers is in nested array form... ?
            //@ts-expect-error todo
            headers[key] = value;
        }
        else {
            this.requestConfig.headers = { [key]: value };
        }
        return this;
    }
    /**
     * Change the client endpoint. All subsequent requests will send to this endpoint.
     */
    setEndpoint(value) {
        this.url = value;
        return this;
    }
}
const makeRequest = async (params) => {
    const { query, variables, fetchOptions } = params;
    const fetcher = createHttpMethodFetcher(uppercase(params.method ?? `post`));
    const isBatchingQuery = Array.isArray(params.query);
    const response = await fetcher(params);
    const result = await getResult(response, fetchOptions.jsonSerializer ?? defaultJsonSerializer);
    const successfullyReceivedData = Array.isArray(result)
        ? !result.some(({ data }) => !data)
        : Boolean(result.data);
    const successfullyPassedErrorPolicy = Array.isArray(result) ||
        !result.errors ||
        (Array.isArray(result.errors) && !result.errors.length) ||
        fetchOptions.errorPolicy === `all` ||
        fetchOptions.errorPolicy === `ignore`;
    if (response.ok && successfullyPassedErrorPolicy && successfullyReceivedData) {
        // @ts-expect-error TODO fixme
        const { errors: _, ...rest } = Array.isArray(result) ? result : result;
        const data = fetchOptions.errorPolicy === `ignore` ? rest : result;
        const dataEnvelope = isBatchingQuery ? { data } : data;
        // @ts-expect-error TODO
        return {
            ...dataEnvelope,
            headers: response.headers,
            status: response.status,
        };
    }
    else {
        const errorResult = typeof result === `string`
            ? {
                error: result,
            }
            : result;
        throw new ClientError(
        // @ts-expect-error TODO
        { ...errorResult, status: response.status, headers: response.headers }, { query, variables });
    }
};
/**
 * Send a GraphQL Query to the GraphQL server for execution.
 */
const rawRequest = async (...args) => {
    const [urlOrOptions, query, ...variablesAndRequestHeaders] = args;
    const requestOptions = parseRawRequestExtendedArgs(urlOrOptions, query, ...variablesAndRequestHeaders);
    const client = new GraphQLClient(requestOptions.url);
    return client.rawRequest({
        ...requestOptions,
    });
};
// prettier-ignore
// eslint-disable-next-line
async function request(urlOrOptions, document, ...variablesAndRequestHeaders) {
    const requestOptions = parseRequestExtendedArgs(urlOrOptions, document, ...variablesAndRequestHeaders);
    const client = new GraphQLClient(requestOptions.url);
    return client.request({
        ...requestOptions,
    });
}
/**
 * Send a batch of GraphQL Document to the GraphQL server for execution.
 *
 * @example
 *
 * ```ts
 * // You can pass a raw string
 *
 * await batchRequests('https://foo.bar/graphql', [
 * {
 *  query: `
 *   {
 *     query {
 *       users
 *     }
 *   }`
 * },
 * {
 *   query: `
 *   {
 *     query {
 *       users
 *     }
 *   }`
 * }])
 *
 * // You can also pass a GraphQL DocumentNode as query. Convenient if you
 * // are using graphql-tag package.
 *
 * import gql from 'graphql-tag'
 *
 * await batchRequests('https://foo.bar/graphql', [{ query: gql`...` }])
 * ```
 */
const batchRequests = async (...args) => {
    const params = parseBatchRequestsArgsExtended(args);
    const client = new GraphQLClient(params.url);
    return client.batchRequests(params);
};
const parseBatchRequestsArgsExtended = (args) => {
    if (args.length === 1) {
        return args[0];
    }
    else {
        return {
            url: args[0],
            documents: args[1],
            requestHeaders: args[2],
            signal: undefined,
        };
    }
};
const createRequestBody = (query, variables, operationName, jsonSerializer) => {
    const jsonSerializer_ = jsonSerializer ?? defaultJsonSerializer;
    if (!Array.isArray(query)) {
        return jsonSerializer_.stringify({ query, variables, operationName });
    }
    if (typeof variables !== `undefined` && !Array.isArray(variables)) {
        throw new Error(`Cannot create request body with given variable type, array expected`);
    }
    // Batch support
    const payload = query.reduce((acc, currentQuery, index) => {
        acc.push({ query: currentQuery, variables: variables ? variables[index] : undefined });
        return acc;
    }, []);
    return jsonSerializer_.stringify(payload);
};
const getResult = async (response, jsonSerializer) => {
    let contentType;
    response.headers.forEach((value, key) => {
        if (key.toLowerCase() === `content-type`) {
            contentType = value;
        }
    });
    if (contentType &&
        (contentType.toLowerCase().startsWith(`application/json`) ||
            contentType.toLowerCase().startsWith(`application/graphql+json`) ||
            contentType.toLowerCase().startsWith(`application/graphql-response+json`))) {
        return jsonSerializer.parse(await response.text());
    }
    else {
        return response.text();
    }
};
const callOrIdentity = (value) => {
    return typeof value === `function` ? value() : value;
};
/**
 * Convenience passthrough template tag to get the benefits of tooling for the gql template tag. This does not actually parse the input into a GraphQL DocumentNode like graphql-tag package does. It just returns the string with any variables given interpolated. Can save you a bit of performance and having to install another package.
 *
 * @example
 * ```
 * import { gql } from 'graphql-request'
 *
 * await request('https://foo.bar/graphql', gql`...`)
 * ```
 *
 * @remarks
 *
 * Several tools in the Node GraphQL ecosystem are hardcoded to specially treat any template tag named "gql". For example see this prettier issue: https://github.com/prettier/prettier/issues/4360. Using this template tag has no runtime effect beyond variable interpolation.
 */
export const gql = (chunks, ...variables) => {
    return chunks.reduce((acc, chunk, index) => `${acc}${chunk}${index in variables ? String(variables[index]) : ``}`, ``);
};
export { GraphQLWebSocketClient } from './graphql-ws.js';
export { resolveRequestDocument } from './resolveRequestDocument.js';
export { batchRequests, ClientError, GraphQLClient, rawRequest, request, };
export default request;
//# sourceMappingURL=index.js.map