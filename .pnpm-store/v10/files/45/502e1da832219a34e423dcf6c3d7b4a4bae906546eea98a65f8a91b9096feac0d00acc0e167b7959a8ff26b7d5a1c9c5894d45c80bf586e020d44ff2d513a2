// src/system.ts
var SubscriberFlags = /* @__PURE__ */ ((SubscriberFlags2) => {
  SubscriberFlags2[SubscriberFlags2["None"] = 0] = "None";
  SubscriberFlags2[SubscriberFlags2["Tracking"] = 1] = "Tracking";
  SubscriberFlags2[SubscriberFlags2["Recursed"] = 2] = "Recursed";
  SubscriberFlags2[SubscriberFlags2["InnerEffectsPending"] = 4] = "InnerEffectsPending";
  SubscriberFlags2[SubscriberFlags2["ToCheckDirty"] = 8] = "ToCheckDirty";
  SubscriberFlags2[SubscriberFlags2["Dirty"] = 16] = "Dirty";
  return SubscriberFlags2;
})(SubscriberFlags || {});
var batchDepth = 0;
var queuedEffects;
var queuedEffectsTail;
var linkPool;
function startBatch() {
  ++batchDepth;
}
function endBatch() {
  if (!--batchDepth) {
    drainQueuedEffects();
  }
}
function drainQueuedEffects() {
  while (queuedEffects !== void 0) {
    const effect2 = queuedEffects;
    const queuedNext = effect2.nextNotify;
    if (queuedNext !== void 0) {
      effect2.nextNotify = void 0;
      queuedEffects = queuedNext;
    } else {
      queuedEffects = void 0;
      queuedEffectsTail = void 0;
    }
    effect2.notify();
  }
}
function link(dep, sub) {
  const currentDep = sub.depsTail;
  const nextDep = currentDep !== void 0 ? currentDep.nextDep : sub.deps;
  if (nextDep !== void 0 && nextDep.dep === dep) {
    sub.depsTail = nextDep;
  } else {
    linkNewDep(dep, sub, nextDep, currentDep);
  }
}
function linkNewDep(dep, sub, nextDep, depsTail) {
  let newLink;
  if (linkPool !== void 0) {
    newLink = linkPool;
    linkPool = newLink.nextDep;
    newLink.nextDep = nextDep;
    newLink.dep = dep;
    newLink.sub = sub;
  } else {
    newLink = {
      dep,
      sub,
      nextDep,
      prevSub: void 0,
      nextSub: void 0
    };
  }
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
}
function propagate(link2) {
  let targetFlag = 16 /* Dirty */;
  let subs = link2;
  let stack = 0;
  top: do {
    const sub = link2.sub;
    const subFlags = sub.flags;
    if (!(subFlags & (1 /* Tracking */ | 2 /* Recursed */ | 4 /* InnerEffectsPending */ | 8 /* ToCheckDirty */ | 16 /* Dirty */)) && (sub.flags = subFlags | targetFlag, true) || (subFlags & (1 /* Tracking */ | 2 /* Recursed */)) === 2 /* Recursed */ && (sub.flags = subFlags & ~2 /* Recursed */ | targetFlag, true) || !(subFlags & (4 /* InnerEffectsPending */ | 8 /* ToCheckDirty */ | 16 /* Dirty */)) && isValidLink(link2, sub) && (sub.flags = subFlags | 2 /* Recursed */ | targetFlag, sub.subs !== void 0)) {
      const subSubs = sub.subs;
      if (subSubs !== void 0) {
        if (subSubs.nextSub !== void 0) {
          subSubs.prevSub = subs;
          link2 = subs = subSubs;
          targetFlag = 8 /* ToCheckDirty */;
          ++stack;
        } else {
          link2 = subSubs;
          targetFlag = "notify" in sub ? 4 /* InnerEffectsPending */ : 8 /* ToCheckDirty */;
        }
        continue;
      }
      if ("notify" in sub) {
        if (queuedEffectsTail !== void 0) {
          queuedEffectsTail.nextNotify = sub;
        } else {
          queuedEffects = sub;
        }
        queuedEffectsTail = sub;
      }
    } else if (!(subFlags & (1 /* Tracking */ | targetFlag)) || !(subFlags & targetFlag) && subFlags & (4 /* InnerEffectsPending */ | 8 /* ToCheckDirty */ | 16 /* Dirty */) && isValidLink(link2, sub)) {
      sub.flags = subFlags | targetFlag;
    }
    if ((link2 = subs.nextSub) !== void 0) {
      subs = link2;
      targetFlag = stack ? 8 /* ToCheckDirty */ : 16 /* Dirty */;
      continue;
    }
    while (stack) {
      --stack;
      const dep = subs.dep;
      const depSubs = dep.subs;
      subs = depSubs.prevSub;
      depSubs.prevSub = void 0;
      if ((link2 = subs.nextSub) !== void 0) {
        subs = link2;
        targetFlag = stack ? 8 /* ToCheckDirty */ : 16 /* Dirty */;
        continue top;
      }
    }
    break;
  } while (true);
  if (!batchDepth) {
    drainQueuedEffects();
  }
}
function shallowPropagate(link2) {
  do {
    const updateSub = link2.sub;
    const updateSubFlags = updateSub.flags;
    if ((updateSubFlags & (8 /* ToCheckDirty */ | 16 /* Dirty */)) === 8 /* ToCheckDirty */) {
      updateSub.flags = updateSubFlags | 16 /* Dirty */;
    }
    link2 = link2.nextSub;
  } while (link2 !== void 0);
}
function isValidLink(subLink, sub) {
  const depsTail = sub.depsTail;
  if (depsTail !== void 0) {
    let link2 = sub.deps;
    do {
      if (link2 === subLink) {
        return true;
      }
      if (link2 === depsTail) {
        break;
      }
      link2 = link2.nextDep;
    } while (link2 !== void 0);
  }
  return false;
}
function checkDirty(link2) {
  let stack = 0;
  let dirty;
  top: do {
    dirty = false;
    const dep = link2.dep;
    if ("update" in dep) {
      const depFlags = dep.flags;
      if (depFlags & 16 /* Dirty */) {
        if (dep.update()) {
          const subs = dep.subs;
          if (subs.nextSub !== void 0) {
            shallowPropagate(subs);
          }
          dirty = true;
        }
      } else if (depFlags & 8 /* ToCheckDirty */) {
        const depSubs = dep.subs;
        if (depSubs.nextSub !== void 0) {
          depSubs.prevSub = link2;
        }
        link2 = dep.deps;
        ++stack;
        continue;
      }
    }
    if (!dirty && link2.nextDep !== void 0) {
      link2 = link2.nextDep;
      continue;
    }
    if (stack) {
      let sub = link2.sub;
      do {
        --stack;
        const subSubs = sub.subs;
        if (dirty) {
          if (sub.update()) {
            if ((link2 = subSubs.prevSub) !== void 0) {
              subSubs.prevSub = void 0;
              shallowPropagate(sub.subs);
              sub = link2.sub;
            } else {
              sub = subSubs.sub;
            }
            continue;
          }
        } else {
          sub.flags &= ~8 /* ToCheckDirty */;
        }
        if ((link2 = subSubs.prevSub) !== void 0) {
          subSubs.prevSub = void 0;
          if (link2.nextDep !== void 0) {
            link2 = link2.nextDep;
            continue top;
          }
          sub = link2.sub;
        } else {
          if ((link2 = subSubs.nextDep) !== void 0) {
            continue top;
          }
          sub = subSubs.sub;
        }
        dirty = false;
      } while (stack);
    }
    return dirty;
  } while (true);
}
function startTrack(sub) {
  sub.depsTail = void 0;
  sub.flags = 1 /* Tracking */;
}
function endTrack(sub) {
  const depsTail = sub.depsTail;
  if (depsTail !== void 0) {
    const nextDep = depsTail.nextDep;
    if (nextDep !== void 0) {
      clearTrack(nextDep);
      depsTail.nextDep = void 0;
    }
  } else if (sub.deps !== void 0) {
    clearTrack(sub.deps);
    sub.deps = void 0;
  }
  sub.flags &= ~1 /* Tracking */;
}
function clearTrack(link2) {
  do {
    const dep = link2.dep;
    const nextDep = link2.nextDep;
    const nextSub = link2.nextSub;
    const prevSub = link2.prevSub;
    if (nextSub !== void 0) {
      nextSub.prevSub = prevSub;
      link2.nextSub = void 0;
    } else {
      dep.subsTail = prevSub;
      if ("lastTrackedId" in dep) {
        dep.lastTrackedId = 0;
      }
    }
    if (prevSub !== void 0) {
      prevSub.nextSub = nextSub;
      link2.prevSub = void 0;
    } else {
      dep.subs = nextSub;
    }
    link2.dep = void 0;
    link2.sub = void 0;
    link2.nextDep = linkPool;
    linkPool = link2;
    if (dep.subs === void 0 && "deps" in dep) {
      if ("notify" in dep) {
        dep.flags = 0 /* None */;
      } else {
        const depFlags = dep.flags;
        if (!(depFlags & 16 /* Dirty */)) {
          dep.flags = depFlags | 16 /* Dirty */;
        }
      }
      const depDeps = dep.deps;
      if (depDeps !== void 0) {
        link2 = depDeps;
        dep.depsTail.nextDep = nextDep;
        dep.deps = void 0;
        dep.depsTail = void 0;
        continue;
      }
    }
    link2 = nextDep;
  } while (link2 !== void 0);
}

