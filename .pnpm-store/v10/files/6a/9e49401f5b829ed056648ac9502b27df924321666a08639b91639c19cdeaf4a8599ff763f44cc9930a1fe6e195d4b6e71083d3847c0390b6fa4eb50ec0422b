"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoExampleValueAndExternalValue = void 0;
const NoExampleValueAndExternalValue = () => {
    return {
        Example(example, { report, location }) {
            if (example.value && example.externalValue) {
                report({
                    message: 'Example object can have either `value` or `externalValue` fields.',
                    location: location.child(['value']).key(),
                });
            }
        },
    };
};
exports.NoExampleValueAndExternalValue = NoExampleValueAndExternalValue;
