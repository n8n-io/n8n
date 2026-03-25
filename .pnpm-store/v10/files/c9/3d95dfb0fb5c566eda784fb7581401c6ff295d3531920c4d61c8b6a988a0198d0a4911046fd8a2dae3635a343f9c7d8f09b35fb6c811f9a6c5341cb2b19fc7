declare const window: any
declare const self: any

const mockGlobal = {}

export function getGlobal() {
    if (typeof globalThis !== "undefined") {
        return globalThis
    }
    if (typeof window !== "undefined") {
        return window
    }
    if (typeof global !== "undefined") {
        return global
    }
    if (typeof self !== "undefined") {
        return self
    }
    return mockGlobal
}
