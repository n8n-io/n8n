"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyModule = void 0;
const node_internal_modules_cjs_loader_1 = require("../dist-raw/node-internal-modules-cjs-loader");
/**
 * Determine how to emit a module based on tsconfig "module" and package.json "type"
 *
 * Supports module=nodenext/node16 with transpileOnly, where we cannot ask the
 * TS typechecker to tell us if a file is CJS or ESM.
 *
 * Return values indicate:
 * - cjs
 * - esm
 * - nodecjs == node-flavored cjs where dynamic imports are *not* transformed into `require()`
 * - undefined == emit according to tsconfig `module` config, whatever that is
 * @internal
 */
function classifyModule(nativeFilename, isNodeModuleType) {
    // [MUST_UPDATE_FOR_NEW_FILE_EXTENSIONS]
    const lastDotIndex = nativeFilename.lastIndexOf('.');
    const ext = lastDotIndex >= 0 ? nativeFilename.slice(lastDotIndex) : '';
    switch (ext) {
        case '.cjs':
        case '.cts':
            return isNodeModuleType ? 'nodecjs' : 'cjs';
        case '.mjs':
        case '.mts':
            return isNodeModuleType ? 'nodeesm' : 'esm';
    }
    if (isNodeModuleType) {
        const packageScope = (0, node_internal_modules_cjs_loader_1.readPackageScope)(nativeFilename);
        if (packageScope && packageScope.data.type === 'module')
            return 'nodeesm';
        return 'nodecjs';
    }
    return undefined;
}
exports.classifyModule = classifyModule;
//# sourceMappingURL=node-module-type-classifier.js.map