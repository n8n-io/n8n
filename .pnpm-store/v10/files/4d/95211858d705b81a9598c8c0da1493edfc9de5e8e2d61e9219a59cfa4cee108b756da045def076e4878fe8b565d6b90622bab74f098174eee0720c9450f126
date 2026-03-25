'use strict';

exports.HttpAuthLocation = void 0;
(function (HttpAuthLocation) {
    HttpAuthLocation["HEADER"] = "header";
    HttpAuthLocation["QUERY"] = "query";
})(exports.HttpAuthLocation || (exports.HttpAuthLocation = {}));

exports.HttpApiKeyAuthLocation = void 0;
(function (HttpApiKeyAuthLocation) {
    HttpApiKeyAuthLocation["HEADER"] = "header";
    HttpApiKeyAuthLocation["QUERY"] = "query";
})(exports.HttpApiKeyAuthLocation || (exports.HttpApiKeyAuthLocation = {}));

exports.EndpointURLScheme = void 0;
(function (EndpointURLScheme) {
    EndpointURLScheme["HTTP"] = "http";
    EndpointURLScheme["HTTPS"] = "https";
})(exports.EndpointURLScheme || (exports.EndpointURLScheme = {}));

exports.AlgorithmId = void 0;
(function (AlgorithmId) {
    AlgorithmId["MD5"] = "md5";
    AlgorithmId["CRC32"] = "crc32";
    AlgorithmId["CRC32C"] = "crc32c";
    AlgorithmId["SHA1"] = "sha1";
    AlgorithmId["SHA256"] = "sha256";
})(exports.AlgorithmId || (exports.AlgorithmId = {}));
const getChecksumConfiguration = (runtimeConfig) => {
    const checksumAlgorithms = [];
    if (runtimeConfig.sha256 !== undefined) {
        checksumAlgorithms.push({
            algorithmId: () => exports.AlgorithmId.SHA256,
            checksumConstructor: () => runtimeConfig.sha256,
        });
    }
    if (runtimeConfig.md5 != undefined) {
        checksumAlgorithms.push({
            algorithmId: () => exports.AlgorithmId.MD5,
            checksumConstructor: () => runtimeConfig.md5,
        });
    }
    return {
        addChecksumAlgorithm(algo) {
            checksumAlgorithms.push(algo);
        },
        checksumAlgorithms() {
            return checksumAlgorithms;
        },
    };
};
const resolveChecksumRuntimeConfig = (clientConfig) => {
    const runtimeConfig = {};
    clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
        runtimeConfig[checksumAlgorithm.algorithmId()] = checksumAlgorithm.checksumConstructor();
    });
    return runtimeConfig;
};

const getDefaultClientConfiguration = (runtimeConfig) => {
    return getChecksumConfiguration(runtimeConfig);
};
const resolveDefaultRuntimeConfig = (config) => {
    return resolveChecksumRuntimeConfig(config);
};

exports.FieldPosition = void 0;
(function (FieldPosition) {
    FieldPosition[FieldPosition["HEADER"] = 0] = "HEADER";
    FieldPosition[FieldPosition["TRAILER"] = 1] = "TRAILER";
})(exports.FieldPosition || (exports.FieldPosition = {}));

const SMITHY_CONTEXT_KEY = "__smithy_context";

exports.IniSectionType = void 0;
(function (IniSectionType) {
    IniSectionType["PROFILE"] = "profile";
    IniSectionType["SSO_SESSION"] = "sso-session";
    IniSectionType["SERVICES"] = "services";
})(exports.IniSectionType || (exports.IniSectionType = {}));

exports.RequestHandlerProtocol = void 0;
(function (RequestHandlerProtocol) {
    RequestHandlerProtocol["HTTP_0_9"] = "http/0.9";
    RequestHandlerProtocol["HTTP_1_0"] = "http/1.0";
    RequestHandlerProtocol["TDS_8_0"] = "tds/8.0";
})(exports.RequestHandlerProtocol || (exports.RequestHandlerProtocol = {}));

exports.SMITHY_CONTEXT_KEY = SMITHY_CONTEXT_KEY;
exports.getDefaultClientConfiguration = getDefaultClientConfiguration;
exports.resolveDefaultRuntimeConfig = resolveDefaultRuntimeConfig;
