"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscriber = exports.Dependency = exports.Link = exports.System = void 0;
exports.startBatch = startBatch;
exports.endBatch = endBatch;
var System;
(function (System) {
    System.activeSub = undefined;
    System.activeTrackId = 0;
    System.batchDepth = 0;
    System.lastTrackId = 0;
    System.queuedEffects = undefined;
    System.queuedEffectsTail = undefined;
})(System || (exports.System = System = {}));
function startBatch() {
    System.batchDepth++;
}
function endBatch() {
    System.batchDepth--;
    if (System.batchDepth === 0) {
        while (System.queuedEffects !== undefined) {
            const effect = System.queuedEffects;
            const queuedNext = System.queuedEffects.nextNotify;
            if (queuedNext !== undefined) {
                System.queuedEffects.nextNotify = undefined;
                System.queuedEffects = queuedNext;
            }
            else {
                System.queuedEffects = undefined;
                System.queuedEffectsTail = undefined;
            }
            effect.notify();
        }
    }
}
var Link;
(function (Link) {
    let pool = undefined;
    function get(dep, sub, nextDep) {
        if (pool !== undefined) {
            const newLink = pool;
            pool = newLink.nextDep;
            newLink.nextDep = nextDep;
            newLink.dep = dep;
            newLink.sub = sub;
            newLink.trackId = sub.trackId;
            return newLink;
        }
        else {
            return {
                dep,
                sub,
                trackId: sub.trackId,
                nextDep: nextDep,
                prevSub: undefined,
                nextSub: undefined,
            };
        }
    }
    Link.get = get;
    function release(link) {
        const dep = link.dep;
        const nextSub = link.nextSub;
        const prevSub = link.prevSub;
        if (nextSub !== undefined) {
            nextSub.prevSub = prevSub;
        }
        if (prevSub !== undefined) {
            prevSub.nextSub = nextSub;
        }
        if (nextSub === undefined) {
            dep.subsTail = prevSub;
        }
        if (prevSub === undefined) {
            dep.subs = nextSub;
        }
        // @ts-expect-error
        link.dep = undefined;
        // @ts-expect-error
        link.sub = undefined;
        link.prevSub = undefined;
        link.nextSub = undefined;
        link.nextDep = pool;
        pool = link;
    }
    Link.release = release;
})(Link || (exports.Link = Link = {}));
var Dependency;
(function (Dependency) {
    const system = System;
    /**
     * @deprecated Use `startTrack` instead.
     */
    function linkSubscriber(dep, sub) {
        return link(dep, sub);
    }
    Dependency.linkSubscriber = linkSubscriber;
    function link(dep, sub) {
        const depsTail = sub.depsTail;
        const old = depsTail !== undefined
            ? depsTail.nextDep
            : sub.deps;
        if (old === undefined || old.dep !== dep) {
            const newLink = Link.get(dep, sub, old);
            if (depsTail === undefined) {
                sub.deps = newLink;
            }
            else {
                depsTail.nextDep = newLink;
            }
            if (dep.subs === undefined) {
                dep.subs = newLink;
            }
            else {
                const oldTail = dep.subsTail;
                newLink.prevSub = oldTail;
                oldTail.nextSub = newLink;
            }
            sub.depsTail = newLink;
            dep.subsTail = newLink;
        }
        else {
            old.trackId = sub.trackId;
            sub.depsTail = old;
        }
    }
    Dependency.link = link;
    function propagate(subs) {
        let link = subs;
        let dep = subs.dep;
        let dirtyLevel = 3 /* DirtyLevels.Dirty */;
        let remainingQuantity = 0;
        do {
            if (link !== undefined) {
                const sub = link.sub;
                const subTrackId = sub.trackId;
                if (subTrackId > 0) {
                    if (subTrackId === link.trackId) {
                        const subDirtyLevel = sub.dirtyLevel;
                        if (subDirtyLevel < dirtyLevel) {
                            sub.dirtyLevel = dirtyLevel;
                            if (subDirtyLevel === 0 /* DirtyLevels.None */) {
                                sub.canPropagate = true;
                                if ('subs' in sub && sub.subs !== undefined) {
                                    sub.depsTail.nextDep = link;
                                    dep = sub;
                                    link = sub.subs;
                                    if ('notify' in sub) {
                                        dirtyLevel = 1 /* DirtyLevels.SideEffectsOnly */;
                                    }
                                    else {
                                        dirtyLevel = 2 /* DirtyLevels.MaybeDirty */;
                                    }
                                    remainingQuantity++;
                                    continue;
                                }
                            }
                        }
                    }
                }
                else if (subTrackId === -link.trackId) {
                    const subDirtyLevel = sub.dirtyLevel;
                    const notDirty = subDirtyLevel === 0 /* DirtyLevels.None */;
                    if (subDirtyLevel < dirtyLevel) {
                        sub.dirtyLevel = dirtyLevel;
                    }
                    if (notDirty || sub.canPropagate) {
                        if (!notDirty) {
                            sub.canPropagate = false;
                        }
                        if ('subs' in sub && sub.subs !== undefined) {
                            sub.depsTail.nextDep = link;
                            dep = sub;
                            link = sub.subs;
                            if ('notify' in sub) {
                                dirtyLevel = 1 /* DirtyLevels.SideEffectsOnly */;
                            }
                            else {
                                dirtyLevel = 2 /* DirtyLevels.MaybeDirty */;
                            }
                            remainingQuantity++;
                            continue;
                        }
                        else if ('notify' in sub) {
                            const queuedEffectsTail = system.queuedEffectsTail;
                            if (queuedEffectsTail !== undefined) {
                                queuedEffectsTail.nextNotify = sub;
                            }
                            else {
                                system.queuedEffects = sub;
                            }
                            system.queuedEffectsTail = sub;
                        }
                    }
                }
                link = link.nextSub;
                continue;
            }
            if (remainingQuantity !== 0) {
                const depsTail = dep.depsTail;
                const prevLink = depsTail.nextDep;
                const prevSub = prevLink.sub;
                depsTail.nextDep = undefined;
                dep = prevLink.dep;
                link = prevLink.nextSub;
                remainingQuantity--;
                if (remainingQuantity === 0) {
                    dirtyLevel = 3 /* DirtyLevels.Dirty */;
                }
                else if ('notify' in dep) {
                    dirtyLevel = 1 /* DirtyLevels.SideEffectsOnly */;
                }
                else {
                    dirtyLevel = 2 /* DirtyLevels.MaybeDirty */;
                }
                if ('notify' in prevSub) {
                    const queuedEffectsTail = system.queuedEffectsTail;
                    if (queuedEffectsTail !== undefined) {
                        queuedEffectsTail.nextNotify = prevSub;
                    }
                    else {
                        system.queuedEffects = prevSub;
                    }
                    system.queuedEffectsTail = prevSub;
                }
                continue;
            }
            break;
        } while (true);
    }
    Dependency.propagate = propagate;
})(Dependency || (exports.Dependency = Dependency = {}));
var Subscriber;
(function (Subscriber) {
    const system = System;
    function resolveMaybeDirty(sub, depth = 0) {
        let link = sub.deps;
        while (link !== undefined) {
            const dep = link.dep;
            if ('update' in dep) {
                let dirtyLevel = dep.dirtyLevel;
                if (dirtyLevel === 2 /* DirtyLevels.MaybeDirty */) {
                    if (depth >= 4) {
                        resolveMaybeDirtyNonRecursive(dep);
                    }
                    else {
                        resolveMaybeDirty(dep, depth + 1);
                    }
                    dirtyLevel = dep.dirtyLevel;
                }
                if (dirtyLevel === 3 /* DirtyLevels.Dirty */) {
                    dep.update();
                    if (sub.dirtyLevel === 3 /* DirtyLevels.Dirty */) {
                        break;
                    }
                }
            }
            link = link.nextDep;
        }
        if (sub.dirtyLevel === 2 /* DirtyLevels.MaybeDirty */) {
            sub.dirtyLevel = 0 /* DirtyLevels.None */;
        }
    }
    Subscriber.resolveMaybeDirty = resolveMaybeDirty;
    function resolveMaybeDirtyNonRecursive(sub) {
        let link = sub.deps;
        let remaining = 0;
        do {
            if (link !== undefined) {
                const dep = link.dep;
                if ('update' in dep) {
                    const depDirtyLevel = dep.dirtyLevel;
                    if (depDirtyLevel === 2 /* DirtyLevels.MaybeDirty */) {
                        dep.subs.prevSub = link;
                        sub = dep;
                        link = dep.deps;
                        remaining++;
                        continue;
                    }
                    else if (depDirtyLevel === 3 /* DirtyLevels.Dirty */) {
                        dep.update();
                        if (sub.dirtyLevel === 3 /* DirtyLevels.Dirty */) {
                            if (remaining !== 0) {
                                const subSubs = sub.subs;
                                const prevLink = subSubs.prevSub;
                                sub.update();
                                subSubs.prevSub = undefined;
                                sub = prevLink.sub;
                                link = prevLink.nextDep;
                                remaining--;
                                continue;
                            }
                            break;
                        }
                    }
                }
                link = link.nextDep;
                continue;
            }
            const dirtyLevel = sub.dirtyLevel;
            if (dirtyLevel === 2 /* DirtyLevels.MaybeDirty */) {
                sub.dirtyLevel = 0 /* DirtyLevels.None */;
                if (remaining !== 0) {
                    const subSubs = sub.subs;
                    const prevLink = subSubs.prevSub;
                    subSubs.prevSub = undefined;
                    sub = prevLink.sub;
                    link = prevLink.nextDep;
                    remaining--;
                    continue;
                }
            }
            else if (remaining !== 0) {
                if (dirtyLevel === 3 /* DirtyLevels.Dirty */) {
                    sub.update();
                }
                const subSubs = sub.subs;
                const prevLink = subSubs.prevSub;
                subSubs.prevSub = undefined;
                sub = prevLink.sub;
                link = prevLink.nextDep;
                remaining--;
                continue;
            }
            break;
        } while (true);
    }
    Subscriber.resolveMaybeDirtyNonRecursive = resolveMaybeDirtyNonRecursive;
    /**
     * @deprecated Use `startTrack` instead.
     */
    function startTrackDependencies(sub) {
        return startTrack(sub);
    }
    Subscriber.startTrackDependencies = startTrackDependencies;
    /**
     * @deprecated Use `endTrack` instead.
     */
    function endTrackDependencies(sub, prevSub) {
        return endTrack(sub, prevSub);
    }
    Subscriber.endTrackDependencies = endTrackDependencies;
    function startTrack(sub) {
        const newTrackId = system.lastTrackId + 1;
        const prevSub = system.activeSub;
        system.activeSub = sub;
        system.activeTrackId = newTrackId;
        system.lastTrackId = newTrackId;
        sub.depsTail = undefined;
        sub.trackId = newTrackId;
        sub.dirtyLevel = 0 /* DirtyLevels.None */;
        return prevSub;
    }
    Subscriber.startTrack = startTrack;
    function endTrack(sub, prevSub) {
        if (prevSub !== undefined) {
            system.activeSub = prevSub;
            system.activeTrackId = prevSub.trackId;
        }
        else {
            system.activeSub = undefined;
            system.activeTrackId = 0;
        }
        const depsTail = sub.depsTail;
        if (depsTail !== undefined) {
            if (depsTail.nextDep !== undefined) {
                clearTrack(depsTail.nextDep);
                depsTail.nextDep = undefined;
            }
        }
        else if (sub.deps !== undefined) {
            clearTrack(sub.deps);
            sub.deps = undefined;
        }
        sub.trackId = -sub.trackId;
    }
    Subscriber.endTrack = endTrack;
    function clearTrack(link) {
        do {
            const dep = link.dep;
            const nextDep = link.nextDep;
            Link.release(link);
            if (dep.subs === undefined && 'deps' in dep) {
                if ('notify' in dep) {
                    dep.dirtyLevel = 0 /* DirtyLevels.None */;
                }
                else {
                    dep.dirtyLevel = 3 /* DirtyLevels.Dirty */;
                }
                if (dep.deps !== undefined) {
                    link = dep.deps;
                    dep.depsTail.nextDep = nextDep;
                    dep.deps = undefined;
                    dep.depsTail = undefined;
                    continue;
                }
            }
            link = nextDep;
        } while (link !== undefined);
    }
    Subscriber.clearTrack = clearTrack;
})(Subscriber || (exports.Subscriber = Subscriber = {}));
