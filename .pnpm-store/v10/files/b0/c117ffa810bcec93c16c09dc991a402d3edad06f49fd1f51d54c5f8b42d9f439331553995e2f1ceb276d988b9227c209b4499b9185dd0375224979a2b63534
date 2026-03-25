"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectUsableIds = void 0;
exports.makeDebug = makeDebug;
exports.getPermutations = getPermutations;
exports.getCommandIdPermutations = getCommandIdPermutations;
const logger_1 = require("../logger");
function makeDebug(...scope) {
    return (formatter, ...args) => (0, logger_1.getLogger)(['config', ...scope].join(':')).debug(formatter, ...args);
}
// Adapted from https://github.com/angus-c/just/blob/master/packages/array-permutations/index.js
function getPermutations(arr) {
    if (arr.length === 0)
        return [];
    if (arr.length === 1)
        return [arr];
    const output = [];
    const partialPermutations = getPermutations(arr.slice(1));
    const first = arr[0];
    for (let i = 0, len = partialPermutations.length; i < len; i++) {
        const partial = partialPermutations[i];
        for (let j = 0, len2 = partial.length; j <= len2; j++) {
            const start = partial.slice(0, j);
            const end = partial.slice(j);
            const merged = [...start, first, ...end];
            output.push(merged);
        }
    }
    return output;
}
function getCommandIdPermutations(commandId) {
    return getPermutations(commandId.split(':')).flatMap((c) => c.join(':'));
}
/**
 * Return an array of ids that represent all the usable combinations that a user could enter.
 *
 * For example, if the command ids are:
 * - foo:bar:baz
 * - one:two:three
 * Then the usable ids would be:
 * - foo
 * - foo:bar
 * - foo:bar:baz
 * - one
 * - one:two
 * - one:two:three
 *
 * This allows us to determine which parts of the argv array belong to the command id whenever the topicSeparator is a space.
 *
 * @param commandIds string[]
 * @returns string[]
 */
const collectUsableIds = (commandIds) => new Set(commandIds.flatMap((id) => id.split(':').map((_, i, a) => a.slice(0, i + 1).join(':'))));
exports.collectUsableIds = collectUsableIds;
