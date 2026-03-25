// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Name of the Agent Policy
 */
export const agentPolicyName = "agentPolicy";
/**
 * Gets a pipeline policy that sets http.agent
 */
export function agentPolicy(agent) {
    return {
        name: agentPolicyName,
        sendRequest: async (req, next) => {
            // Users may define an agent on the request, honor it over the client level one
            if (!req.agent) {
                req.agent = agent;
            }
            return next(req);
        },
    };
}
//# sourceMappingURL=agentPolicy.js.map