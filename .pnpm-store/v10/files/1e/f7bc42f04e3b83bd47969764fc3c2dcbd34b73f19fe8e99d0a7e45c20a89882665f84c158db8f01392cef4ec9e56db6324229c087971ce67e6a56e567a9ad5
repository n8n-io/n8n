"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomUserAgentHook = void 0;
const config_1 = require("../lib/config");
class CustomUserAgentHook {
    beforeRequest(_, request) {
        const version = config_1.SDK_METADATA.sdkVersion;
        const ua = `mistral-client-typescript/${version}`;
        request.headers.set("user-agent", ua);
        // In Chrome, the line above may silently fail. If the header was not set
        // we fallback to setting an alternate header.
        // Chromium bug: https://issues.chromium.org/issues/40450316
        if (!request.headers.get("user-agent")) {
            request.headers.set("x-mistral-user-agent", ua);
        }
        return request;
    }
}
exports.CustomUserAgentHook = CustomUserAgentHook;
//# sourceMappingURL=custom_user_agent.js.map