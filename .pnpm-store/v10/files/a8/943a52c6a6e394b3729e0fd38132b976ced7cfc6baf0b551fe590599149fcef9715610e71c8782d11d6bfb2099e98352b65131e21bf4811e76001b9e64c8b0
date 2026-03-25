import fs from 'node:fs';
import { pkgUp } from './pkg-up.js';
function stripBOM(str) {
    return str.replace(/^\uFEFF/, '');
}
export function readPkgUp(opts) {
    const fp = pkgUp(opts);
    if (!fp) {
        return {};
    }
    try {
        return {
            pkg: JSON.parse(stripBOM(fs.readFileSync(fp, { encoding: 'utf8' }))),
            path: fp,
        };
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=read-pkg-up.js.map