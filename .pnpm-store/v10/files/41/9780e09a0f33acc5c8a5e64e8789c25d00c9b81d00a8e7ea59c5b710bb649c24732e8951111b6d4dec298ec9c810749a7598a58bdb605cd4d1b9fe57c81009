"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertVersion = void 0;
/**
 * Asserts open api version
 *
 * @param openApiVersion  SemVer version
 * @returns destructured major and minor
 */
const assertVersion = (openApiVersion) => {
    const [ok, major, minor] = /^(\d+)\.(\d+).(\d+)?$/.exec(openApiVersion);
    if (!ok) {
        throw Error('Version missing from OpenAPI specification');
    }
    ;
    if (major !== '3' || minor !== '0' && minor !== '1') {
        throw new Error('OpenAPI v3.0 or v3.1 specification version is required');
    }
    return { major, minor };
};
exports.assertVersion = assertVersion;
//# sourceMappingURL=assert.version.js.map