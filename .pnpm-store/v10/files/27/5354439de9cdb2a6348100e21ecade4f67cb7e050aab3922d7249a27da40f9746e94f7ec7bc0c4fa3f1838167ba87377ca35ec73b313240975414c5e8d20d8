import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { cjsRequire } from '../require.js';
function createModule(filename) {
    const mod = new Module(filename);
    mod.filename = filename;
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    return mod;
}
export function moduleRequire(p, sourceFile) {
    try {
        const eslintPath = cjsRequire.resolve('eslint');
        const eslintModule = createModule(eslintPath);
        return cjsRequire(Module._resolveFilename(p, eslintModule));
    }
    catch {
    }
    try {
        return cjsRequire.main.require(p);
    }
    catch {
    }
    try {
        return createRequire(sourceFile)(p);
    }
    catch {
    }
    return cjsRequire(p);
}
//# sourceMappingURL=module-require.js.map