import type { Document } from '@redocly/openapi-core';
export declare const __redoclyClient: {
    isAuthorizedWithRedocly: jest.Mock<any, any>;
    isAuthorizedWithRedoclyByRegion: jest.Mock<any, any>;
    login: jest.Mock<any, any>;
    registryApi: {
        setAccessTokens: jest.Mock<any, any>;
        authStatus: jest.Mock<any, any>;
        prepareFileUpload: jest.Mock<any, any>;
        pushApi: jest.Mock<any, any>;
    };
};
export declare const RedoclyClient: jest.Mock<{
    isAuthorizedWithRedocly: jest.Mock<any, any>;
    isAuthorizedWithRedoclyByRegion: jest.Mock<any, any>;
    login: jest.Mock<any, any>;
    registryApi: {
        setAccessTokens: jest.Mock<any, any>;
        authStatus: jest.Mock<any, any>;
        prepareFileUpload: jest.Mock<any, any>;
        pushApi: jest.Mock<any, any>;
    };
}, []>;
export declare const loadConfig: jest.Mock<{
    configFile: null;
    styleguide: {
        addIgnore: jest.Mock<any, any>;
        skipRules: jest.Mock<any, any>;
        skipPreprocessors: jest.Mock<any, any>;
        saveIgnore: jest.Mock<any, any>;
        skipDecorators: jest.Mock<any, any>;
        ignore: null;
        decorators: {
            oas2: {};
            oas3_0: {};
            oas3_1: {};
        };
        preprocessors: {
            oas2: {};
            oas3_0: {};
            oas3_1: {};
        };
    };
}, []>;
export declare const getMergedConfig: jest.Mock<any, any>;
export declare const getProxyAgent: jest.Mock<any, any>;
export declare const lint: jest.Mock<any, any>;
export declare const bundle: jest.Mock<{
    bundle: {
        parsed: null;
    };
    problems: null;
}, []>;
export declare const getTotals: jest.Mock<{
    errors: number;
}, []>;
export declare const formatProblems: jest.Mock<any, any>;
export declare const slash: jest.Mock<any, any>;
export declare const findConfig: jest.Mock<any, any>;
export declare const doesYamlFileExist: jest.Mock<any, any>;
export declare const bundleDocument: jest.Mock<Promise<{
    problems: {};
}>, []>;
export declare const detectSpec: jest.Mock<any, any>;
export declare const isAbsoluteUrl: jest.Mock<any, any>;
export declare const stringifyYaml: jest.Mock<any, [data: any]>;
export declare class BaseResolver {
    cache: Map<string, Promise<Document | ResolveError>>;
    getFiles: jest.Mock<any, any>;
    resolveExternalRef: jest.Mock<any, any>;
    loadExternalRef: typeof jest.fn;
    parseDocument: jest.Mock<any, any>;
    resolveDocument: jest.Mock<any, any>;
}
export declare class ResolveError extends Error {
    originalError: Error;
    constructor(originalError: Error);
}
export declare class YamlParseError extends Error {
    originalError: Error;
    constructor(originalError: Error);
}
export declare enum SpecVersion {
    OAS2 = "oas2",
    OAS3_0 = "oas3_0",
    OAS3_1 = "oas3_1",
    Async2 = "async2",
    Async3 = "async3"
}
export declare enum Oas3Operations {
    get = "get",
    put = "put",
    post = "post",
    delete = "delete",
    options = "options",
    head = "head",
    patch = "patch",
    trace = "trace"
}