// src/effectScope.ts
var activeEffectScope = void 0;
var activeScopeTrackId = 0;
function untrackScope(fn) {
  const prevSub = activeEffectScope;
  const prevTrackId = activeScopeTrackId;
  setActiveScope(void 0, 0);
  try {
    return fn();
  } finally {
    setActiveScope(prevSub, prevTrackId);
  }
}
function setActiveScope(sub, trackId) {
  activeEffectScope = sub;
  activeScopeTrackId = trackId;
}
function effectScope() {
  return new EffectScope();
}
var EffectScope = class {
  constructor() {
    // Subscriber
    this.deps = void 0;
    this.depsTail = void 0;
    this.flags = 0 /* None */;
    this.trackId = nextTrackId();
  }
  notify() {
    const flags = this.flags;
    if (flags & 4 /* InnerEffectsPending */) {
      this.flags = flags & ~4 /* InnerEffectsPending */;
      let link2 = this.deps;
      do {
        const dep = link2.dep;
        if ("notify" in dep) {
          dep.notify();
        }
        link2 = link2.nextDep;
      } while (link2 !== void 0);
    }
  }
  run(fn) {
    const prevSub = activeEffectScope;
    const prevTrackId = activeScopeTrackId;
    setActiveScope(this, this.trackId);
    try {
      return fn();
    } finally {
      setActiveScope(prevSub, prevTrackId);
    }
  }
  stop() {
    startTrack(this);
    endTrack(this);
  }
};

