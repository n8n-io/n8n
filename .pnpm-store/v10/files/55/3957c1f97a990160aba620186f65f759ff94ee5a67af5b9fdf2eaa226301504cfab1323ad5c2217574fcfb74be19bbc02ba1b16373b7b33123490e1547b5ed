export declare class FinalizationRegistryType<T> {
    constructor(finalize: (value: T) => void)
    register(target: object, value: T, token?: object): void
    unregister(token: object): void
}

declare const FinalizationRegistry: typeof FinalizationRegistryType | undefined

export const REGISTRY_FINALIZE_AFTER = 10_000
export const REGISTRY_SWEEP_INTERVAL = 10_000

export class TimerBasedFinalizationRegistry<T> implements FinalizationRegistryType<T> {
    private registrations: Map<unknown, { value: T; registeredAt: number }> = new Map()
    private sweepTimeout: ReturnType<typeof setTimeout> | undefined

    constructor(private readonly finalize: (value: T) => void) {}

    // Token is actually required with this impl
    register(target: object, value: T, token?: object) {
        this.registrations.set(token, {
            value,
            registeredAt: Date.now()
        })
        this.scheduleSweep()
    }

    unregister(token: unknown) {
        this.registrations.delete(token)
    }

    // Bound so it can be used directly as setTimeout callback.
    sweep = (maxAge = REGISTRY_FINALIZE_AFTER) => {
        // cancel timeout so we can force sweep anytime
        clearTimeout(this.sweepTimeout)
        this.sweepTimeout = undefined

        const now = Date.now()
        this.registrations.forEach((registration, token) => {
            if (now - registration.registeredAt >= maxAge) {
                this.finalize(registration.value)
                this.registrations.delete(token)
            }
        })

        if (this.registrations.size > 0) {
            this.scheduleSweep()
        }
    }

    // Bound so it can be exported directly as clearTimers test utility.
    finalizeAllImmediately = () => {
        this.sweep(0)
    }

    private scheduleSweep() {
        if (this.sweepTimeout === undefined) {
            this.sweepTimeout = setTimeout(this.sweep, REGISTRY_SWEEP_INTERVAL)
        }
    }
}

export const UniversalFinalizationRegistry =
    typeof FinalizationRegistry !== "undefined"
        ? FinalizationRegistry
        : TimerBasedFinalizationRegistry
