"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecMajorVersion = exports.SpecVersion = void 0;
exports.detectSpec = detectSpec;
exports.getMajorSpecVersion = getMajorSpecVersion;
exports.getTypes = getTypes;
const oas2_1 = require("./types/oas2");
const oas3_1 = require("./types/oas3");
const oas3_1_1 = require("./types/oas3_1");
const asyncapi2_1 = require("./types/asyncapi2");
const asyncapi3_1 = require("./types/asyncapi3");
const arazzo_1 = require("./types/arazzo");
const overlay_1 = require("./types/overlay");
const utils_1 = require("./utils");
const arazzo_2 = require("./typings/arazzo");
var SpecVersion;
(function (SpecVersion) {
    SpecVersion["OAS2"] = "oas2";
    SpecVersion["OAS3_0"] = "oas3_0";
    SpecVersion["OAS3_1"] = "oas3_1";
    SpecVersion["Async2"] = "async2";
    SpecVersion["Async3"] = "async3";
    SpecVersion["Arazzo1"] = "arazzo1";
    SpecVersion["Overlay1"] = "overlay1";
})(SpecVersion || (exports.SpecVersion = SpecVersion = {}));
var SpecMajorVersion;
(function (SpecMajorVersion) {
    SpecMajorVersion["OAS2"] = "oas2";
    SpecMajorVersion["OAS3"] = "oas3";
    SpecMajorVersion["Async2"] = "async2";
    SpecMajorVersion["Async3"] = "async3";
    SpecMajorVersion["Arazzo1"] = "arazzo1";
    SpecMajorVersion["Overlay1"] = "overlay1";
})(SpecMajorVersion || (exports.SpecMajorVersion = SpecMajorVersion = {}));
const typesMap = {
    [SpecVersion.OAS2]: oas2_1.Oas2Types,
    [SpecVersion.OAS3_0]: oas3_1.Oas3Types,
    [SpecVersion.OAS3_1]: oas3_1_1.Oas3_1Types,
    [SpecVersion.Async2]: asyncapi2_1.AsyncApi2Types,
    [SpecVersion.Async3]: asyncapi3_1.AsyncApi3Types,
    [SpecVersion.Arazzo1]: arazzo_1.Arazzo1Types,
    [SpecVersion.Overlay1]: overlay_1.Overlay1Types,
};
function detectSpec(root) {
    if (!(0, utils_1.isPlainObject)(root)) {
        throw new Error(`Document must be JSON object, got ${typeof root}`);
    }
    if (root.openapi && typeof root.openapi !== 'string') {
        throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof root.openapi}"`);
    }
    if (typeof root.openapi === 'string' && root.openapi.startsWith('3.0')) {
        return SpecVersion.OAS3_0;
    }
    if (typeof root.openapi === 'string' && root.openapi.startsWith('3.1')) {
        return SpecVersion.OAS3_1;
    }
    if (root.swagger && root.swagger === '2.0') {
        return SpecVersion.OAS2;
    }
    if (root.openapi || root.swagger) {
        throw new Error(`Unsupported OpenAPI version: ${root.openapi || root.swagger}`);
    }
    if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('2.')) {
        return SpecVersion.Async2;
    }
    if (typeof root.asyncapi === 'string' && root.asyncapi.startsWith('3.')) {
        return SpecVersion.Async3;
    }
    if (root.asyncapi) {
        throw new Error(`Unsupported AsyncAPI version: ${root.asyncapi}`);
    }
    if (typeof root.arazzo === 'string' && arazzo_2.VERSION_PATTERN.test(root.arazzo)) {
        return SpecVersion.Arazzo1;
    }
    if (typeof root.overlay === 'string' && arazzo_2.VERSION_PATTERN.test(root.overlay)) {
        return SpecVersion.Overlay1;
    }
    throw new Error(`Unsupported specification`);
}
function getMajorSpecVersion(version) {
    if (version === SpecVersion.OAS2) {
        return SpecMajorVersion.OAS2;
    }
    else if (version === SpecVersion.Async2) {
        return SpecMajorVersion.Async2;
    }
    else if (version === SpecVersion.Async3) {
        return SpecMajorVersion.Async3;
    }
    else if (version === SpecVersion.Arazzo1) {
        return SpecMajorVersion.Arazzo1;
    }
    else if (version === SpecVersion.Overlay1) {
        return SpecMajorVersion.Overlay1;
    }
    else {
        return SpecMajorVersion.OAS3;
    }
}
function getTypes(spec) {
    return typesMap[spec];
}
