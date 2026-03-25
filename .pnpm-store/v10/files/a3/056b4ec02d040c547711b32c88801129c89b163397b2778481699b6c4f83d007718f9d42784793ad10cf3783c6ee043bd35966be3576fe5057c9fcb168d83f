export interface TsMapInter<K, V> {
  size: number

  set(k: K, v: V): any

  get(k: K): V

  has(k: K): boolean

  delete(k: K): boolean

  clear(): void

  keys(): K[]

  values(): V[]

  entries(): [K, V][]

  forEach(cb: (value?: V, key?: K, map?: any) => void, context?: any): void
}

export default class TsMap<K, V> {
  // Used to store keys.
  private keyStore: K[] = []

  // Used to store values.
  private valueStore: V[] = []

  // The Map's size,
  // increase at function set,
  // decrease at function remove,
  // clear at function clear.
  public size: number = 0

  // Accept an optional parameter,
  // The parameter's type:
  // [
  //   [K, V], [K, V], ...
  // ]
  constructor(intrator?: [K, V][]) {
    if (intrator) {
      for (let item of intrator) {
        this.keyStore.push(item[0])
        this.valueStore.push(item[1])
        this.size++
      }
    }
  }

  // set a key-value to Map,
  // return this to chain called.
  set(k: K, v: V): TsMapInter<K, V> {
    let existed = false
    const ks = this.keyStore
    const vs = this.valueStore

    // if key is existed, replace it.
    for (let i = ks.length; i > -1; i--) {
      if (ks[i] === k) {
        vs[i] = v
        existed = true
      }
    }

    if (!existed) {
      this.keyStore.push(k)
      this.valueStore.push(v)
      this.size++
    }

    return this as TsMapInter<K, V>
  }

  // Return the value of the corresponding key,
  // if dosn't has, return undefind.
  get(k: K): V | undefined {
    const ks: K[] = this.keyStore
    for (let i = ks.length; i > -1; i--) {
      if (ks[i] === k) {
        return this.valueStore[i]
      }
    }

    return undefined
  }

  // Determine if a key is included.
  has(k: K): boolean {
    const ks: K[] = this.keyStore
    for (let i = ks.length; i > -1; i--) {
      if (ks[i] === k) {
        return true
      }
    }
    return false
  }

  // Delete all the corresponding keys and its value,
  // if detele success, return true.
  // else return false.
  delete(k: K): boolean {
    const ks: K[] = this.keyStore
    let len: number = ks.length
    let deleteFlag: boolean = false
    while (len--) {
      if (ks[len] === k) {
        ks.splice(len, 1)
        this.size--
        deleteFlag = true
      }
    }

    return deleteFlag
  }

  // Empty the Map.
  clear(): void {
    this.keyStore.splice(0, this.size)
    this.valueStore.splice(0, this.size)
    this.size = 0
  }

  // return all Map's key.
  keys(): K[] {
    return this.keyStore
  }

  // return all Map's value.
  values(): V[] {
    return this.valueStore
  }

  // return all Map's key-value.
  entries(): [K, V][] {
    const entries: [K, V][] = []
    const ks: K[] = this.keyStore
    const vs: V[] = this.valueStore
    for (let i = 0; i < this.size; i++) {
      entries.push([ks[i], vs[i]])
    }
    return entries
  }

  // Traversal the Map,
  // Accept two parameters, first is a callback, second is a optional context.
  // callback function accepts 3 optional params.
  // first is value, second is key, last is the map
  forEach(cb: (value?: V, key?: K, map?: TsMapInter<K, V>) => void,
    context?: any
  ): void {
    const size: number = this.size
    const ks: K[] = this.keyStore
    const vs: V[] = this.valueStore
    for (let i = 0; i < size; i++) {
      cb.bind(context || this)(vs[i], ks[i], this)
    }
  }
}

