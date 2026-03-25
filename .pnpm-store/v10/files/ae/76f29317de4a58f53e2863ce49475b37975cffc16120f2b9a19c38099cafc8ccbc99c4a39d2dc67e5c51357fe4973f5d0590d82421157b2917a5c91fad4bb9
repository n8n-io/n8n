// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getUserAgentHeaderName, getUserAgentValue } from "../util/userAgent";
const UserAgentHeaderName = getUserAgentHeaderName();
/**
 * The programmatic identifier of the userAgentPolicy.
 */
export const userAgentPolicyName = "userAgentPolicy";
/**
 * A policy that sets the User-Agent header (or equivalent) to reflect
 * the library version.
 * @param options - Options to customize the user agent value.
 */
export function userAgentPolicy(options = {}) {
    const userAgentValue = getUserAgentValue(options.userAgentPrefix);
    return {
        name: userAgentPolicyName,
        async sendRequest(request, next) {
            if (!request.headers.has(UserAgentHeaderName)) {
                request.headers.set(UserAgentHeaderName, userAgentValue);
            }
            return next(request);
        },
    };
}
//# sourceMappingURL=userAgentPolicy.js.map