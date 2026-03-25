"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoChannelTrailingSlash = void 0;
const NoChannelTrailingSlash = () => {
    return {
        Channel(channel, { report, location }) {
            if (channel.address.endsWith('/') && channel.address !== '/') {
                report({
                    message: `\`${channel.address}\` should not have a trailing slash.`,
                    location: location.key(),
                });
            }
        },
    };
};
exports.NoChannelTrailingSlash = NoChannelTrailingSlash;
