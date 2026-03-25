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
    /**
     * Links a given dependency and subscriber if they are not already linked.
     *
     * @param dep - The dependency to be linked.
     * @param sub - The subscriber that depends on this dependency.
     * @returns The newly created link object if the two are not already linked; otherwise `undefined`.
     */
    link(dep: Dependency, sub: Subscriber): Link | undefined;
    /**
     * Traverses and marks subscribers starting from the provided link.
     *
     * It sets flags (e.g., Dirty, PendingComputed, PendingEffect) on each subscriber
     * to indicate which ones require re-computation or effect processing.
     * This function should be called after a signal's value changes.
     *
     * @param link - The starting link from which propagation begins.
     */
    propagate(link: Link): void;
    /**
     * Prepares the given subscriber to track new dependencies.
     *
     * It resets the subscriber's internal pointers (e.g., depsTail) and
     * sets its flags to indicate it is now tracking dependency links.
     *
     * @param sub - The subscriber to start tracking.
     */
    startTracking(sub: Subscriber): void;
    /**
     * Concludes tracking of dependencies for the specified subscriber.
     *
     * It clears or unlinks any tracked dependency information, then
     * updates the subscriber's flags to indicate tracking is complete.
     *
     * @param sub - The subscriber whose tracking is ending.
     */
    endTracking(sub: Subscriber): void;
    /**
     * Updates the dirty flag for the given subscriber based on its dependencies.
     *
     * If the subscriber has any pending computeds, this function sets the Dirty flag
     * and returns `true`. Otherwise, it clears the PendingComputed flag and returns `false`.
     *
     * @param sub - The subscriber to update.
     * @param flags - The current flag set for this subscriber.
     * @returns `true` if the subscriber is marked as Dirty; otherwise `false`.
     */
    updateDirtyFlag(sub: Subscriber, flags: SubscriberFlags): boolean;
    /**
     * Updates the computed subscriber if necessary before its value is accessed.
     *
     * If the subscriber is marked Dirty or PendingComputed, this function runs
     * the provided updateComputed logic and triggers a shallowPropagate for any
     * downstream subscribers if an actual update occurs.
     *
     * @param computed - The computed subscriber to update.
     * @param flags - The current flag set for this subscriber.
     */
    processComputedUpdate(computed: Dependency & Subscriber, flags: SubscriberFlags): void;
    /**
     * Ensures all pending internal effects for the given subscriber are processed.
     *
     * This should be called after an effect decides not to re-run itself but may still
     * have dependencies flagged with PendingEffect. If the subscriber is flagged with
     * PendingEffect, this function clears that flag and invokes `notifyEffect` on any
     * related dependencies marked as Effect and Propagated, processing pending effects.
     *
     * @param sub - The subscriber which may have pending effects.
     * @param flags - The current flags on the subscriber to check.
     */
    processPendingInnerEffects(sub: Subscriber, flags: SubscriberFlags): void;
    /**
     * Processes queued effect notifications after a batch operation finishes.
     *
     * Iterates through all queued effects, calling notifyEffect on each.
     * If an effect remains partially handled, its flags are updated, and future
     * notifications may be triggered until fully handled.
     */
    processEffectNotifications(): void;
};
