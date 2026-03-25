var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/system.ts
var DirtyLevels = /* @__PURE__ */ ((DirtyLevels2) => {
  DirtyLevels2[DirtyLevels2["None"] = 0] = "None";
  DirtyLevels2[DirtyLevels2["SideEffectsOnly"] = 1] = "SideEffectsOnly";
  DirtyLevels2[DirtyLevels2["MaybeDirty"] = 2] = "MaybeDirty";
  DirtyLevels2[DirtyLevels2["Dirty"] = 3] = "Dirty";
  return DirtyLevels2;
})(DirtyLevels || {});
var System;
((System2) => {
  System2.activeSub = void 0;
  System2.activeTrackId = 0;
  System2.batchDepth = 0;
  System2.lastTrackId = 0;
  System2.queuedEffects = void 0;
  System2.queuedEffectsTail = void 0;
})(System || (System = {}));
function startBatch() {
  System.batchDepth++;
}
function endBatch() {
  System.batchDepth--;
  if (System.batchDepth === 0) {
    while (System.queuedEffects !== void 0) {
      const effect2 = System.queuedEffects;
      const queuedNext = System.queuedEffects.nextNotify;
      if (queuedNext !== void 0) {
        System.queuedEffects.nextNotify = void 0;
        System.queuedEffects = queuedNext;
      } else {
        System.queuedEffects = void 0;
        System.queuedEffectsTail = void 0;
      }
      effect2.notify();
    }
  }
}
var Link;
((Link6) => {
  let pool = void 0;
  function get(dep, sub, nextDep) {
    if (pool !== void 0) {
      const newLink = pool;
      pool = newLink.nextDep;
      newLink.nextDep = nextDep;
      newLink.dep = dep;
      newLink.sub = sub;
      newLink.trackId = sub.trackId;
      return newLink;
    } else {
      return {
        dep,
        sub,
        trackId: sub.trackId,
        nextDep,
        prevSub: void 0,
        nextSub: void 0
      };
    }
  }
  Link6.get = get;
  function release(link) {
    const dep = link.dep;
    const nextSub = link.nextSub;
    const prevSub = link.prevSub;
    if (nextSub !== void 0) {
      nextSub.prevSub = prevSub;
    }
    if (prevSub !== void 0) {
      prevSub.nextSub = nextSub;
    }
    if (nextSub === void 0) {
      dep.subsTail = prevSub;
    }
    if (prevSub === void 0) {
      dep.subs = nextSub;
    }
    link.dep = void 0;
    link.sub = void 0;
    link.prevSub = void 0;
    link.nextSub = void 0;
    link.nextDep = pool;
    pool = link;
  }
  Link6.release = release;
})(Link || (Link = {}));
var Dependency;
((Dependency2) => {
  const system = System;
  function linkSubscriber(dep, sub) {
    return link(dep, sub);
  }
  Dependency2.linkSubscriber = linkSubscriber;
  function link(dep, sub) {
    const depsTail = sub.depsTail;
    const old = depsTail !== void 0 ? depsTail.nextDep : sub.deps;
    if (old === void 0 || old.dep !== dep) {
      const newLink = Link.get(dep, sub, old);
      if (depsTail === void 0) {
        sub.deps = newLink;
      } else {
        depsTail.nextDep = newLink;
      }
      if (dep.subs === void 0) {
        dep.subs = newLink;
      } else {
        const oldTail = dep.subsTail;
        newLink.prevSub = oldTail;
        oldTail.nextSub = newLink;
      }
      sub.depsTail = newLink;
      dep.subsTail = newLink;
    } else {
      old.trackId = sub.trackId;
      sub.depsTail = old;
    }
  }
  Dependency2.link = link;
  function propagate(subs) {
    let link2 = subs;
    let dep = subs.dep;
    let dirtyLevel = 3 /* Dirty */;
    let remainingQuantity = 0;
    do {
      if (link2 !== void 0) {
        const sub = link2.sub;
        const subTrackId = sub.trackId;
        if (subTrackId > 0) {
          if (subTrackId === link2.trackId) {
            const subDirtyLevel = sub.dirtyLevel;
            if (subDirtyLevel < dirtyLevel) {
              sub.dirtyLevel = dirtyLevel;
              if (subDirtyLevel === 0 /* None */) {
                sub.canPropagate = true;
                if ("subs" in sub && sub.subs !== void 0) {
                  sub.depsTail.nextDep = link2;
                  dep = sub;
                  link2 = sub.subs;
                  if ("notify" in sub) {
                    dirtyLevel = 1 /* SideEffectsOnly */;
                  } else {
                    dirtyLevel = 2 /* MaybeDirty */;
                  }
                  remainingQuantity++;
                  continue;
                }
              }
            }
          }
        } else if (subTrackId === -link2.trackId) {
          const subDirtyLevel = sub.dirtyLevel;
          const notDirty = subDirtyLevel === 0 /* None */;
          if (subDirtyLevel < dirtyLevel) {
            sub.dirtyLevel = dirtyLevel;
          }
          if (notDirty || sub.canPropagate) {
            if (!notDirty) {
              sub.canPropagate = false;
            }
            if ("subs" in sub && sub.subs !== void 0) {
              sub.depsTail.nextDep = link2;
              dep = sub;
              link2 = sub.subs;
              if ("notify" in sub) {
                dirtyLevel = 1 /* SideEffectsOnly */;
              } else {
                dirtyLevel = 2 /* MaybeDirty */;
              }
              remainingQuantity++;
              continue;
            } else if ("notify" in sub) {
              const queuedEffectsTail = system.queuedEffectsTail;
              if (queuedEffectsTail !== void 0) {
                queuedEffectsTail.nextNotify = sub;
              } else {
                system.queuedEffects = sub;
              }
              system.queuedEffectsTail = sub;
            }
          }
        }
        link2 = link2.nextSub;
        continue;
      }
      if (remainingQuantity !== 0) {
        const depsTail = dep.depsTail;
        const prevLink = depsTail.nextDep;
        const prevSub = prevLink.sub;
        depsTail.nextDep = void 0;
        dep = prevLink.dep;
        link2 = prevLink.nextSub;
        remainingQuantity--;
        if (remainingQuantity === 0) {
          dirtyLevel = 3 /* Dirty */;
        } else if ("notify" in dep) {
          dirtyLevel = 1 /* SideEffectsOnly */;
        } else {
          dirtyLevel = 2 /* MaybeDirty */;
        }
        if ("notify" in prevSub) {
          const queuedEffectsTail = system.queuedEffectsTail;
          if (queuedEffectsTail !== void 0) {
            queuedEffectsTail.nextNotify = prevSub;
          } else {
            system.queuedEffects = prevSub;
          }
          system.queuedEffectsTail = prevSub;
        }
        continue;
      }
      break;
    } while (true);
  }
  Dependency2.propagate = propagate;
})(Dependency || (Dependency = {}));
var Subscriber;
((Subscriber2) => {
  const system = System;
  function resolveMaybeDirty(sub, depth = 0) {
    let link = sub.deps;
    while (link !== void 0) {
      const dep = link.dep;
      if ("update" in dep) {
        let dirtyLevel = dep.dirtyLevel;
        if (dirtyLevel === 2 /* MaybeDirty */) {
          if (depth >= 4) {
            resolveMaybeDirtyNonRecursive(dep);
          } else {
            resolveMaybeDirty(dep, depth + 1);
          }
          dirtyLevel = dep.dirtyLevel;
        }
        if (dirtyLevel === 3 /* Dirty */) {
          dep.update();
          if (sub.dirtyLevel === 3 /* Dirty */) {
            break;
          }
        }
      }
      link = link.nextDep;
    }
    if (sub.dirtyLevel === 2 /* MaybeDirty */) {
      sub.dirtyLevel = 0 /* None */;
    }
  }
  Subscriber2.resolveMaybeDirty = resolveMaybeDirty;
  function resolveMaybeDirtyNonRecursive(sub) {
    let link = sub.deps;
    let remaining = 0;
    do {
      if (link !== void 0) {
        const dep = link.dep;
        if ("update" in dep) {
          const depDirtyLevel = dep.dirtyLevel;
          if (depDirtyLevel === 2 /* MaybeDirty */) {
            dep.subs.prevSub = link;
            sub = dep;
            link = dep.deps;
            remaining++;
            continue;
          } else if (depDirtyLevel === 3 /* Dirty */) {
            dep.update();
            if (sub.dirtyLevel === 3 /* Dirty */) {
              if (remaining !== 0) {
                const subSubs = sub.subs;
                const prevLink = subSubs.prevSub;
                sub.update();
                subSubs.prevSub = void 0;
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
      if (dirtyLevel === 2 /* MaybeDirty */) {
        sub.dirtyLevel = 0 /* None */;
        if (remaining !== 0) {
          const subSubs = sub.subs;
          const prevLink = subSubs.prevSub;
          subSubs.prevSub = void 0;
          sub = prevLink.sub;
          link = prevLink.nextDep;
          remaining--;
          continue;
        }
      } else if (remaining !== 0) {
        if (dirtyLevel === 3 /* Dirty */) {
          sub.update();
        }
        const subSubs = sub.subs;
        const prevLink = subSubs.prevSub;
        subSubs.prevSub = void 0;
        sub = prevLink.sub;
        link = prevLink.nextDep;
        remaining--;
        continue;
      }
      break;
    } while (true);
  }
  Subscriber2.resolveMaybeDirtyNonRecursive = resolveMaybeDirtyNonRecursive;
  function startTrackDependencies(sub) {
    return startTrack(sub);
  }
  Subscriber2.startTrackDependencies = startTrackDependencies;
  function endTrackDependencies(sub, prevSub) {
    return endTrack(sub, prevSub);
  }
  Subscriber2.endTrackDependencies = endTrackDependencies;
  function startTrack(sub) {
    const newTrackId = system.lastTrackId + 1;
    const prevSub = system.activeSub;
    system.activeSub = sub;
    system.activeTrackId = newTrackId;
    system.lastTrackId = newTrackId;
    sub.depsTail = void 0;
    sub.trackId = newTrackId;
    sub.dirtyLevel = 0 /* None */;
    return prevSub;
  }
  Subscriber2.startTrack = startTrack;
  function endTrack(sub, prevSub) {
    if (prevSub !== void 0) {
      system.activeSub = prevSub;
      system.activeTrackId = prevSub.trackId;
    } else {
      system.activeSub = void 0;
      system.activeTrackId = 0;
    }
    const depsTail = sub.depsTail;
    if (depsTail !== void 0) {
      if (depsTail.nextDep !== void 0) {
        clearTrack(depsTail.nextDep);
        depsTail.nextDep = void 0;
      }
    } else if (sub.deps !== void 0) {
      clearTrack(sub.deps);
      sub.deps = void 0;
    }
    sub.trackId = -sub.trackId;
  }
  Subscriber2.endTrack = endTrack;
  function clearTrack(link) {
    do {
      const dep = link.dep;
      const nextDep = link.nextDep;
      Link.release(link);
      if (dep.subs === void 0 && "deps" in dep) {
        if ("notify" in dep) {
          dep.dirtyLevel = 0 /* None */;
        } else {
          dep.dirtyLevel = 3 /* Dirty */;
        }
        if (dep.deps !== void 0) {
          link = dep.deps;
          dep.depsTail.nextDep = nextDep;
          dep.deps = void 0;
          dep.depsTail = void 0;
          continue;
        }
      }
      link = nextDep;
    } while (link !== void 0);
  }
  Subscriber2.clearTrack = clearTrack;
})(Subscriber || (Subscriber = {}));

// src/computed.ts
function computed(getter) {
  return new Computed(getter);
}
var Computed = class {
  constructor(getter) {
    this.getter = getter;
    this.cachedValue = void 0;
    // Dependency
    this.subs = void 0;
    this.subsTail = void 0;
    // Subscriber
    this.deps = void 0;
    this.depsTail = void 0;
    this.trackId = 0;
    this.dirtyLevel = 3 /* Dirty */;
    this.canPropagate = false;
  }
  get() {
    let dirtyLevel = this.dirtyLevel;
    if (dirtyLevel === 2 /* MaybeDirty */) {
      Subscriber.resolveMaybeDirty(this);
      dirtyLevel = this.dirtyLevel;
    }
    if (dirtyLevel >= 3 /* Dirty */) {
      this.update();
    }
    const activeTrackId = System.activeTrackId;
    if (activeTrackId !== 0) {
      const subsTail = this.subsTail;
      if (subsTail === void 0 || subsTail.trackId !== activeTrackId) {
        Dependency.link(this, System.activeSub);
      }
    }
    return this.cachedValue;
  }
  update() {
    const prevSub = Subscriber.startTrack(this);
    const oldValue = this.cachedValue;
    let newValue;
    try {
      newValue = this.getter(oldValue);
    } finally {
      Subscriber.endTrack(this, prevSub);
    }
    if (oldValue !== newValue) {
      this.cachedValue = newValue;
      const subs = this.subs;
      if (subs !== void 0) {
        Dependency.propagate(subs);
      }
    }
  }
};

// src/effectScope.ts
var activeEffectScope = void 0;
function effectScope() {
  return new EffectScope();
}
var EffectScope = class {
  constructor() {
    // Subscriber
    this.deps = void 0;
    this.depsTail = void 0;
    this.trackId = -++System.lastTrackId;
    this.dirtyLevel = 0 /* None */;
    this.canPropagate = false;
  }
  notify() {
    if (this.dirtyLevel !== 0 /* None */) {
      this.dirtyLevel = 0 /* None */;
      let link = this.deps;
      while (link !== void 0) {
        const dep = link.dep;
        if ("notify" in dep) {
          dep.notify();
        }
        link = link.nextDep;
      }
    }
  }
  run(fn) {
    const prevSub = activeEffectScope;
    activeEffectScope = this;
    this.trackId = Math.abs(this.trackId);
    try {
      return fn();
    } finally {
      activeEffectScope = prevSub;
      this.trackId = -Math.abs(this.trackId);
    }
  }
  stop() {
    if (this.deps !== void 0) {
      Subscriber.clearTrack(this.deps);
      this.deps = void 0;
      this.depsTail = void 0;
    }
    this.dirtyLevel = 0 /* None */;
  }
};

// src/effect.ts
function effect(fn) {
  const e = new Effect(fn);
  e.run();
  return e;
}
var Effect = class {
  constructor(fn) {
    this.fn = fn;
    this.nextNotify = void 0;
    // Dependency
    this.subs = void 0;
    this.subsTail = void 0;
    // Subscriber
    this.deps = void 0;
    this.depsTail = void 0;
    this.trackId = 0;
    this.dirtyLevel = 3 /* Dirty */;
    this.canPropagate = false;
    const activeTrackId = System.activeTrackId;
    if (activeTrackId !== 0) {
      Dependency.link(this, System.activeSub);
      return;
    }
    if (activeEffectScope !== void 0) {
      const subsTail = this.subsTail;
      if (subsTail === void 0 || subsTail.trackId !== activeEffectScope.trackId) {
        Dependency.link(this, activeEffectScope);
      }
    }
  }
  notify() {
    let dirtyLevel = this.dirtyLevel;
    if (dirtyLevel > 0 /* None */) {
      if (dirtyLevel === 2 /* MaybeDirty */) {
        Subscriber.resolveMaybeDirty(this);
        dirtyLevel = this.dirtyLevel;
      }
      if (dirtyLevel === 3 /* Dirty */) {
        this.run();
      } else {
        this.dirtyLevel = 0 /* None */;
        let link = this.deps;
        while (link !== void 0) {
          const dep = link.dep;
          if ("notify" in dep) {
            dep.notify();
          }
          link = link.nextDep;
        }
      }
    }
  }
  run() {
    const prevSub = Subscriber.startTrack(this);
    try {
      return this.fn();
    } finally {
      Subscriber.endTrack(this, prevSub);
    }
  }
  stop() {
    if (this.deps !== void 0) {
      Subscriber.clearTrack(this.deps);
      this.deps = void 0;
      this.depsTail = void 0;
    }
    this.dirtyLevel = 3 /* Dirty */;
  }
};

// src/signal.ts
function signal(oldValue) {
  return new Signal(oldValue);
}
var Signal = class {
  constructor(currentValue) {
    this.currentValue = currentValue;
    // Dependency
    this.subs = void 0;
    this.subsTail = void 0;
  }
  get() {
    const activeTrackId = System.activeTrackId;
    if (activeTrackId !== 0) {
      const subsTail = this.subsTail;
      if (subsTail === void 0 || subsTail.trackId !== activeTrackId) {
        Dependency.link(this, System.activeSub);
      }
    }
    return this.currentValue;
  }
  set(value) {
    if (this.currentValue !== (this.currentValue = value)) {
      const subs = this.subs;
      if (subs !== void 0) {
        startBatch();
        Dependency.propagate(subs);
        endBatch();
      }
    }
  }
};

// src/unstable/index.ts
var unstable_exports = {};
__export(unstable_exports, {
  EqualityComputed: () => EqualityComputed,
  computedArray: () => computedArray,
  computedSet: () => computedSet,
  equalityComputed: () => equalityComputed
});

// src/unstable/computedArray.ts
function computedArray(arr, getGetter) {
  const length = computed(() => arr.get().length);
  const keys = computed(
    () => {
      const keys2 = [];
      for (let i = 0; i < length.get(); i++) {
        keys2.push(String(i));
      }
      return keys2;
    }
  );
  const items = computed(
    (array) => {
      array ??= [];
      while (array.length < length.get()) {
        const index = array.length;
        const item = computed(() => arr.get()[index]);
        array.push(computed(getGetter(item, index)));
      }
      if (array.length > length.get()) {
        array.length = length.get();
      }
      return array;
    }
  );
  return new Proxy({}, {
    get(_, p, receiver) {
      if (p === "length") {
        return length.get();
      }
      if (typeof p === "string" && !isNaN(Number(p))) {
        return items.get()[Number(p)]?.get();
      }
      return Reflect.get(items.get(), p, receiver);
    },
    has(_, p) {
      return Reflect.has(items.get(), p);
    },
    ownKeys() {
      return keys.get();
    }
  });
}

// src/unstable/computedSet.ts
function computedSet(source) {
  return computed(
    (oldValue) => {
      const newValue = source.get();
      if (oldValue?.size === newValue.size && [...oldValue].every((c) => newValue.has(c))) {
        return oldValue;
      }
      return newValue;
    }
  );
}

// src/unstable/equalityComputed.ts
function equalityComputed(getter) {
  return new EqualityComputed(getter);
}
var EqualityComputed = class extends Computed {
  constructor(getter) {
    super((oldValue) => {
      const newValue = getter();
      if (this.equals(oldValue, newValue)) {
        return oldValue;
      }
      return newValue;
    });
  }
  equals(a, b) {
    if (a === b) {
      return true;
    }
    if (a === null || b === null || typeof a !== typeof b) {
      return false;
    }
    if (typeof a === "object") {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (!this.equals(a[i], b[i])) {
            return false;
          }
        }
        return true;
      }
      if (!Array.isArray(a) && !Array.isArray(b)) {
        for (const key in a) {
          if (a.hasOwnProperty(key)) {
            if (!b.hasOwnProperty(key) || !this.equals(a[key], b[key])) {
              return false;
            }
          }
        }
        for (const key in b) {
          if (b.hasOwnProperty(key) && !a.hasOwnProperty(key)) {
            return false;
          }
        }
        return true;
      }
      return false;
    }
    return false;
  }
};
export {
  Computed,
  Dependency,
  DirtyLevels,
  Effect,
  EffectScope,
  Link,
  Signal,
  Subscriber,
  System,
  unstable_exports as Unstable,
  activeEffectScope,
  computed,
  effect,
  effectScope,
  endBatch,
  signal,
  startBatch
};
