import { IComputedDidChange } from "./computedvalue"
import { IValueDidChange, IBoxDidChange } from "./../types/observablevalue"
import { IObjectDidChange } from "./../types/observableobject"
import { IArrayDidChange } from "./../types/observablearray"
import { Lambda, globalState, once, ISetDidChange, IMapDidChange } from "../internal"

export function isSpyEnabled() {
    return __DEV__ && !!globalState.spyListeners.length
}

export type PureSpyEvent =
    | { type: "action"; name: string; object: unknown; arguments: unknown[] }
    | { type: "scheduled-reaction"; name: string }
    | { type: "reaction"; name: string }
    | { type: "error"; name: string; message: string; error: string }
    | IComputedDidChange<unknown>
    | IObjectDidChange<unknown>
    | IArrayDidChange<unknown>
    | IMapDidChange<unknown, unknown>
    | ISetDidChange<unknown>
    | IValueDidChange<unknown>
    | IBoxDidChange<unknown>
    | { type: "report-end"; spyReportEnd: true; time?: number }

type SpyEvent = PureSpyEvent & { spyReportStart?: true }

export function spyReport(event: SpyEvent) {
    if (!__DEV__) {
        return
    } // dead code elimination can do the rest
    if (!globalState.spyListeners.length) {
        return
    }
    const listeners = globalState.spyListeners
    for (let i = 0, l = listeners.length; i < l; i++) {
        listeners[i](event)
    }
}

export function spyReportStart(event: PureSpyEvent) {
    if (!__DEV__) {
        return
    }
    const change = { ...event, spyReportStart: true as const }
    spyReport(change)
}

const END_EVENT: SpyEvent = { type: "report-end", spyReportEnd: true }

export function spyReportEnd(change?: { time?: number }) {
    if (!__DEV__) {
        return
    }
    if (change) {
        spyReport({ ...change, type: "report-end", spyReportEnd: true })
    } else {
        spyReport(END_EVENT)
    }
}

export function spy(listener: (change: SpyEvent) => void): Lambda {
    if (!__DEV__) {
        console.warn(`[mobx.spy] Is a no-op in production builds`)
        return function () {}
    } else {
        globalState.spyListeners.push(listener)
        return once(() => {
            globalState.spyListeners = globalState.spyListeners.filter(l => l !== listener)
        })
    }
}
