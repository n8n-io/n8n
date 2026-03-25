"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullPolicy = void 0;
class DefaultPullPolicy {
    shouldPull() {
        return false;
    }
}
class AlwaysPullPolicy {
    shouldPull() {
        return true;
    }
}
class PullPolicy {
    static defaultPolicy() {
        return new DefaultPullPolicy();
    }
    static alwaysPull() {
        return new AlwaysPullPolicy();
    }
}
exports.PullPolicy = PullPolicy;
//# sourceMappingURL=pull-policy.js.map