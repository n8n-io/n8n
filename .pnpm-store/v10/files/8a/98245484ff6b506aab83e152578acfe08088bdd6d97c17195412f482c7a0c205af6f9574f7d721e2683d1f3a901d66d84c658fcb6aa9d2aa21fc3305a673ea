"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectScope = exports.activeEffectScope = void 0;
exports.effectScope = effectScope;
const system_js_1 = require("./system.js");
exports.activeEffectScope = undefined;
function effectScope() {
    return new EffectScope();
}
class EffectScope {
    constructor() {
        // Subscriber
        this.deps = undefined;
        this.depsTail = undefined;
        this.trackId = -(++system_js_1.System.lastTrackId);
        this.dirtyLevel = 0 /* DirtyLevels.None */;
        this.canPropagate = false;
    }
    notify() {
        if (this.dirtyLevel !== 0 /* DirtyLevels.None */) {
            this.dirtyLevel = 0 /* DirtyLevels.None */;
            let link = this.deps;
            while (link !== undefined) {
                const dep = link.dep;
                if ('notify' in dep) {
                    dep.notify();
                }
                link = link.nextDep;
            }
        }
    }
    run(fn) {
        const prevSub = exports.activeEffectScope;
        exports.activeEffectScope = this;
        this.trackId = Math.abs(this.trackId);
        try {
            return fn();
        }
        finally {
            exports.activeEffectScope = prevSub;
            this.trackId = -Math.abs(this.trackId);
        }
    }
    stop() {
        if (this.deps !== undefined) {
            system_js_1.Subscriber.clearTrack(this.deps);
            this.deps = undefined;
            this.depsTail = undefined;
        }
        this.dirtyLevel = 0 /* DirtyLevels.None */;
    }
}
exports.EffectScope = EffectScope;
