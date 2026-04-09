"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestBodyReplacementsUnique = void 0;
const RequestBodyReplacementsUnique = () => {
    const seenReplacements = new Set();
    return {
        Step: {
            leave() {
                seenReplacements.clear();
            },
            RequestBody: {
                enter(requestBody, { report, location }) {
                    if (!requestBody.replacements)
                        return;
                    for (const replacement of requestBody.replacements) {
                        if (seenReplacements.has(replacement.target)) {
                            report({
                                message: 'Every `replacement` in `requestBody` must be unique.',
                                location: location.child([
                                    'replacements',
                                    requestBody.replacements.indexOf(replacement),
                                    `target`,
                                ]),
                            });
                        }
                        seenReplacements.add(replacement.target);
                    }
                },
            },
        },
    };
};
exports.RequestBodyReplacementsUnique = RequestBodyReplacementsUnique;
