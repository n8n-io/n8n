import { readFile as fsReadFile } from "node:fs/promises";
export const filePromises = {};
export const fileIntercept = {};
export const readFile = (path, options) => {
    if (fileIntercept[path] !== undefined) {
        return fileIntercept[path];
    }
    if (!filePromises[path] || options?.ignoreCache) {
        filePromises[path] = fsReadFile(path, "utf8");
    }
    return filePromises[path];
};
