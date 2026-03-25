"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParameterDescription = void 0;
const ParameterDescription = () => {
    return {
        Parameter(parameter, { report, location }) {
            if (parameter.description === undefined) {
                report({
                    message: 'Parameter object description must be present.',
                    location: { reportOnKey: true },
                });
            }
            else if (!parameter.description) {
                report({
                    message: 'Parameter object description must be non-empty string.',
                    location: location.child(['description']),
                });
            }
        },
    };
};
exports.ParameterDescription = ParameterDescription;
