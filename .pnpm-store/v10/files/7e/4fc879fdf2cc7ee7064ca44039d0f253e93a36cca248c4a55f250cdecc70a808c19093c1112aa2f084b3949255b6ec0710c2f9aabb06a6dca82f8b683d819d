// @ts-check

/**
 * @param {unknown} value
 */
const getType = (value) => {
  if (value === undefined) return 0
  if (value === null) return 1
  const t = typeof value
  if (t === 'boolean') return 2
  if (t === 'number') return 3
  if (t === 'string') return 4
  if (t === 'object') return 6
  if (t === 'bigint') return 9
  return -1
}

/**
 * @param {import('memfs').IFs} memfs
 * @param {any} value
 * @param {ReturnType<typeof getType>} type
 * @returns {Uint8Array}
 */
const encodeValue = (memfs, value, type) => {
  switch (type) {
    case 0:
    case 1:
      return new Uint8Array(0)
    case 2: {
      const view = new Int32Array(1)
      view[0] = value ? 1 : 0
      return new Uint8Array(view.buffer)
    }
    case 3: {
      const view = new Float64Array(1)
      view[0] = value
      return new Uint8Array(view.buffer)
    }
    case 4: {
      const view = new TextEncoder().encode(value)
      return view
    }
    case 6: {
      const [entry] = Object.entries(memfs).filter(([_, v]) => v === value.constructor)[0] ?? []
      if (entry) {
        Object.defineProperty(value, '__constructor__', {
          configurable: true,
          writable: true,
          enumerable: true,
          value: entry
        })
      }

      const json = JSON.stringify(value, (_, value) => {
        if (typeof value === 'bigint') {
          return `BigInt(${String(value)})`
        }
        if (value instanceof Error) {
          return {
            ...value,
            message: value.message,
            stack: value.stack,
            __error__: value.constructor.name,
          }
        }
        return value
      })
      const view = new TextEncoder().encode(json)
      return view
    }
    case 9: {
      const view = new BigInt64Array(1)
      view[0] = value
      return new Uint8Array(view.buffer)
    }
    case -1:
    default:
      throw new Error('unsupported data')
  }
}

/**
 * @param {typeof import('memfs')} memfs
 * @param {Uint8Array} payload
 * @param {number} type
 * @returns {any}
 */
const decodeValue = (memfs, payload, type) => {
  if (type === 0) return undefined
  if (type === 1) return null
  if (type === 2) return Boolean(new Int32Array(payload.buffer, payload.byteOffset, 1)[0])
  if (type === 3) return new Float64Array(payload.buffer, payload.byteOffset, 1)[0]
  if (type === 4) return new TextDecoder().decode(payload.slice())
  if (type === 6) {
    const obj = JSON.parse(new TextDecoder().decode(payload.slice()), (_key, value) => {
      if (typeof value === 'string') {
        const matched = value.match(/^BigInt\((-?\d+)\)$/)
        if (matched && matched[1]) {
          return BigInt(matched[1])
        }
      }
      return value
    })
    if (obj.__constructor__) {
      const ctor = obj.__constructor__
      delete obj.__constructor__
      Object.setPrototypeOf(obj, memfs[ctor].prototype)
    }
    if (obj.__error__) {
      const name = obj.__error__
      const ErrorConstructor = globalThis[name] || Error
      delete obj.__error__
      const err = new ErrorConstructor(obj.message)
      Object.defineProperty(err, 'stack', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: err.stack
      })
      Object.defineProperty(err, Symbol.toStringTag, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: name
      })
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'message' || k === 'stack') continue
        err[k] = v
      }
      return err
    }
    return obj
  }
  if (type === 9) return new BigInt64Array(payload.buffer, payload.byteOffset, 1)[0]
  throw new Error('unsupported data')
}

/**
 * @param {import('memfs').IFs} fs
 * @returns {(e: { data: { __fs__: { sab: Int32Array, type: keyof import('memfs').IFs, payload: any[] } } }) => void}
 */
// oxlint-disable-next-line no-unused-vars -- fixed in an upcoming release
module.exports.createOnMessage = (fs) => function onMessage(e) {
  if (e.data.__fs__) {
    /**
     * 0..4                    status(int32_t):        21(waiting) 0(success) 1(error)
     * 5..8                    type(napi_valuetype):   0(undefined) 1(null) 2(boolean) 3(number) 4(string) 6(jsonstring) 9(bigint) -1(unsupported)
     * 9..16                   payload_size(uint32_t)  <= 1024
     * 16..16 + payload_size   payload_content
     */
    const { sab, type, payload } = e.data.__fs__
    const fn = fs[type]
    try {
      const ret = fn.apply(fs, payload)
      const t = getType(ret)
      Atomics.store(sab, 1, t)
      const v = encodeValue(fs, ret, t)
      Atomics.store(sab, 2, v.length)
      new Uint8Array(sab.buffer).set(v, 16)
      Atomics.store(sab, 0, 0) // success

    } catch (/** @type {any} */ err) {
      const t = getType(err)
      Atomics.store(sab, 1, t)
      const v = encodeValue(fs, err, t)
      Atomics.store(sab, 2, v.length)
      new Uint8Array(sab.buffer).set(v, 16)
      Atomics.store(sab, 0, 1) // error
    } finally {
      Atomics.notify(sab, 0)
    }
  }
}

/**
 * @param {typeof import('memfs')} memfs
 */
module.exports.createFsProxy = (memfs) => new Proxy({}, {
  get (_target, p, _receiver) {
    /**
     * @param {any[]} args
     */
    return function (...args) {
      const sab = new SharedArrayBuffer(16 + 10240)
      const i32arr = new Int32Array(sab)
      Atomics.store(i32arr, 0, 21)

      postMessage({
        __fs__: {
          sab: i32arr,
          type: p,
          payload: args
        }
      })

      Atomics.wait(i32arr, 0, 21)

      const status = Atomics.load(i32arr, 0)
      const type = Atomics.load(i32arr, 1)
      const size = Atomics.load(i32arr, 2)
      const content = new Uint8Array(sab, 16, size)
      const value = decodeValue(memfs, content, type)
      if (status === 1) {
        throw value
      }
      return value
    }
  }
})
