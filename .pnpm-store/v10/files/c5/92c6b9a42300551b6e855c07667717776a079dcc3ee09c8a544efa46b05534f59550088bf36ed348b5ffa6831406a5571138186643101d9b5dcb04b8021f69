"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathsToModuleNameMapper = void 0;
const bs_logger_1 = require("bs-logger");
const utils_1 = require("../utils");
const messages_1 = require("../utils/messages");
// we don't need to escape all chars, so commented out is the real one
// const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
const escapeRegex = (str) => str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
const logger = utils_1.rootLogger.child({ [bs_logger_1.LogContexts.namespace]: 'path-mapper' });
const pathsToModuleNameMapper = (mapping, { prefix = '', useESM = false } = {}) => {
    const jestMap = {};
    for (const fromPath of Object.keys(mapping)) {
        const toPaths = mapping[fromPath];
        // check that we have only one target path
        if (toPaths.length === 0) {
            logger.warn((0, messages_1.interpolate)("Not mapping \"{{path}}\" because it has no target." /* Errors.NotMappingPathWithEmptyMap */, { path: fromPath }));
            continue;
        }
        // split with '*'
        const segments = fromPath.split(/\*/g);
        if (segments.length === 1) {
            const paths = toPaths.map((target) => {
                const enrichedPrefix = prefix !== '' && !prefix.endsWith('/') ? `${prefix}/` : prefix;
                return `${enrichedPrefix}${target}`;
            });
            const cjsPattern = `^${escapeRegex(fromPath)}$`;
            jestMap[cjsPattern] = paths.length === 1 ? paths[0] : paths;
        }
        else if (segments.length === 2) {
            const paths = toPaths.map((target) => {
                const enrichedTarget = target.startsWith('./') && prefix !== '' ? target.substring(target.indexOf('/') + 1) : target;
                const enrichedPrefix = prefix !== '' && !prefix.endsWith('/') ? `${prefix}/` : prefix;
                return `${enrichedPrefix}${enrichedTarget.replace(/\*/g, '$1')}`;
            });
            if (useESM) {
                const esmPattern = `^${escapeRegex(segments[0])}(.*)${escapeRegex(segments[1])}\\.js$`;
                jestMap[esmPattern] = paths.length === 1 ? paths[0] : paths;
            }
            const cjsPattern = `^${escapeRegex(segments[0])}(.*)${escapeRegex(segments[1])}$`;
            jestMap[cjsPattern] = paths.length === 1 ? paths[0] : paths;
        }
        else {
            logger.warn((0, messages_1.interpolate)("Not mapping \"{{path}}\" because it has more than one star (`*`)." /* Errors.NotMappingMultiStarPath */, { path: fromPath }));
        }
    }
    if (useESM) {
        jestMap['^(\\.{1,2}/.*)\\.js$'] = '$1';
    }
    return jestMap;
};
exports.pathsToModuleNameMapper = pathsToModuleNameMapper;
