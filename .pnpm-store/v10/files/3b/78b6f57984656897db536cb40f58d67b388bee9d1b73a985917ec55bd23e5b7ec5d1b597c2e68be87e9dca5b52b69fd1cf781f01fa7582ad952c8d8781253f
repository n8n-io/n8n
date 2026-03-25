"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJestPreset = void 0;
var utils_1 = require("../utils");
var logger = utils_1.rootLogger.child({ namespace: 'jest-preset' });
function createJestPreset(legacy, allowJs, extraOptions) {
    var _a;
    if (legacy === void 0) { legacy = false; }
    if (allowJs === void 0) { allowJs = false; }
    if (extraOptions === void 0) { extraOptions = {}; }
    logger.debug({ allowJs: allowJs }, 'creating jest presets', allowJs ? 'handling' : 'not handling', 'JavaScript files');
    var extensionsToTreatAsEsm = extraOptions.extensionsToTreatAsEsm, moduleFileExtensions = extraOptions.moduleFileExtensions, testMatch = extraOptions.testMatch;
    var supportESM = extensionsToTreatAsEsm === null || extensionsToTreatAsEsm === void 0 ? void 0 : extensionsToTreatAsEsm.length;
    var tsJestTransformOptions = supportESM ? { useESM: true } : {};
    return __assign(__assign(__assign(__assign({}, (extensionsToTreatAsEsm ? { extensionsToTreatAsEsm: extensionsToTreatAsEsm } : undefined)), (moduleFileExtensions ? { moduleFileExtensions: moduleFileExtensions } : undefined)), (testMatch ? { testMatch: testMatch } : undefined)), { transform: __assign(__assign({}, extraOptions.transform), (_a = {}, _a[allowJs ? (supportESM ? '^.+\\.m?[tj]sx?$' : '^.+\\.[tj]sx?$') : '^.+\\.tsx?$'] = legacy
            ? ['ts-jest/legacy', tsJestTransformOptions]
            : ['ts-jest', tsJestTransformOptions], _a)) });
}
exports.createJestPreset = createJestPreset;
