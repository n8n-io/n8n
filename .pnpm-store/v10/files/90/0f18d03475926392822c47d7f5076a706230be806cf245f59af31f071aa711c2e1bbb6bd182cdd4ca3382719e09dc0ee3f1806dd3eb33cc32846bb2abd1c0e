"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitorState = void 0;
/**
 * Keeps track of a directed graph traversal that needs to detect cycles.
 */
var VisitorState;
(function (VisitorState) {
    /**
     * We have not visited the node yet.
     */
    VisitorState[VisitorState["Unvisited"] = 0] = "Unvisited";
    /**
     * We have visited the node, but have not finished traversing its references yet.
     * If we reach a node that is already in the `Visiting` state, this means we have
     * encountered a cyclic reference.
     */
    VisitorState[VisitorState["Visiting"] = 1] = "Visiting";
    /**
     * We are finished vising the node and all its references.
     */
    VisitorState[VisitorState["Visited"] = 2] = "Visited";
})(VisitorState || (exports.VisitorState = VisitorState = {}));
//# sourceMappingURL=VisitorState.js.map