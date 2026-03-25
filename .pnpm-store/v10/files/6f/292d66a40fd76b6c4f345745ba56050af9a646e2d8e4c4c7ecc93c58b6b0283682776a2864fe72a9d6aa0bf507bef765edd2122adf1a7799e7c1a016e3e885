"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoChannelTrailingSlash = void 0;
const NoChannelTrailingSlash = () => {
    return {
        Channel(_channel, { report, key, location }) {
            if (key.endsWith('/') && key !== '/') {
                report({
                    message: `\`${key}\` should not have a trailing slash.`,
                    location: location.key(),
                });
            }
        },
    };
};
exports.NoChannelTrailingSlash = NoChannelTrailingSlash;
