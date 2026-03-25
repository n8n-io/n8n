import { promises as fsPromises } from "fs";
const { readFile } = fsPromises;
export const filePromisesHash = {};
export const fileIntercept = {};
export const slurpFile = (path, options) => {
    if (fileIntercept[path] !== undefined) {
        return fileIntercept[path];
    }
    if (!filePromisesHash[path] || options?.ignoreCache) {
        filePromisesHash[path] = readFile(path, "utf8");
    }
    return filePromisesHash[path];
};
