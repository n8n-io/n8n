"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecStrictRefs = void 0;
const ref_utils_1 = require("../../ref-utils");
const SpecStrictRefs = () => {
    const nodesToSkip = [
        'Schema',
        'Response',
        'Parameter',
        'RequestBody',
        'Example',
        'Header',
        'SecurityScheme',
        'Link',
        'Callback',
        'PathItem',
    ];
    return {
        any(_node, { report, rawNode, rawLocation, type }) {
            const shouldCheck = !nodesToSkip.includes(type.name);
            if (shouldCheck && (0, ref_utils_1.isRef)(rawNode)) {
                report({
                    message: 'Field $ref is not expected here.',
                    location: rawLocation.child('$ref').key(),
                });
            }
        },
    };
};
exports.SpecStrictRefs = SpecStrictRefs;
