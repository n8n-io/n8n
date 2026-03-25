"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipTypeZodSchema = exports.MembershipTypes = void 0;
const zod_1 = require("zod");
/**
 * Enum expressing the users relationship to the current channel.
 */
var MembershipTypes;
(function (MembershipTypes) {
    /**
     * The user is a direct member of a channel.
     */
    MembershipTypes["Direct"] = "direct";
    /**
     * The user is a member of a channel through a group.
     */
    MembershipTypes["Transitive"] = "transitive";
})(MembershipTypes || (exports.MembershipTypes = MembershipTypes = {}));
/**
 * Zod schema for validating membership source types.
 */
exports.membershipTypeZodSchema = zod_1.z.enum(['direct', 'transitive']);
//# sourceMappingURL=membershipTypes.js.map