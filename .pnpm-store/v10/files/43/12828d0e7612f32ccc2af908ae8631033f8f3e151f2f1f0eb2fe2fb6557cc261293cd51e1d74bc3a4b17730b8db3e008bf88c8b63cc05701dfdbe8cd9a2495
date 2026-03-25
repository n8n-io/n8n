"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModuleTypeClassifier = void 0;
const ts_internals_1 = require("./ts-internals");
const util_1 = require("./util");
/**
 * @internal
 * May receive non-normalized options -- basePath and patterns -- and will normalize them
 * internally.
 * However, calls to `classifyModule` must pass pre-normalized paths!
 */
function createModuleTypeClassifier(options) {
    const { patterns, basePath: _basePath } = options;
    const basePath = _basePath !== undefined
        ? (0, util_1.normalizeSlashes)(_basePath).replace(/\/$/, '')
        : undefined;
    const patternTypePairs = Object.entries(patterns !== null && patterns !== void 0 ? patterns : []).map(([_pattern, type]) => {
        const pattern = (0, util_1.normalizeSlashes)(_pattern);
        return { pattern: parsePattern(basePath, pattern), type };
    });
    const classifications = {
        package: {
            moduleType: 'auto',
        },
        cjs: {
            moduleType: 'cjs',
        },
        esm: {
            moduleType: 'esm',
        },
    };
    const auto = classifications.package;
    // Passed path must be normalized!
    function classifyModuleNonCached(path) {
        const matched = matchPatterns(patternTypePairs, (_) => _.pattern, path);
        if (matched)
            return classifications[matched.type];
        return auto;
    }
    const classifyModule = (0, util_1.cachedLookup)(classifyModuleNonCached);
    function classifyModuleAuto(path) {
        return auto;
    }
    return {
        classifyModuleByModuleTypeOverrides: patternTypePairs.length
            ? classifyModule
            : classifyModuleAuto,
    };
}
exports.createModuleTypeClassifier = createModuleTypeClassifier;
function parsePattern(basePath, patternString) {
    const pattern = (0, ts_internals_1.getPatternFromSpec)(patternString, basePath);
    return pattern !== undefined ? new RegExp(pattern) : /(?:)/;
}
function matchPatterns(objects, getPattern, candidate) {
    for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];
        const pattern = getPattern(object);
        if (pattern === null || pattern === void 0 ? void 0 : pattern.test(candidate)) {
            return object;
        }
    }
}
//# sourceMappingURL=module-type-classifier.js.map