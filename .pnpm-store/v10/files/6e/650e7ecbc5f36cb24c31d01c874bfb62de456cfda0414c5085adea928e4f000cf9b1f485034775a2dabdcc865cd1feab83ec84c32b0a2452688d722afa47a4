"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationTagDefined = void 0;
const OperationTagDefined = () => {
    let definedTags;
    return {
        Root(root) {
            definedTags = new Set((root.tags ?? []).map((t) => t.name));
        },
        Operation(operation, { report, location }) {
            if (operation.tags) {
                for (let i = 0; i < operation.tags.length; i++) {
                    if (!definedTags.has(operation.tags[i])) {
                        report({
                            message: `Operation tags should be defined in global tags.`,
                            location: location.child(['tags', i]),
                        });
                    }
                }
            }
        },
    };
};
exports.OperationTagDefined = OperationTagDefined;
