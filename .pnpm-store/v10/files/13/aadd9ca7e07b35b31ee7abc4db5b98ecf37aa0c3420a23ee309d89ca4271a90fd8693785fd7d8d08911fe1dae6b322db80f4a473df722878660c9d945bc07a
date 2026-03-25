"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initHooks = initHooks;
const custom_user_agent_1 = require("./custom_user_agent");
const deprecation_warning_1 = require("./deprecation_warning");
/*
 * This file is only ever generated once on the first generation and then is free to be modified.
 * Any hooks you wish to add should be registered in the initHooks function. Feel free to define them
 * in this file or in separate files in the hooks folder.
 */
function initHooks(hooks) {
    // Add hooks by calling hooks.register{ClientInit/BeforeCreateRequest/BeforeRequest/AfterSuccess/AfterError}Hook
    // with an instance of a hook that implements that specific Hook interface
    // Hooks are registered per SDK instance, and are valid for the lifetime of the SDK instance
    const customUserAgentHook = new custom_user_agent_1.CustomUserAgentHook();
    hooks.registerBeforeRequestHook(customUserAgentHook);
    const deprecationWarningHook = new deprecation_warning_1.DeprecationWarningHook();
    hooks.registerAfterSuccessHook(deprecationWarningHook);
}
//# sourceMappingURL=registration.js.map