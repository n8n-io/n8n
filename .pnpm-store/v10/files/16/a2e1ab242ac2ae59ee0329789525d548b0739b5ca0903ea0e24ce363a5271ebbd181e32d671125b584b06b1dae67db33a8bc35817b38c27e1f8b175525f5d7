/**
 * This is the Windows implementation of isexe, which uses the file
 * extension and PATHEXT setting.
 *
 * @module
 */
import { statSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { delimiter } from 'node:path';
/**
 * Determine whether a path is executable based on the file extension
 * and PATHEXT environment variable (or specified pathExt option)
 */
export const isexe = async (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat(await stat(path), path, options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};
/**
 * Synchronously determine whether a path is executable based on the file
 * extension and PATHEXT environment variable (or specified pathExt option)
 */
export const sync = (path, options = {}) => {
    const { ignoreErrors = false } = options;
    try {
        return checkStat(statSync(path), path, options);
    }
    catch (e) {
        const er = e;
        if (ignoreErrors || er.code === 'EACCES')
            return false;
        throw er;
    }
};
const checkPathExt = (path, options) => {
    const { pathExt = process.env.PATHEXT || '' } = options;
    const peSplit = pathExt.split(delimiter);
    if (peSplit.indexOf('') !== -1) {
        return true;
    }
    for (const pes of peSplit) {
        const p = pes.toLowerCase();
        const ext = path.substring(path.length - p.length).toLowerCase();
        if (p && ext === p) {
            return true;
        }
    }
    return false;
};
const checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);
//# sourceMappingURL=win32.js.map