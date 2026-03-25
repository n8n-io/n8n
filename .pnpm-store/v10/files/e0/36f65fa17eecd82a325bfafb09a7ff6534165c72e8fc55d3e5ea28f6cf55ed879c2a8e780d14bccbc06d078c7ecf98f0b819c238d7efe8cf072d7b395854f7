"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Computed = void 0;
exports.computed = computed;
const system_js_1 = require("./system.js");
function computed(getter) {
    return new Computed(getter);
}
class Computed {
    constructor(getter) {
        this.getter = getter;
        this.cachedValue = undefined;
        // Dependency
        this.subs = undefined;
        this.subsTail = undefined;
        // Subscriber
        this.deps = undefined;
        this.depsTail = undefined;
        this.trackId = 0;
        this.dirtyLevel = 3 /* DirtyLevels.Dirty */;
        this.canPropagate = false;
    }
    get() {
        let dirtyLevel = this.dirtyLevel;
        if (dirtyLevel === 2 /* DirtyLevels.MaybeDirty */) {
            system_js_1.Subscriber.resolveMaybeDirty(this);
            dirtyLevel = this.dirtyLevel;
        }
        if (dirtyLevel >= 3 /* DirtyLevels.Dirty */) {
            this.update();
        }
        const activeTrackId = system_js_1.System.activeTrackId;
        if (activeTrackId !== 0) {
            const subsTail = this.subsTail;
            if (subsTail === undefined || subsTail.trackId !== activeTrackId) {
                system_js_1.Dependency.link(this, system_js_1.System.activeSub);
            }
        }
        return this.cachedValue;
    }
    update() {
        const prevSub = system_js_1.Subscriber.startTrack(this);
        const oldValue = this.cachedValue;
        let newValue;
        try {
            newValue = this.getter(oldValue);
        }
        finally {
            system_js_1.Subscriber.endTrack(this, prevSub);
        }
        if (oldValue !== newValue) {
            this.cachedValue = newValue;
            const subs = this.subs;
            if (subs !== undefined) {
                system_js_1.Dependency.propagate(subs);
            }
        }
    }
}
exports.Computed = Computed;
