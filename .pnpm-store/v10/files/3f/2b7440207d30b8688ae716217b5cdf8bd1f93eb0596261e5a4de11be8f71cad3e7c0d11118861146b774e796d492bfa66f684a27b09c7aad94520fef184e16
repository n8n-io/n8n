"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayParameterSerialization = void 0;
const ref_utils_1 = require("../../ref-utils");
const ArrayParameterSerialization = (options) => {
    return {
        Parameter: {
            leave(node, ctx) {
                if (!node.schema) {
                    return;
                }
                const schema = ((0, ref_utils_1.isRef)(node.schema) ? ctx.resolve(node.schema).node : node.schema);
                if (schema &&
                    shouldReportMissingStyleAndExplode(node, schema, options)) {
                    ctx.report({
                        message: `Parameter \`${node.name}\` should have \`style\` and \`explode \` fields`,
                        location: ctx.location,
                    });
                }
            },
        },
    };
};
exports.ArrayParameterSerialization = ArrayParameterSerialization;
function shouldReportMissingStyleAndExplode(node, schema, options) {
    return ((schema.type === 'array' || schema.items || schema.prefixItems) &&
        (node.style === undefined || node.explode === undefined) &&
        (!options.in || (node.in && options.in?.includes(node.in))));
}