// src/effect.ts
var activeSub;
var activeTrackId = 0;
var lastTrackId = 0;
function untrack(fn) {
  const prevSub = activeSub;
  const prevTrackId = activeTrackId;
  setActiveSub(void 0, 0);
  try {
    return fn();
  } finally {
    setActiveSub(prevSub, prevTrackId);
  }
}
function setActiveSub(sub, trackId) {
  activeSub = sub;
  activeTrackId = trackId;
}
function nextTrackId() {
  return ++lastTrackId;
}
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
    this.flags = 16 /* Dirty */;
    if (activeTrackId) {
      link(this, activeSub);
    } else if (activeScopeTrackId) {
      link(this, activeEffectScope);
    }
  }
  notify() {
    let flags = this.flags;
    if (flags & 16 /* Dirty */) {
      this.run();
      return;
    }
    if (flags & 8 /* ToCheckDirty */) {
      if (checkDirty(this.deps)) {
        this.run();
        return;
      } else {
        this.flags = flags &= ~8 /* ToCheckDirty */;
      }
    }
    if (flags & 4 /* InnerEffectsPending */) {
      this.flags = flags & ~4 /* InnerEffectsPending */;
      let link2 = this.deps;
      do {
        const dep = link2.dep;
        if ("notify" in dep) {
          dep.notify();
        }
        link2 = link2.nextDep;
      } while (link2 !== void 0);
    }
  }
  run() {
    const prevSub = activeSub;
    const prevTrackId = activeTrackId;
    setActiveSub(this, nextTrackId());
    startTrack(this);
    try {
      return this.fn();
    } finally {
      setActiveSub(prevSub, prevTrackId);
      endTrack(this);
    }
  }
  stop() {
    startTrack(this);
    endTrack(this);
  }
};

