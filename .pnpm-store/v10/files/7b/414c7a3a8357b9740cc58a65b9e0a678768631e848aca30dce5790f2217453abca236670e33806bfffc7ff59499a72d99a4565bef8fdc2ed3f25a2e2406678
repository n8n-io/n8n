"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveXInternal = void 0;
const utils_1 = require("../../utils");
const ref_utils_1 = require("../../ref-utils");
const DEFAULT_INTERNAL_PROPERTY_NAME = 'x-internal';
const RemoveXInternal = ({ internalFlagProperty = DEFAULT_INTERNAL_PROPERTY_NAME, }) => {
    function removeInternal(node, ctx, originalMapping) {
        const { parent, key } = ctx;
        let didDelete = false;
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                if ((0, ref_utils_1.isRef)(node[i])) {
                    const resolved = ctx.resolve(node[i]);
                    if (resolved.node?.[internalFlagProperty]) {
                        // First, remove the reference in the discriminator mapping, if it exists:
                        if ((0, utils_1.isPlainObject)(parent.discriminator?.mapping)) {
                            for (const mapping in parent.discriminator.mapping) {
                                if (originalMapping?.[mapping] === node[i].$ref) {
                                    delete parent.discriminator.mapping[mapping];
                                }
                            }
                        }
                        node.splice(i, 1);
                        didDelete = true;
                        i--;
                    }
                }
                if (node[i]?.[internalFlagProperty]) {
                    node.splice(i, 1);
                    didDelete = true;
                    i--;
                }
            }
        }
        else if ((0, utils_1.isPlainObject)(node)) {
            for (const key of Object.keys(node)) {
                if ((0, ref_utils_1.isRef)(node[key])) {
                    const resolved = ctx.resolve(node[key]);
                    if ((0, utils_1.isPlainObject)(resolved.node) && resolved.node?.[internalFlagProperty]) {
                        delete node[key];
                        didDelete = true;
                    }
                }
                if ((0, utils_1.isPlainObject)(node[key]) && node[key]?.[internalFlagProperty]) {
                    delete node[key];
                    didDelete = true;
                }
            }
        }
        if (didDelete && ((0, utils_1.isEmptyObject)(node) || (0, utils_1.isEmptyArray)(node))) {
            delete parent[key];
        }
    }
    let originalMapping = {};
    return {
        DiscriminatorMapping: {
            enter: (mapping) => {
                originalMapping = JSON.parse(JSON.stringify(mapping));
            },
        },
        any: {
            enter: (node, ctx) => {
                removeInternal(node, ctx, originalMapping);
            },
        },
    };
};
exports.RemoveXInternal = RemoveXInternal;
