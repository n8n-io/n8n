"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Oas3Operations = exports.SpecVersion = exports.YamlParseError = exports.ResolveError = exports.BaseResolver = exports.stringifyYaml = exports.isAbsoluteUrl = exports.detectSpec = exports.bundleDocument = exports.doesYamlFileExist = exports.findConfig = exports.slash = exports.formatProblems = exports.getTotals = exports.bundle = exports.lint = exports.getProxyAgent = exports.getMergedConfig = exports.loadConfig = exports.RedoclyClient = exports.__redoclyClient = void 0;
const config_1 = require("./../../__tests__/fixtures/config");
const documents_1 = require("../documents");
exports.__redoclyClient = {
    isAuthorizedWithRedocly: jest.fn().mockResolvedValue(true),
    isAuthorizedWithRedoclyByRegion: jest.fn().mockResolvedValue(true),
    login: jest.fn(),
    registryApi: {
        setAccessTokens: jest.fn(),
        authStatus: jest.fn(),
        prepareFileUpload: jest.fn().mockResolvedValue({
            signedUploadUrl: 'signedUploadUrl',
            filePath: 'filePath',
        }),
        pushApi: jest.fn(),
    },
};
exports.RedoclyClient = jest.fn(() => exports.__redoclyClient);
exports.loadConfig = jest.fn(() => config_1.ConfigFixture);
exports.getMergedConfig = jest.fn();
exports.getProxyAgent = jest.fn();
exports.lint = jest.fn();
exports.bundle = jest.fn(() => ({ bundle: { parsed: null }, problems: null }));
exports.getTotals = jest.fn(() => ({ errors: 0 }));
exports.formatProblems = jest.fn();
exports.slash = jest.fn();
exports.findConfig = jest.fn();
exports.doesYamlFileExist = jest.fn();
exports.bundleDocument = jest.fn(() => Promise.resolve({ problems: {} }));
exports.detectSpec = jest.fn();
exports.isAbsoluteUrl = jest.fn();
exports.stringifyYaml = jest.fn((data) => data);
class BaseResolver {
    constructor() {
        this.cache = new Map();
        this.getFiles = jest.fn();
        this.resolveExternalRef = jest.fn();
        this.loadExternalRef = jest.fn;
        this.parseDocument = jest.fn();
        this.resolveDocument = jest
            .fn()
            .mockImplementationOnce(() => Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: documents_1.firstDocument }))
            .mockImplementationOnce(() => Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: documents_1.secondDocument }))
            .mockImplementationOnce(() => Promise.resolve({ source: { absoluteRef: 'ref' }, parsed: documents_1.thirdDocument }));
    }
}
exports.BaseResolver = BaseResolver;
class ResolveError extends Error {
    constructor(originalError) {
        super(originalError.message);
        this.originalError = originalError;
        Object.setPrototypeOf(this, ResolveError.prototype);
    }
}
exports.ResolveError = ResolveError;
class YamlParseError extends Error {
    constructor(originalError) {
        super(originalError.message);
        this.originalError = originalError;
        Object.setPrototypeOf(this, YamlParseError.prototype);
    }
}
exports.YamlParseError = YamlParseError;
var SpecVersion;
(function (SpecVersion) {
    SpecVersion["OAS2"] = "oas2";
    SpecVersion["OAS3_0"] = "oas3_0";
    SpecVersion["OAS3_1"] = "oas3_1";
    SpecVersion["Async2"] = "async2";
    SpecVersion["Async3"] = "async3";
})(SpecVersion || (exports.SpecVersion = SpecVersion = {}));
var Oas3Operations;
(function (Oas3Operations) {
    Oas3Operations["get"] = "get";
    Oas3Operations["put"] = "put";
    Oas3Operations["post"] = "post";
    Oas3Operations["delete"] = "delete";
    Oas3Operations["options"] = "options";
    Oas3Operations["head"] = "head";
    Oas3Operations["patch"] = "patch";
    Oas3Operations["trace"] = "trace";
})(Oas3Operations || (exports.Oas3Operations = Oas3Operations = {}));