// src/computed.ts
function computed(getter) {
  return new Computed(getter);
}
var Computed = class {
  constructor(getter) {
    this.getter = getter;
    this.currentValue = void 0;
    // Dependency
    this.subs = void 0;
    this.subsTail = void 0;
    this.lastTrackedId = 0;
    // Subscriber
    this.deps = void 0;
    this.depsTail = void 0;
    this.flags = 16 /* Dirty */;
  }
  get() {
    const flags = this.flags;
    if (flags & 16 /* Dirty */) {
      if (this.update()) {
        const subs = this.subs;
        if (subs !== void 0) {
          shallowPropagate(subs);
        }
      }
    } else if (flags & 8 /* ToCheckDirty */) {
      if (checkDirty(this.deps)) {
        if (this.update()) {
          const subs = this.subs;
          if (subs !== void 0) {
            shallowPropagate(subs);
          }
        }
      } else {
        this.flags = flags & ~8 /* ToCheckDirty */;
      }
    }
    if (activeTrackId) {
      if (this.lastTrackedId !== activeTrackId) {
        this.lastTrackedId = activeTrackId;
        link(this, activeSub);
      }
    } else if (activeScopeTrackId) {
      if (this.lastTrackedId !== activeScopeTrackId) {
        this.lastTrackedId = activeScopeTrackId;
        link(this, activeEffectScope);
      }
    }
    return this.currentValue;
  }
  update() {
    const prevSub = activeSub;
    const prevTrackId = activeTrackId;
    setActiveSub(this, nextTrackId());
    startTrack(this);
    try {
      const oldValue = this.currentValue;
      const newValue = this.getter(oldValue);
      if (oldValue !== newValue) {
        this.currentValue = newValue;
        return true;
      }
      return false;
    } finally {
      setActiveSub(prevSub, prevTrackId);
      endTrack(this);
    }
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
    this.lastTrackedId = 0;
  }
  get() {
    if (activeTrackId && this.lastTrackedId !== activeTrackId) {
      this.lastTrackedId = activeTrackId;
      link(this, activeSub);
    }
    return this.currentValue;
  }
  set(value) {
    if (this.currentValue !== value) {
      this.currentValue = value;
      const subs = this.subs;
      if (subs !== void 0) {
        propagate(subs);
      }
    }
  }
};

// src/unstable/asyncSystem.ts
async function asyncCheckDirty(link2) {
  let stack = 0;
  let dirty;
  let nextDep;
  top: do {
    dirty = false;
    const dep = link2.dep;
    if ("update" in dep) {
      const depFlags = dep.flags;
      if (depFlags & 16 /* Dirty */) {
        if (await dep.update()) {
          const subs = dep.subs;
          if (subs.nextSub !== void 0) {
            shallowPropagate(subs);
          }
          dirty = true;
        }
      } else if (depFlags & 8 /* ToCheckDirty */) {
        const depSubs = dep.subs;
        if (depSubs.nextSub !== void 0) {
          depSubs.prevSub = link2;
        }
        link2 = dep.deps;
        ++stack;
        continue;
      }
    }
    if (dirty || (nextDep = link2.nextDep) === void 0) {
      if (stack) {
        let sub = link2.sub;
        do {
          --stack;
          const subSubs = sub.subs;
          let prevLink = subSubs.prevSub;
          if (prevLink !== void 0) {
            subSubs.prevSub = void 0;
            if (dirty) {
              if (await sub.update()) {
                shallowPropagate(sub.subs);
                sub = prevLink.sub;
                continue;
              }
            } else {
              sub.flags &= ~8 /* ToCheckDirty */;
            }
          } else {
            if (dirty) {
              if (await sub.update()) {
                sub = subSubs.sub;
                continue;
              }
            } else {
              sub.flags &= ~8 /* ToCheckDirty */;
            }
            prevLink = subSubs;
          }
          link2 = prevLink.nextDep;
          if (link2 !== void 0) {
            continue top;
          }
          sub = prevLink.sub;
          dirty = false;
        } while (stack);
      }
      return dirty;
    }
    link2 = nextDep;
  } while (true);
}

