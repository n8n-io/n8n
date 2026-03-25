"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlugins = getPlugins;
const default_1 = require("./plugins/default");
function getPlugins(options) {
    // don't load default errorResponsePlugin if user has specified their own
    const maybeErrorResponsePlugin = options.on?.error ? [] : [default_1.errorResponsePlugin];
    const defaultPlugins = options.ejectPlugins
        ? [] // no default plugins when ejecting
        : [default_1.debugProxyErrorsPlugin, default_1.proxyEventsPlugin, default_1.loggerPlugin, ...maybeErrorResponsePlugin];
    const userPlugins = options.plugins ?? [];
    return [...defaultPlugins, ...userPlugins];
}
