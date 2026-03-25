"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultTsconfigJsonForNodeVersion = void 0;
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
/**
 * return parsed JSON of the bundled @tsconfig/bases config appropriate for the
 * running version of nodejs
 * @internal
 */
function getDefaultTsconfigJsonForNodeVersion(ts) {
    const tsInternal = ts;
    if (nodeMajor >= 16) {
        const config = require('@tsconfig/node16/tsconfig.json');
        if (configCompatible(config))
            return config;
    }
    if (nodeMajor >= 14) {
        const config = require('@tsconfig/node14/tsconfig.json');
        if (configCompatible(config))
            return config;
    }
    if (nodeMajor >= 12) {
        const config = require('@tsconfig/node12/tsconfig.json');
        if (configCompatible(config))
            return config;
    }
    return require('@tsconfig/node10/tsconfig.json');
    // Verify that tsconfig target and lib options are compatible with TypeScript compiler
    function configCompatible(config) {
        return (typeof ts.ScriptTarget[config.compilerOptions.target.toUpperCase()] === 'number' &&
            tsInternal.libs &&
            config.compilerOptions.lib.every((lib) => tsInternal.libs.includes(lib)));
    }
}
exports.getDefaultTsconfigJsonForNodeVersion = getDefaultTsconfigJsonForNodeVersion;
//# sourceMappingURL=tsconfigs.js.map