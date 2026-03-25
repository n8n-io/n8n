"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipSourceTypeZodSchema = exports.MembershipSourceTypes = void 0;
const zod_1 = require("zod");
/**
 * Enum defining the type of roster the user is a member of.
 */
var MembershipSourceTypes;
(function (MembershipSourceTypes) {
    /**
     * The source is that of a channel and the user is a member of that channel.
     */
    MembershipSourceTypes["Channel"] = "channel";
    /**
     * The source is that of a team and the user is a member of that team.
     */
    MembershipSourceTypes["Team"] = "team";
})(MembershipSourceTypes || (exports.MembershipSourceTypes = MembershipSourceTypes = {}));
/**
 * Zod schema for validating membership source types.
 */
exports.membershipSourceTypeZodSchema = zod_1.z.enum(['channel', 'team']);
//# sourceMappingURL=membershipSourceTypes.js.map