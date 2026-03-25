"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.ClusterSlotStates = void 0;
var ClusterSlotStates;
(function (ClusterSlotStates) {
    ClusterSlotStates["IMPORTING"] = "IMPORTING";
    ClusterSlotStates["MIGRATING"] = "MIGRATING";
    ClusterSlotStates["STABLE"] = "STABLE";
    ClusterSlotStates["NODE"] = "NODE";
})(ClusterSlotStates || (exports.ClusterSlotStates = ClusterSlotStates = {}));
function transformArguments(slot, state, nodeId) {
    const args = ['CLUSTER', 'SETSLOT', slot.toString(), state];
    if (nodeId) {
        args.push(nodeId);
    }
    return args;
}
exports.transformArguments = transformArguments;
