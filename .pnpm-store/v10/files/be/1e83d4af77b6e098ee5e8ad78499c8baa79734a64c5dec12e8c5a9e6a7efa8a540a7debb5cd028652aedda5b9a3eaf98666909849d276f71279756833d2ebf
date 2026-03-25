"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPjson = void 0;
const lilconfig_1 = require("lilconfig");
const node_path_1 = require("node:path");
const logger_1 = require("../logger");
const fs_1 = require("./fs");
const debug = (0, logger_1.makeDebug)('read-pjson');
/**
 * Read the package.json file from a given path and add the oclif config (found by lilconfig) if it exists.
 *
 * We can assume that the package.json file exists because the plugin root has already been loaded at this point.
 */
async function readPjson(path) {
    const pjsonPath = (0, node_path_1.join)(path, 'package.json');
    if (process.env.OCLIF_DISABLE_RC) {
        debug('OCLIF_DISABLE_RC is set, skipping rc search');
        return (0, fs_1.readJson)(pjsonPath);
    }
    const pjson = await (0, fs_1.readJson)(pjsonPath);
    // don't bother with lilconfig if the plugin's package.json already has an oclif config
    if (pjson.oclif) {
        debug(`found oclif config in ${pjsonPath}`);
        return pjson;
    }
    debug(`searching for oclif config in ${path}`);
    const explorer = (0, lilconfig_1.lilconfig)('oclif', {
        /**
         * Remove the following from the defaults:
         * - package.json
         * - any files under .config/
         */
        searchPlaces: [
            '.oclifrc',
            '.oclifrc.json',
            '.oclifrc.js',
            '.oclifrc.mjs',
            '.oclifrc.cjs',
            'oclif.config.js',
            'oclif.config.mjs',
            'oclif.config.cjs',
        ],
        stopDir: path,
    });
    const result = await explorer.search(path);
    if (!result?.config) {
        debug(`no oclif config found in ${path}`);
        return pjson;
    }
    debug(`found oclif config for ${path}: %O`, result);
    return {
        ...pjson,
        oclif: result?.config ?? {},
    };
}
exports.readPjson = readPjson;
