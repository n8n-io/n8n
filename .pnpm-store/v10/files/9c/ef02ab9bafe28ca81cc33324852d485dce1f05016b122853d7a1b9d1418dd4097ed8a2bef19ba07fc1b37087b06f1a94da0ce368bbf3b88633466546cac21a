function trueFn() {
  return true
}

const $PROXY = Symbol('merge-proxy')

// https://github.com/solidjs/solid/blob/c20ca4fd8c36bc0522fedb2c7f38a110b7ee2663/packages/solid/src/render/component.ts#L51-L118
const propTraps: ProxyHandler<{
  get: (k: string | number | symbol) => any
  has: (k: string | number | symbol) => boolean
  keys: () => string[]
}> = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver
    return _.get(property)
  },
  has(_, property) {
    return _.has(property)
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property)
      },
      set: trueFn,
      deleteProperty: trueFn,
    }
  },
  ownKeys(_) {
    return _.keys()
  },
}

type UnboxLazy<T> = T extends () => infer U ? U : T
type BoxedTupleTypes<T extends any[]> = {
  [P in keyof T]: [UnboxLazy<T[P]>]
}[Exclude<keyof T, keyof any[]>]
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
type UnboxIntersection<T> = T extends { 0: infer U } ? U : never
type MergeProxy<T extends any[]> = UnboxIntersection<
  UnionToIntersection<BoxedTupleTypes<T>>
>

function resolveSource(s: any) {
  return 'value' in s ? s.value : s
}

export function mergeProxy<T extends any[]>(...sources: T): MergeProxy<T>
export function mergeProxy(...sources: any): any {
  return new Proxy(
    {
      get(property: string | number | symbol) {
        for (let i = sources.length - 1; i >= 0; i--) {
          const v = resolveSource(sources[i])[property]
          if (v !== undefined) return v
        }
      },
      has(property: string | number | symbol) {
        for (let i = sources.length - 1; i >= 0; i--) {
          if (property in resolveSource(sources[i])) return true
        }
        return false
      },
      keys() {
        const keys = []
        for (let i = 0; i < sources.length; i++)
          keys.push(...Object.keys(resolveSource(sources[i])))
        return [...Array.from(new Set(keys))]
      },
    },
    propTraps
  )
}
