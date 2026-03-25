import * as util from 'util';
const pv = (typeof process === 'object' &&
    !!process &&
    typeof process.version === 'string') ?
    process.version
    : 'v0.0.0';
const pvs = pv
    .replace(/^v/, '')
    .split('.')
    .map(s => parseInt(s, 10));
/* c8 ignore start */
const [major = 0, minor = 0] = pvs;
/* c8 ignore stop */
let { parseArgs: pa, } = util;
/* c8 ignore start - version specific */
if (!pa ||
    major < 16 ||
    (major === 18 && minor < 11) ||
    (major === 16 && minor < 19)) {
    // Ignore because we will clobber it for commonjs
    //@ts-ignore
    pa = (await import('@pkgjs/parseargs')).parseArgs;
}
/* c8 ignore stop */
export const parseArgs = pa;
//# sourceMappingURL=parse-args.js.map