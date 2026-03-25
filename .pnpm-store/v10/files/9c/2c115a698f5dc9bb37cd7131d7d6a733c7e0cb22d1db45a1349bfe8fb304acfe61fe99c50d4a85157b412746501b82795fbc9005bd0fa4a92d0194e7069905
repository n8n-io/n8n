"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceDescriptionType = void 0;
const SourceDescriptionType = () => {
    return {
        SourceDescriptions: {
            enter(sourceDescriptions, { report, location }) {
                if (!sourceDescriptions.length)
                    return;
                for (const sourceDescription of sourceDescriptions) {
                    if (!['openapi', 'arazzo'].includes(sourceDescription?.type)) {
                        report({
                            message: 'The `type` property of the `sourceDescription` object must be either `openapi` or `arazzo`.',
                            location: location.child([sourceDescriptions.indexOf(sourceDescription)]),
                        });
                    }
                }
            },
        },
    };
};
exports.SourceDescriptionType = SourceDescriptionType;
