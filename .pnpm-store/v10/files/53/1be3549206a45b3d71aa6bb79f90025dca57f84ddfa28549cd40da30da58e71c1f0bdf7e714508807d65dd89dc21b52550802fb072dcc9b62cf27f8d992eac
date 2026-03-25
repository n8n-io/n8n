"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FailoverModes = void 0;
var FailoverModes;
(function (FailoverModes) {
    FailoverModes["FORCE"] = "FORCE";
    FailoverModes["TAKEOVER"] = "TAKEOVER";
})(FailoverModes || (exports.FailoverModes = FailoverModes = {}));
function transformArguments(mode) {
    const args = ['CLUSTER', 'FAILOVER'];
    if (mode) {
        args.push(mode);
    }
    return args;
}
exports.transformArguments = transformArguments;
