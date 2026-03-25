"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseContainsProperty = void 0;
const utils_1 = require("../../utils");
const ResponseContainsProperty = (options) => {
    const names = options.names || {};
    let key;
    return {
        Operation: {
            Response: {
                skip: (_response, key) => {
                    return `${key}` === '204';
                },
                enter: (_response, ctx) => {
                    key = ctx.key;
                },
                Schema(schema, { report, location }) {
                    if (schema.type !== 'object')
                        return;
                    const expectedProperties = names[key] ||
                        names[(0, utils_1.getMatchingStatusCodeRange)(key)] ||
                        names[(0, utils_1.getMatchingStatusCodeRange)(key).toLowerCase()] ||
                        [];
                    for (const expectedProperty of expectedProperties) {
                        if (!schema.properties?.[expectedProperty]) {
                            report({
                                message: `Response object must contain a top-level "${expectedProperty}" property.`,
                                location: location.child('properties').key(),
                            });
                        }
                    }
                },
            },
        },
    };
};
exports.ResponseContainsProperty = ResponseContainsProperty;
