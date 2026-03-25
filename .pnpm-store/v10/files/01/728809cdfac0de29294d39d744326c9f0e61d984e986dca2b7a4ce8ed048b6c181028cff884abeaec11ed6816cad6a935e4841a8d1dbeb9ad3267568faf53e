"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Effect = void 0;
exports.effect = effect;
const effectScope_js_1 = require("./effectScope.js");
const system_js_1 = require("./system.js");
function effect(fn) {
    const e = new Effect(fn);
    e.run();
    return e;
}
class Effect {
    constructor(fn) {
        this.fn = fn;
        this.nextNotify = undefined;
        // Dependency
        this.subs = undefined;
        this.subsTail = undefined;
        // Subscriber
        this.deps = undefined;
        this.depsTail = undefined;
        this.trackId = 0;
        this.dirtyLevel = 3 /* DirtyLevels.Dirty */;
        this.canPropagate = false;
        const activeTrackId = system_js_1.System.activeTrackId;
        if (activeTrackId !== 0) {
            system_js_1.Dependency.link(this, system_js_1.System.activeSub);
            return;
        }
        if (effectScope_js_1.activeEffectScope !== undefined) {
            const subsTail = this.subsTail;
            if (subsTail === undefined || subsTail.trackId !== effectScope_js_1.activeEffectScope.trackId) {
                system_js_1.Dependency.link(this, effectScope_js_1.activeEffectScope);
            }
        }
    }
    notify() {
        let dirtyLevel = this.dirtyLevel;
        if (dirtyLevel > 0 /* DirtyLevels.None */) {
            if (dirtyLevel === 2 /* DirtyLevels.MaybeDirty */) {
                system_js_1.Subscriber.resolveMaybeDirty(this);
                dirtyLevel = this.dirtyLevel;
            }
            if (dirtyLevel === 3 /* DirtyLevels.Dirty */) {
                this.run();
            }
            else {
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
    }
    run() {
        const prevSub = system_js_1.Subscriber.startTrack(this);
        try {
            return this.fn();
        }
        finally {
            system_js_1.Subscriber.endTrack(this, prevSub);
        }
    }
    stop() {
        if (this.deps !== undefined) {
            system_js_1.Subscriber.clearTrack(this.deps);
            this.deps = undefined;
            this.depsTail = undefined;
        }
        this.dirtyLevel = 3 /* DirtyLevels.Dirty */;
    }
}
exports.Effect = Effect;
