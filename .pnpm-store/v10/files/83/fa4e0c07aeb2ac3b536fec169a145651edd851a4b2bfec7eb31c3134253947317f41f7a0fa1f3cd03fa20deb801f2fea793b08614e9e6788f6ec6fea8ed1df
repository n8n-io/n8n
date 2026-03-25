"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceDescriptionsNameUnique = void 0;
const SourceDescriptionsNameUnique = () => {
    const seenSourceDescriptions = new Set();
    return {
        SourceDescriptions: {
            enter(sourceDescriptions, { report, location }) {
                if (!sourceDescriptions.length)
                    return;
                for (const sourceDescription of sourceDescriptions) {
                    if (seenSourceDescriptions.has(sourceDescription.name)) {
                        report({
                            message: 'The `name` must be unique amongst all SourceDescriptions.',
                            location: location.child([sourceDescriptions.indexOf(sourceDescription)]),
                        });
                    }
                    seenSourceDescriptions.add(sourceDescription.name);
                }
            },
        },
    };
};
exports.SourceDescriptionsNameUnique = SourceDescriptionsNameUnique;
