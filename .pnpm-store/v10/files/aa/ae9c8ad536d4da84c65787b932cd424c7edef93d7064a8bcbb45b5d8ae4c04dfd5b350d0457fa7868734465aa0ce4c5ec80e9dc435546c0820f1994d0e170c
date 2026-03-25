"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTSConfig = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const warn_1 = require("../errors/warn");
const logger_1 = require("../logger");
const util_1 = require("./util");
const debug = (0, logger_1.makeDebug)('read-tsconfig');
function resolve(root, name) {
    try {
        return require.resolve(name, { paths: [root] });
    }
    catch {
        // return undefined
    }
}
async function upUntil(path, test) {
    let result;
    try {
        result = await test(path);
    }
    catch {
        result = false;
    }
    if (result)
        return path;
    const parent = (0, node_path_1.dirname)(path);
    if (parent === path)
        return;
    return upUntil(parent, test);
}
async function readTSConfig(root, tsconfigName = 'tsconfig.json') {
    const found = [];
    let typescript;
    try {
        typescript = require('typescript');
    }
    catch {
        try {
            typescript = require(root + '/node_modules/typescript');
        }
        catch { }
    }
    if (!typescript) {
        (0, warn_1.memoizedWarn)('Could not find typescript. Please ensure that typescript is a devDependency. Falling back to compiled source.');
        return;
    }
    const read = async (path) => {
        const localRoot = await upUntil(path, async (p) => (await (0, promises_1.readdir)(p)).includes('package.json'));
        if (!localRoot)
            return;
        try {
            const contents = await (0, promises_1.readFile)(path, 'utf8');
            const parsed = typescript?.parseConfigFileTextToJson(path, contents).config;
            found.push(parsed);
            if (parsed.extends) {
                if (parsed.extends.startsWith('.')) {
                    const nextPath = resolve(localRoot, parsed.extends);
                    return nextPath ? read(nextPath) : undefined;
                }
                const resolved = resolve(localRoot, parsed.extends);
                if (resolved)
                    return read(resolved);
            }
            return parsed;
        }
        catch (error) {
            debug(error);
        }
    };
    await read((0, node_path_1.join)(root, tsconfigName));
    return {
        compilerOptions: (0, util_1.mergeNestedObjects)(found, 'compilerOptions'),
        'ts-node': (0, util_1.mergeNestedObjects)(found, 'ts-node'),
    };
}
exports.readTSConfig = readTSConfig;
