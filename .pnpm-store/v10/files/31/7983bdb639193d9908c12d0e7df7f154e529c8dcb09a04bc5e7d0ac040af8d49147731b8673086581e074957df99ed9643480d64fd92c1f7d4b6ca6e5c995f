import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const NM = `${sep}node_modules${sep}`;
const DIST = `${sep}dist${sep}`;
/**
 * Find the package.json file, either from a TypeScript file somewhere not
 * in a 'dist' folder, or a built and/or installed 'dist' folder.
 *
 * Note: this *only* works if you build your code into `'./dist'`, and that the
 * source path does not also contain `'dist'`! If you don't build into
 * `'./dist'`, or if you have files at `./src/dist/dist.ts`, then this will
 * not work properly!
 *
 * The default `pathFromSrc` option assumes that the calling code lives one
 * folder below the root of the package. Otherwise, it must be specified.
 *
 * Example:
 *
 * ```ts
 * // src/index.ts
 * import { findPackageJson } from 'package-json-from-dist'
 *
 * const pj = findPackageJson(import.meta.url)
 * console.log(`package.json found at ${pj}`)
 * ```
 *
 * If the caller is deeper within the project source, then you must provide
 * the appropriate fallback path:
 *
 * ```ts
 * // src/components/something.ts
 * import { findPackageJson } from 'package-json-from-dist'
 *
 * const pj = findPackageJson(import.meta.url, '../../package.json')
 * console.log(`package.json found at ${pj}`)
 * ```
 *
 * When running from CommmonJS, use `__filename` instead of `import.meta.url`
 *
 * ```ts
 * // src/index.cts
 * import { findPackageJson } from 'package-json-from-dist'
 *
 * const pj = findPackageJson(__filename)
 * console.log(`package.json found at ${pj}`)
 * ```
 */
export const findPackageJson = (from, pathFromSrc = '../package.json') => {
    const f = typeof from === 'object' || from.startsWith('file://') ?
        fileURLToPath(from)
        : from;
    const __dirname = dirname(f);
    const nms = __dirname.lastIndexOf(NM);
    if (nms !== -1) {
        // inside of node_modules. find the dist directly under package name.
        const nm = __dirname.substring(0, nms + NM.length);
        const pkgDir = __dirname.substring(nms + NM.length);
        const pkgName = pkgDir.startsWith('@') ?
            pkgDir.split(sep).slice(0, 2).join(sep)
            : String(pkgDir.split(sep)[0]);
        return resolve(nm, pkgName, 'package.json');
    }
    else {
        // see if we are in a dist folder.
        const d = __dirname.lastIndexOf(DIST);
        if (d !== -1) {
            return resolve(__dirname.substring(0, d), 'package.json');
        }
        else {
            return resolve(__dirname, pathFromSrc);
        }
    }
};
/**
 * Load the package.json file, either from a TypeScript file somewhere not
 * in a 'dist' folder, or a built and/or installed 'dist' folder.
 *
 * Note: this *only* works if you build your code into `'./dist'`, and that the
 * source path does not also contain `'dist'`! If you don't build into
 * `'./dist'`, or if you have files at `./src/dist/dist.ts`, then this will
 * not work properly!
 *
 * The default `pathFromSrc` option assumes that the calling code lives one
 * folder below the root of the package. Otherwise, it must be specified.
 *
 * Example:
 *
 * ```ts
 * // src/index.ts
 * import { loadPackageJson } from 'package-json-from-dist'
 *
 * const pj = loadPackageJson(import.meta.url)
 * console.log(`Hello from ${pj.name}@${pj.version}`)
 * ```
 *
 * If the caller is deeper within the project source, then you must provide
 * the appropriate fallback path:
 *
 * ```ts
 * // src/components/something.ts
 * import { loadPackageJson } from 'package-json-from-dist'
 *
 * const pj = loadPackageJson(import.meta.url, '../../package.json')
 * console.log(`Hello from ${pj.name}@${pj.version}`)
 * ```
 *
 * When running from CommmonJS, use `__filename` instead of `import.meta.url`
 *
 * ```ts
 * // src/index.cts
 * import { loadPackageJson } from 'package-json-from-dist'
 *
 * const pj = loadPackageJson(__filename)
 * console.log(`Hello from ${pj.name}@${pj.version}`)
 * ```
 */
export const loadPackageJson = (from, pathFromSrc = '../package.json') => JSON.parse(readFileSync(findPackageJson(from, pathFromSrc), 'utf8'));
//# sourceMappingURL=index.js.map