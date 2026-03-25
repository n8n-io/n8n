"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationParametersUnique = void 0;
const OperationParametersUnique = () => {
    let seenPathParams;
    let seenOperationParams;
    return {
        PathItem: {
            enter() {
                seenPathParams = new Set();
            },
            Parameter(parameter, { report, key, parentLocations }) {
                const paramId = `${parameter.in}___${parameter.name}`;
                if (seenPathParams.has(paramId)) {
                    report({
                        message: `Paths must have unique \`name\` + \`in\` parameters.\nRepeats of \`in:${parameter.in}\` + \`name:${parameter.name}\`.`,
                        location: parentLocations.PathItem.child(['parameters', key]),
                    });
                }
                seenPathParams.add(`${parameter.in}___${parameter.name}`);
            },
            Operation: {
                enter() {
                    seenOperationParams = new Set();
                },
                Parameter(parameter, { report, key, parentLocations }) {
                    const paramId = `${parameter.in}___${parameter.name}`;
                    if (seenOperationParams.has(paramId)) {
                        report({
                            message: `Operations must have unique \`name\` + \`in\` parameters. Repeats of \`in:${parameter.in}\` + \`name:${parameter.name}\`.`,
                            location: parentLocations.Operation.child(['parameters', key]),
                        });
                    }
                    seenOperationParams.add(paramId);
                },
            },
        },
    };
};
exports.OperationParametersUnique = OperationParametersUnique;
