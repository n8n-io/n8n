"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationSingularTag = void 0;
const OperationSingularTag = () => {
    return {
        Operation(operation, { report, location }) {
            if (operation.tags && operation.tags.length > 1) {
                report({
                    message: 'Operation `tags` object should have only one tag.',
                    location: location.child(['tags']).key(),
                });
            }
        },
    };
};
exports.OperationSingularTag = OperationSingularTag;
