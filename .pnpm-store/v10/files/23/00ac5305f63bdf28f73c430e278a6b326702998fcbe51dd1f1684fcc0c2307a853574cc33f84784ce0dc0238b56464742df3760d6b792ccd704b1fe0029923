export interface Dependency {
    subs: Link | undefined;
    subsTail: Link | undefined;
}
export interface Subscriber {
    flags: SubscriberFlags;
    deps: Link | undefined;
    depsTail: Link | undefined;
}
export interface Link {
    dep: Dependency | (Dependency & Subscriber);
    sub: Subscriber | (Dependency & Subscriber);
    prevSub: Link | undefined;
    nextSub: Link | undefined;
    nextDep: Link | undefined;
}
export declare const enum SubscriberFlags {
    Computed = 1,
    Effect = 2,
    Tracking = 4,
    Notified = 8,
    Recursed = 16,
    Dirty = 32,
    PendingComputed = 64,
    PendingEffect = 128,
    Propagated = 224
}
export declare function createReactiveSystem({ updateComputed, notifyEffect, }: {
    /**
     * Updates the computed subscriber's value and returns whether it changed.
     *
     * This function should be called when a computed subscriber is marked as Dirty.
     * The computed subscriber's getter function is invoked, and its value is updated.
     * If the value changes, the new value is stored, and the function returns `true`.
     *
     * @param computed - The computed subscriber to update.
     * @returns `true` if the computed subscriber's value changed; otherwise `false`.
     */
    updateComputed(computed: Dependency & Subscriber): boolean;
    /**
     * Handles effect notifications by processing the specified `effect`.
     *
     * When an `effect` first receives any of the following flags:
     *   - `Dirty`
     *   - `PendingComputed`
     *   - `PendingEffect`
     * this method will process them and return `true` if the flags are successfully handled.
     * If not fully handled, future changes to these flags will trigger additional calls
     * until the method eventually returns `true`.
     */
    notifyEffect(effect: Subscriber): boolean;
}): {
    link: (dep: Dependency, sub: Subscriber) => Link | undefined;
    propagate: (current: Link) => void;
    updateDirtyFlag: (sub: Subscriber, flags: SubscriberFlags) => boolean;
    startTracking: (sub: Subscriber) => void;
    endTracking: (sub: Subscriber) => void;
    processEffectNotifications: () => void;
    processComputedUpdate: (computed: Dependency & Subscriber, flags: SubscriberFlags) => void;
    processPendingInnerEffects: (sub: Subscriber, flags: SubscriberFlags) => void;
};
