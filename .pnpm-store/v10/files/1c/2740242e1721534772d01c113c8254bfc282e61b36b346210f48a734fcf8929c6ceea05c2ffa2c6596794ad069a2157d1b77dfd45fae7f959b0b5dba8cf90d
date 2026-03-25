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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.satisfiesAllDependencyConstraints = satisfiesAllDependencyConstraints;
const semver = __importStar(require("semver"));
const BASE_SATISFIES_OPTIONS = {
    includePrerelease: true,
};
function satisfiesDependencyConstraint(packageName, constraintIn) {
    const constraint = typeof constraintIn === 'string'
        ? {
            range: `>=${constraintIn}`,
        }
        : constraintIn;
    return semver.satisfies(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(`${packageName}/package.json`).version, constraint.range, typeof constraint.options === 'object'
        ? { ...BASE_SATISFIES_OPTIONS, ...constraint.options }
        : constraint.options);
}
function satisfiesAllDependencyConstraints(dependencyConstraints) {
    if (dependencyConstraints == null) {
        return true;
    }
    for (const [packageName, constraint] of Object.entries(dependencyConstraints)) {
        if (!satisfiesDependencyConstraint(packageName, constraint)) {
            return false;
        }
    }
    return true;
}
