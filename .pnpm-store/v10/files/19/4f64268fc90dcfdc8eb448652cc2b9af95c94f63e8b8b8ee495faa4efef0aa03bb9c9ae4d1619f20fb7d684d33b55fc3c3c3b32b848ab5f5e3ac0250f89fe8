import { normalize, sep } from "node:path";
export const getNodeModulesParentDirs = (dirname) => {
    const cwd = process.cwd();
    if (!dirname) {
        return [cwd];
    }
    const normalizedPath = normalize(dirname);
    const parts = normalizedPath.split(sep);
    const nodeModulesIndex = parts.indexOf("node_modules");
    const parentDir = nodeModulesIndex !== -1 ? parts.slice(0, nodeModulesIndex).join(sep) : normalizedPath;
    if (cwd === parentDir) {
        return [cwd];
    }
    return [parentDir, cwd];
};
