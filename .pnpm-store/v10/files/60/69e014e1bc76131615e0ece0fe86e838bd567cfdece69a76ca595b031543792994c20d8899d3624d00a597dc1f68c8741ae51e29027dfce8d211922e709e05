"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateFlags = void 0;
const flags_1 = require("../flags");
const json = (0, flags_1.boolean)({
    description: 'Format output as json.',
    helpGroup: 'GLOBAL',
});
function aggregateFlags(flags, baseFlags, enableJsonFlag) {
    const combinedFlags = { ...baseFlags, ...flags };
    return (enableJsonFlag ? { json, ...combinedFlags } : combinedFlags);
}
exports.aggregateFlags = aggregateFlags;
