"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelsKebabCase = void 0;
const ChannelsKebabCase = () => {
    return {
        Channel(_channel, { report, key }) {
            const segments = key
                .split(/[/.:]/) // split on / or : as likely channel namespacers
                .filter((s) => s !== ''); // filter out empty segments
            if (!segments.every((segment) => /^{.+}$/.test(segment) || /^[a-z0-9-.]+$/.test(segment))) {
                report({
                    message: `\`${key}\` does not use kebab-case.`,
                    location: { reportOnKey: true },
                });
            }
        },
    };
};
exports.ChannelsKebabCase = ChannelsKebabCase;
