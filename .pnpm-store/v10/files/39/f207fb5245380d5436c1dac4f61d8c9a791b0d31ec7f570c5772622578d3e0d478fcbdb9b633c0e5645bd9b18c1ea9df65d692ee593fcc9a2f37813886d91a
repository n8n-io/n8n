"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Standardization = void 0;
/**
 * Used to group the {@link StandardTags} definitions according to the level of support
 * expected from documentation tools that implement the standard.
 */
var Standardization;
(function (Standardization) {
    /**
     * TSDoc tags in the "Core" standardization group are considered essential.
     * Their meaning is standardized, and every documentation tool is expected
     * to recognize them.  The TSDoc parser library typically provides dedicated APIs
     * for accessing these tags.
     */
    Standardization["Core"] = "Core";
    /**
     * TSDoc tags in the "Extended" standardization group are optional.  Documentation tools
     * may or may not support them.  If they do, the syntax and semantics should conform to
     * the TSDoc standard definitions.
     */
    Standardization["Extended"] = "Extended";
    /**
     * TSDoc tags in the "Discretionary" standardization group are optional.  Although the
     * syntax is specified, the semantics for these tags are implementation-specific
     * (and sometimes difficult to describe completely without referring to a specific
     * implementation).  Discretionary tags are included in the TSDoc standard to ensure that
     * if two different popular tools use the same tag name, developers can expect the syntax
     * to be the same, and the semantics to be somewhat similar.
     */
    Standardization["Discretionary"] = "Discretionary";
    /**
     * The tag is not part of the TSDoc standard.  All used-defined tags are assigned to this group.
     */
    Standardization["None"] = "None";
})(Standardization || (exports.Standardization = Standardization = {}));
//# sourceMappingURL=Standardization.js.map