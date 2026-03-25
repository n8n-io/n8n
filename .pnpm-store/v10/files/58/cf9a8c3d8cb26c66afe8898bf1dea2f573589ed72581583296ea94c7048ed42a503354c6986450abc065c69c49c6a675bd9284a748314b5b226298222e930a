"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceDescriptionsNotEmpty = void 0;
const SourceDescriptionsNotEmpty = () => {
    return {
        SourceDescriptions: {
            enter(sourceDescriptions, { report, location }) {
                if (!sourceDescriptions?.length) {
                    report({
                        message: 'The `sourceDescriptions` list must have at least one entry.',
                        location,
                    });
                }
            },
        },
    };
};
exports.SourceDescriptionsNotEmpty = SourceDescriptionsNotEmpty;
