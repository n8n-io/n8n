"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoServerTrailingSlash = void 0;
const NoServerTrailingSlash = () => {
    return {
        Server(server, { report, location }) {
            if (!server.url)
                return;
            if (server.url.endsWith('/') && server.url !== '/') {
                report({
                    message: 'Server `url` should not have a trailing slash.',
                    location: location.child(['url']),
                });
            }
        },
    };
};
exports.NoServerTrailingSlash = NoServerTrailingSlash;
