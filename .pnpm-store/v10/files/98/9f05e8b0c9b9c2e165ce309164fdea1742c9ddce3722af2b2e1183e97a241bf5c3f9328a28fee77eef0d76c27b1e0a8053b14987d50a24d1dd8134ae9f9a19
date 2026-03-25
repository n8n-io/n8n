// returns an array of entries if readdir() works,
// or the error that readdir() raised if not.
import { promises, readdirSync } from './fs.js';
const { readdir } = promises;
export const readdirOrError = (path) => readdir(path).catch(er => er);
export const readdirOrErrorSync = (path) => {
    try {
        return readdirSync(path);
    }
    catch (er) {
        return er;
    }
};
//# sourceMappingURL=readdir-or-error.js.map