// src/unstable/asyncComputed.ts
function asyncComputed(getter) {
  return new AsyncComputed(getter);
}
var AsyncComputed = class extends Computed {
  async get() {
    const flags = this.flags;
    if (flags & 16 /* Dirty */) {
      if (await this.update()) {
        const subs = this.subs;
        if (subs !== void 0) {
          shallowPropagate(subs);
        }
      }
    } else if (flags & 8 /* ToCheckDirty */) {
      if (await asyncCheckDirty(this.deps)) {
        if (await this.update()) {
          const subs = this.subs;
          if (subs !== void 0) {
            shallowPropagate(subs);
          }
        }
      } else {
        this.flags = flags & ~8 /* ToCheckDirty */;
      }
    }
    return this.currentValue;
  }
  // @ts-expect-error
  async update() {
    try {
      startTrack(this);
      const trackId = nextTrackId();
      const oldValue = this.currentValue;
      const generator = this.getter(oldValue);
      let current = await generator.next();
      while (!current.done) {
        const dep = current.value;
        if (dep.lastTrackedId !== trackId) {
          dep.lastTrackedId = trackId;
          link(dep, this);
        }
        current = await generator.next();
      }
      const newValue = await current.value;
      if (oldValue !== newValue) {
        this.currentValue = newValue;
        return true;
      }
      return false;
    } finally {
      endTrack(this);
    }
  }
};

// src/unstable/asyncEffect.ts
function asyncEffect(fn) {
  const e = new AsyncEffect(fn);
  e.run();
  return e;
}
var AsyncEffect = class extends Effect {
  async notify() {
    let flags = this.flags;
    if (flags & 16 /* Dirty */) {
      this.run();
      return;
    }
    if (flags & 8 /* ToCheckDirty */) {
      if (await asyncCheckDirty(this.deps)) {
        this.run();
        return;
      } else {
        this.flags = flags &= ~8 /* ToCheckDirty */;
      }
    }
    if (flags & 4 /* InnerEffectsPending */) {
      this.flags = flags & ~4 /* InnerEffectsPending */;
      let link2 = this.deps;
      do {
        const dep = link2.dep;
        if ("notify" in dep) {
          dep.notify();
        }
        link2 = link2.nextDep;
      } while (link2 !== void 0);
    }
  }
  async run() {
    try {
      startTrack(this);
      const trackId = nextTrackId();
      const generator = this.fn();
      let current = await generator.next();
      while (!current.done) {
        const dep = current.value;
        if (dep.lastTrackedId !== trackId) {
          dep.lastTrackedId = trackId;
          link(dep, this);
        }
        current = await generator.next();
      }
      return await current.value;
    } finally {
      endTrack(this);
    }
  }
};

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

// src/unstable/index.ts
var unstable = {
  AsyncComputed,
  asyncComputed,
  AsyncEffect,
  asyncEffect,
  asyncCheckDirty,
  computedArray,
  computedSet,
  EqualityComputed,
  equalityComputed
};
export {
  Computed,
  Effect,
  EffectScope,
  Signal,
  SubscriberFlags,
  activeEffectScope,
  activeScopeTrackId,
  activeSub,
  activeTrackId,
  checkDirty,
  computed,
  effect,
  effectScope,
  endBatch,
  endTrack,
  lastTrackId,
  link,
  nextTrackId,
  propagate,
  setActiveScope,
  setActiveSub,
  shallowPropagate,
  signal,
  startBatch,
  startTrack,
  unstable,
  untrack,
  untrackScope
};
