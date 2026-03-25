"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRawRequestExtendedArgs = exports.parseRequestExtendedArgs = exports.parseBatchRequestArgs = exports.parseRawRequestArgs = exports.parseRequestArgs = void 0;
const parseRequestArgs = (documentOrOptions, variables, requestHeaders) => {
    return documentOrOptions.document
        ? documentOrOptions
        : {
            document: documentOrOptions,
            variables: variables,
            requestHeaders: requestHeaders,
            signal: undefined,
        };
};
exports.parseRequestArgs = parseRequestArgs;
const parseRawRequestArgs = (queryOrOptions, variables, requestHeaders) => {
    return queryOrOptions.query
        ? queryOrOptions
        : {
            query: queryOrOptions,
            variables: variables,
            requestHeaders: requestHeaders,
            signal: undefined,
        };
};
exports.parseRawRequestArgs = parseRawRequestArgs;
const parseBatchRequestArgs = (documentsOrOptions, requestHeaders) => {
    return documentsOrOptions.documents
        ? documentsOrOptions
        : {
            documents: documentsOrOptions,
            requestHeaders: requestHeaders,
            signal: undefined,
        };
};
exports.parseBatchRequestArgs = parseBatchRequestArgs;
const parseRequestExtendedArgs = (urlOrOptions, document, ...variablesAndRequestHeaders) => {
    const [variables, requestHeaders] = variablesAndRequestHeaders;
    return urlOrOptions.document
        ? urlOrOptions
        : {
            url: urlOrOptions,
            document: document,
            variables,
            requestHeaders,
            signal: undefined,
        };
};
exports.parseRequestExtendedArgs = parseRequestExtendedArgs;
const parseRawRequestExtendedArgs = (urlOrOptions, query, ...variablesAndRequestHeaders) => {
    const [variables, requestHeaders] = variablesAndRequestHeaders;
    return urlOrOptions.query
        ? urlOrOptions
        : {
            url: urlOrOptions,
            query: query,
            variables,
            requestHeaders,
            signal: undefined,
        };
};
exports.parseRawRequestExtendedArgs = parseRawRequestExtendedArgs;
//# sourceMappingURL=parseArgs.js.map