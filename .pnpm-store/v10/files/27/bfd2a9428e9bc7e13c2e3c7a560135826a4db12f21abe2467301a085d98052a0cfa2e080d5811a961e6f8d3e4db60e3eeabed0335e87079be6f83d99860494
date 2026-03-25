import path from 'node:path';
import { pkgUp } from './pkg-up.js';
import { readPkgUp } from './read-pkg-up.js';
export function getContextPackagePath(context) {
    return getFilePackagePath(context.physicalFilename);
}
export function getFilePackagePath(filename) {
    return path.dirname(pkgUp({ cwd: filename }));
}
export function getFilePackageName(filename) {
    const { pkg, path: pkgPath } = readPkgUp({ cwd: filename });
    if (pkg) {
        return pkg.name || getFilePackageName(path.resolve(pkgPath, '../..'));
    }
    return null;
}
//# sourceMappingURL=package-path.js.map