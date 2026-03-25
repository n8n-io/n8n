import {
    $mobx,
    IIsObservableObject,
    IObservableArray,
    ObservableMap,
    ObservableSet,
    ObservableObjectAdministration,
    endBatch,
    isObservableArray,
    isObservableMap,
    isObservableSet,
    isObservableObject,
    startBatch,
    die
} from "../internal"

export function keys<K>(map: ObservableMap<K, any>): ReadonlyArray<K>
export function keys<T>(ar: IObservableArray<T>): ReadonlyArray<number>
export function keys<T>(set: ObservableSet<T>): ReadonlyArray<T>
export function keys<T extends Object>(obj: T): ReadonlyArray<PropertyKey>
export function keys(obj: any): any {
    if (isObservableObject(obj)) {
        return (
            (obj as any as IIsObservableObject)[$mobx] as ObservableObjectAdministration
        ).keys_()
    }
    if (isObservableMap(obj) || isObservableSet(obj)) {
        return Array.from(obj.keys())
    }
    if (isObservableArray(obj)) {
        return obj.map((_, index) => index)
    }
    die(5)
}

export function values<K, T>(map: ObservableMap<K, T>): ReadonlyArray<T>
export function values<T>(set: ObservableSet<T>): ReadonlyArray<T>
export function values<T>(ar: IObservableArray<T>): ReadonlyArray<T>
export function values<T = any>(obj: T): ReadonlyArray<T extends object ? T[keyof T] : any>
export function values(obj: any): string[] {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => obj[key])
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => obj.get(key))
    }
    if (isObservableSet(obj)) {
        return Array.from(obj.values())
    }
    if (isObservableArray(obj)) {
        return obj.slice()
    }
    die(6)
}

export function entries<K, T>(map: ObservableMap<K, T>): ReadonlyArray<[K, T]>
export function entries<T>(set: ObservableSet<T>): ReadonlyArray<[T, T]>
export function entries<T>(ar: IObservableArray<T>): ReadonlyArray<[number, T]>
export function entries<T = any>(
    obj: T
): ReadonlyArray<[string, T extends object ? T[keyof T] : any]>
export function entries(obj: any): any {
    if (isObservableObject(obj)) {
        return keys(obj).map(key => [key, obj[key]])
    }
    if (isObservableMap(obj)) {
        return keys(obj).map(key => [key, obj.get(key)])
    }
    if (isObservableSet(obj)) {
        return Array.from(obj.entries())
    }
    if (isObservableArray(obj)) {
        return obj.map((key, index) => [index, key])
    }
    die(7)
}

export function set<V>(obj: ObservableMap<PropertyKey, V>, values: { [key: string]: V })
export function set<K, V>(obj: ObservableMap<K, V>, key: K, value: V)
export function set<T>(obj: ObservableSet<T>, value: T)
export function set<T>(obj: IObservableArray<T>, index: number, value: T)
export function set<T extends Object>(obj: T, values: { [key: string]: any })
export function set<T extends Object>(obj: T, key: PropertyKey, value: any)
export function set(obj: any, key: any, value?: any): void {
    if (arguments.length === 2 && !isObservableSet(obj)) {
        startBatch()
        const values = key
        try {
            for (let key in values) {
                set(obj, key, values[key])
            }
        } finally {
            endBatch()
        }
        return
    }
    if (isObservableObject(obj)) {
        ;(obj as any as IIsObservableObject)[$mobx].set_(key, value)
    } else if (isObservableMap(obj)) {
        obj.set(key, value)
    } else if (isObservableSet(obj)) {
        obj.add(key)
    } else if (isObservableArray(obj)) {
        if (typeof key !== "number") {
            key = parseInt(key, 10)
        }
        if (key < 0) {
            die(`Invalid index: '${key}'`)
        }
        startBatch()
        if (key >= obj.length) {
            obj.length = key + 1
        }
        obj[key] = value
        endBatch()
    } else {
        die(8)
    }
}

export function remove<K, V>(obj: ObservableMap<K, V>, key: K)
export function remove<T>(obj: ObservableSet<T>, key: T)
export function remove<T>(obj: IObservableArray<T>, index: number)
export function remove<T extends Object>(obj: T, key: string)
export function remove(obj: any, key: any): void {
    if (isObservableObject(obj)) {
        ;(obj as any as IIsObservableObject)[$mobx].delete_(key)
    } else if (isObservableMap(obj)) {
        obj.delete(key)
    } else if (isObservableSet(obj)) {
        obj.delete(key)
    } else if (isObservableArray(obj)) {
        if (typeof key !== "number") {
            key = parseInt(key, 10)
        }
        obj.splice(key, 1)
    } else {
        die(9)
    }
}

export function has<K>(obj: ObservableMap<K, any>, key: K): boolean
export function has<T>(obj: ObservableSet<T>, key: T): boolean
export function has<T>(obj: IObservableArray<T>, index: number): boolean
export function has<T extends Object>(obj: T, key: string): boolean
export function has(obj: any, key: any): boolean {
    if (isObservableObject(obj)) {
        return (obj as any as IIsObservableObject)[$mobx].has_(key)
    } else if (isObservableMap(obj)) {
        return obj.has(key)
    } else if (isObservableSet(obj)) {
        return obj.has(key)
    } else if (isObservableArray(obj)) {
        return key >= 0 && key < obj.length
    }
    die(10)
}

export function get<K, V>(obj: ObservableMap<K, V>, key: K): V | undefined
export function get<T>(obj: IObservableArray<T>, index: number): T | undefined
export function get<T extends Object>(obj: T, key: string): any
export function get(obj: any, key: any): any {
    if (!has(obj, key)) {
        return undefined
    }
    if (isObservableObject(obj)) {
        return (obj as any as IIsObservableObject)[$mobx].get_(key)
    } else if (isObservableMap(obj)) {
        return obj.get(key)
    } else if (isObservableArray(obj)) {
        return obj[key]
    }
    die(11)
}

export function apiDefineProperty(obj: Object, key: PropertyKey, descriptor: PropertyDescriptor) {
    if (isObservableObject(obj)) {
        return (obj as any as IIsObservableObject)[$mobx].defineProperty_(key, descriptor)
    }
    die(39)
}

export function apiOwnKeys(obj: Object) {
    if (isObservableObject(obj)) {
        return (obj as any as IIsObservableObject)[$mobx].ownKeys_()
    }
    die(38)
}
