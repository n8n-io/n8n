"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentPolicyName = void 0;
exports.agentPolicy = agentPolicy;
/**
 * Name of the Agent Policy
 */
exports.agentPolicyName = "agentPolicy";
/**
 * Gets a pipeline policy that sets http.agent
 */
function agentPolicy(agent) {
    return {
        name: exports.agentPolicyName,
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