/**
 * @experimental WIP
 *
 * Simple & efficient schemas for your data.
 */

import * as obj from './object.js'
import * as arr from './array.js'
import * as error from './error.js'
import * as env from './environment.js'
import * as equalityTraits from './trait/equality.js'
import * as fun from './function.js'
import * as string from './string.js'
import * as prng from './prng.js'
import * as number from './number.js'

/**
 * @typedef {string|number|bigint|boolean|null|undefined|symbol} Primitive
 */

/**
 * @typedef {{ [k:string|number|symbol]: any }} AnyObject
 */

/**
 * @template T
 * @typedef {T extends Schema<infer X> ? X : T} Unwrap
 */

/**
 * @template T
 * @typedef {T extends Schema<infer X> ? X : T} TypeOf
 */

/**
 * @template {readonly unknown[]} T
 * @typedef {T extends readonly [Schema<infer First>, ...infer Rest] ? [First, ...UnwrapArray<Rest>] : [] } UnwrapArray
 */

/**
 * @template T
 * @typedef {T extends Schema<infer S> ? Schema<S> : never} CastToSchema
 */

/**
 * @template {unknown[]} Arr
 * @typedef {Arr extends [...unknown[], infer L] ? L : never} TupleLast
 */

/**
 * @template {unknown[]} Arr
 * @typedef {Arr extends [...infer Fs, unknown] ? Fs : never} TuplePop
 */

/**
 * @template {readonly unknown[]} T
 * @typedef {T extends []
 *   ? {}
 *   : T extends [infer First]
 *   ? First
 *   : T extends [infer First, ...infer Rest]
 *   ? First & Intersect<Rest>
 *   : never
 * } Intersect
 */

const schemaSymbol = Symbol('0schema')

export class ValidationError {
  constructor () {
    /**
     * Reverse errors
     * @type {Array<{ path: string?, expected: string, has: string, message: string? }>}
     */
    this._rerrs = []
  }

  /**
   * @param {string?} path
   * @param {string} expected
   * @param {string} has
   * @param {string?} message
   */
  extend (path, expected, has, message = null) {
    this._rerrs.push({ path, expected, has, message })
  }

  toString () {
    const s = []
    for (let i = this._rerrs.length - 1; i > 0; i--) {
      const r = this._rerrs[i]
      /* c8 ignore next */
      s.push(string.repeat(' ', (this._rerrs.length - i) * 2) + `${r.path != null ? `[${r.path}] ` : ''}${r.has} doesn't match ${r.expected}. ${r.message}`)
    }
    return s.join('\n')
  }
}

/**
 * @param {any} a
 * @param {any} b
 * @return {boolean}
 */
const shapeExtends = (a, b) => {
  if (a === b) return true
  if (a == null || b == null || a.constructor !== b.constructor) return false
  if (a[equalityTraits.EqualityTraitSymbol]) return equalityTraits.equals(a, b) // last resort: check equality (do this before array and obj check which don't implement the equality trait)
  if (arr.isArray(a)) {
    return arr.every(a, aitem =>
      arr.some(b, bitem => shapeExtends(aitem, bitem))
    )
  } else if (obj.isObject(a)) {
    return obj.every(a, (aitem, akey) =>
      shapeExtends(aitem, b[akey])
    )
  }
  /* c8 ignore next */
  return false
}

/**
 * @template T
 * @implements {equalityTraits.EqualityTrait}
 */
export class Schema {
  // this.shape must not be defined on Schema. Otherwise typecheck on metatypes (e.g. $$object) won't work as expected anymore
  /**
   * If true, the more things are added to the shape the more objects this schema will accept (e.g.
   * union). By default, the more objects are added, the the fewer objects this schema will accept.
   * @protected
   */
  static _dilutes = false

  /**
   * @param {Schema<any>} other
   */
  extends (other) {
    let [a, b] = [/** @type {any} */(this).shape, /** @type {any} */ (other).shape]
    if (/** @type {typeof Schema<any>} */ (this.constructor)._dilutes) [b, a] = [a, b]
    return shapeExtends(a, b)
  }

  /**
   * Overwrite this when necessary. By default, we only check the `shape` property which every shape
   * should have.
   * @param {Schema<any>} other
   */
  equals (other) {
    // @ts-ignore
    return this.constructor === other.constructor && fun.equalityDeep(this.shape, other.shape)
  }

  [schemaSymbol] () { return true }

  /**
   * @param {object} other
   */
  [equalityTraits.EqualityTraitSymbol] (other) {
    return this.equals(/** @type {any} */ (other))
  }

  /**
   * Use `schema.validate(obj)` with a typed parameter that is already of typed to be an instance of
   * Schema. Validate will check the structure of the parameter and return true iff the instance
   * really is an instance of Schema.
   *
   * @param {T} o
   * @return {boolean}
   */
  validate (o) {
    return this.check(o)
  }

  /* c8 ignore start */
  /**
   * Similar to validate, but this method accepts untyped parameters.
   *
   * @param {any} _o
   * @param {ValidationError} [_err]
   * @return {_o is T}
   */
  check (_o, _err) {
    error.methodUnimplemented()
  }
  /* c8 ignore stop */

  /**
   * @type {Schema<T?>}
   */
  get nullable () {
    // @ts-ignore
    return $union(this, $null)
  }

  /**
   * @type {$Optional<Schema<T>>}
   */
  get optional () {
    return new $Optional(/** @type {Schema<T>} */ (this))
  }

  /**
   * Cast a variable to a specific type. Returns the casted value, or throws an exception otherwise.
   * Use this if you know that the type is of a specific type and you just want to convince the type
   * system.
   *
   * **Do not rely on these error messages!**
   * Performs an assertion check only if not in a production environment.
   *
   * @template OO
   * @param {OO} o
   * @return {Extract<OO, T> extends never ? T : (OO extends Array<never> ? T : Extract<OO,T>)}
   */
  cast (o) {
    assert(o, this)
    return /** @type {any} */ (o)
  }

  /**
   * EXPECTO PATRONUM!! 🪄
   * This function protects against type errors. Though it may not work in the real world.
   *
   * "After all this time?"
   * "Always." - Snape, talking about type safety
   *
   * Ensures that a variable is a a specific type. Returns the value, or throws an exception if the assertion check failed.
   * Use this if you know that the type is of a specific type and you just want to convince the type
   * system.
   *
   * Can be useful when defining lambdas: `s.lambda(s.$number, s.$void).expect((n) => n + 1)`
   *
   * **Do not rely on these error messages!**
   * Performs an assertion check if not in a production environment.
   *
   * @param {T} o
   * @return {o extends T ? T : never}
   */
  expect (o) {
    assert(o, this)
    return o
  }
}

/**
 * @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} Constr
 * @typedef {Constr extends ((...args:any[]) => infer T) ? T : (Constr extends (new (...args:any[]) => any) ? InstanceType<Constr> : never)} Instance
 */

/**
 * @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} C
 * @extends {Schema<Instance<C>>}
 */
export class $ConstructedBy extends Schema {
  /**
   * @param {C} c
   * @param {((o:Instance<C>)=>boolean)|null} check
   */
  constructor (c, check) {
    super()
    this.shape = c
    this._c = check
  }

  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is C extends ((...args:any[]) => infer T) ? T : (C extends (new (...args:any[]) => any) ? InstanceType<C> : never)} o
   */
  check (o, err = undefined) {
    const c = o?.constructor === this.shape && (this._c == null || this._c(o))
    /* c8 ignore next */
    !c && err?.extend(null, this.shape.name, o?.constructor.name, o?.constructor !== this.shape ? 'Constructor match failed' : 'Check failed')
    return c
  }
}

/**
 * @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} C
 * @param {C} c
 * @param {((o:Instance<C>) => boolean)|null} check
 * @return {CastToSchema<$ConstructedBy<C>>}
 */
export const $constructedBy = (c, check = null) => new $ConstructedBy(c, check)
export const $$constructedBy = $constructedBy($ConstructedBy)

/**
 * Check custom properties on any object. You may want to overwrite the generated Schema<any>.
 *
 * @extends {Schema<any>}
 */
export class $Custom extends Schema {
  /**
   * @param {(o:any) => boolean} check
   */
  constructor (check) {
    super()
    /**
     * @type {(o:any) => boolean}
     */
    this.shape = check
  }

  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is any}
   */
  check (o, err) {
    const c = this.shape(o)
    /* c8 ignore next */
    !c && err?.extend(null, 'custom prop', o?.constructor.name, 'failed to check custom prop')
    return c
  }
}

/**
 * @param {(o:any) => boolean} check
 * @return {Schema<any>}
 */
export const $custom = (check) => new $Custom(check)
export const $$custom = $constructedBy($Custom)

/**
 * @template {Primitive} T
 * @extends {Schema<T>}
 */
export class $Literal extends Schema {
  /**
   * @param {Array<T>} literals
   */
  constructor (literals) {
    super()
    this.shape = literals
  }

  /**
   *
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is T}
   */
  check (o, err) {
    const c = this.shape.some(a => a === o)
    /* c8 ignore next */
    !c && err?.extend(null, this.shape.join(' | '), o.toString())
    return c
  }
}

/**
 * @template {Primitive[]} T
 * @param {T} literals
 * @return {CastToSchema<$Literal<T[number]>>}
 */
export const $literal = (...literals) => new $Literal(literals)
export const $$literal = $constructedBy($Literal)

/**
 * @template {Array<string|Schema<string|number>>} Ts
 * @typedef {Ts extends [] ? `` : (Ts extends [infer T] ? (Unwrap<T> extends (string|number) ? Unwrap<T> : never) : (Ts extends [infer T1, ...infer Rest] ? `${Unwrap<T1> extends (string|number) ? Unwrap<T1> : never}${Rest extends Array<string|Schema<string|number>> ? CastStringTemplateArgsToTemplate<Rest> : never}` : never))} CastStringTemplateArgsToTemplate
 */

/**
 * @param {string} str
 * @return {string}
 */
const _regexEscape = /** @type {any} */ (RegExp).escape || /** @type {(str:string) => string} */ (str =>
  str.replace(/[().|&,$^[\]]/g, s => '\\' + s)
)

/**
 * @param {string|Schema<any>} s
 * @return {string[]}
 */
const _schemaStringTemplateToRegex = s => {
  if ($string.check(s)) {
    return [_regexEscape(s)]
  }
  if ($$literal.check(s)) {
    return /** @type {Array<string|number>} */ (s.shape).map(v => v + '')
  }
  if ($$number.check(s)) {
    return ['[+-]?\\d+.?\\d*']
  }
  if ($$string.check(s)) {
    return ['.*']
  }
  if ($$union.check(s)) {
    return s.shape.map(_schemaStringTemplateToRegex).flat(1)
  }
  /* c8 ignore next 2 */
  // unexpected schema structure (only supports unions and string in literal types)
  error.unexpectedCase()
}

/**
 * @template {Array<string|Schema<string|number>>} T
 * @extends {Schema<CastStringTemplateArgsToTemplate<T>>}
 */
export class $StringTemplate extends Schema {
  /**
   * @param {T} shape
   */
  constructor (shape) {
    super()
    this.shape = shape
    this._r = new RegExp('^' + shape.map(_schemaStringTemplateToRegex).map(opts => `(${opts.join('|')})`).join('') + '$')
  }

  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is CastStringTemplateArgsToTemplate<T>}
   */
  check (o, err) {
    const c = this._r.exec(o) != null
    /* c8 ignore next */
    !c && err?.extend(null, this._r.toString(), o.toString(), 'String doesn\'t match string template.')
    return c
  }
}

/**
 * @template {Array<string|Schema<string|number>>} T
 * @param {T} literals
 * @return {CastToSchema<$StringTemplate<T>>}
 */
export const $stringTemplate = (...literals) => new $StringTemplate(literals)
export const $$stringTemplate = $constructedBy($StringTemplate)

const isOptionalSymbol = Symbol('optional')
/**
 * @template {Schema<any>} S
 * @extends Schema<Unwrap<S>|undefined>
 */
class $Optional extends Schema {
  /**
   * @param {S} shape
   */
  constructor (shape) {
    super()
    this.shape = shape
  }

  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is (Unwrap<S>|undefined)}
   */
  check (o, err) {
    const c = o === undefined || this.shape.check(o)
    /* c8 ignore next */
    !c && err?.extend(null, 'undefined (optional)', '()')
    return c
  }

  get [isOptionalSymbol] () { return true }
}
export const $$optional = $constructedBy($Optional)

/**
 * @extends Schema<never>
 */
class $Never extends Schema {
  /**
   * @param {any} _o
   * @param {ValidationError} [err]
   * @return {_o is never}
   */
  check (_o, err) {
    /* c8 ignore next */
    err?.extend(null, 'never', typeof _o)
    return false
  }
}

/**
 * @type {Schema<never>}
 */
export const $never = new $Never()
export const $$never = $constructedBy($Never)

/**
 * @template {{ [key: string|symbol|number]: Schema<any> }} S
 * @typedef {{ [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never }} $ObjectToType
 */

/**
 * @template {{[key:string|symbol|number]: Schema<any>}} S
 * @extends {Schema<$ObjectToType<S>>}
 */
export class $Object extends Schema {
  /**
   * @param {S} shape
   * @param {boolean} partial
   */
  constructor (shape, partial = false) {
    super()
    /**
     * @type {S}
     */
    this.shape = shape
    this._isPartial = partial
  }

  static _dilutes = true

  /**
   * @type {Schema<Partial<$ObjectToType<S>>>}
   */
  get partial () {
    return new $Object(this.shape, true)
  }

  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is $ObjectToType<S>}
   */
  check (o, err) {
    if (o == null) {
      /* c8 ignore next */
      err?.extend(null, 'object', 'null')
      return false
    }
    return obj.every(this.shape, (vv, vk) => {
      const c = (this._isPartial && !obj.hasProperty(o, vk)) || vv.check(o[vk], err)
      !c && err?.extend(vk.toString(), vv.toString(), typeof o[vk], 'Object property does not match')
      return c
    })
  }
}

/**
 * @template S
 * @typedef {Schema<{ [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never }>} _ObjectDefToSchema
 */

// I used an explicit type annotation instead of $ObjectToType, so that the user doesn't see the
// weird type definitions when inspecting type definions.
/**
 * @template {{ [key:string|symbol|number]: Schema<any> }} S
 * @param {S} def
 * @return {_ObjectDefToSchema<S> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K] }> : never}
 */
export const $object = def => /** @type {any} */ (new $Object(def))
export const $$object = $constructedBy($Object)
/**
 * @type {Schema<{[key:string]: any}>}
 */
export const $objectAny = $custom(o => o != null && (o.constructor === Object || o.constructor == null))

/**
 * @template {Schema<string|number|symbol>} Keys
 * @template {Schema<any>} Values
 * @extends {Schema<{ [key in Unwrap<Keys>]: Unwrap<Values> }>}
 */
export class $Record extends Schema {
  /**
   * @param {Keys} keys
   * @param {Values} values
   */
  constructor (keys, values) {
    super()
    this.shape = {
      keys, values
    }
  }

  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is { [key in Unwrap<Keys>]: Unwrap<Values> }}
   */
  check (o, err) {
    return o != null && obj.every(o, (vv, vk) => {
      const ck = this.shape.keys.check(vk, err)
      /* c8 ignore next */
      !ck && err?.extend(vk + '', 'Record', typeof o, ck ? 'Key doesn\'t match schema' : 'Value doesn\'t match value')
      return ck && this.shape.values.check(vv, err)
    })
  }
}

/**
 * @template {Schema<string|number|symbol>} Keys
 * @template {Schema<any>} Values
 * @param {Keys} keys
 * @param {Values} values
 * @return {CastToSchema<$Record<Keys,Values>>}
 */
export const $record = (keys, values) => new $Record(keys, values)
export const $$record = $constructedBy($Record)

/**
 * @template {Schema<any>[]} S
 * @extends {Schema<{ [Key in keyof S]: S[Key] extends Schema<infer Type> ? Type : never }>}
 */
export class $Tuple extends Schema {
  /**
   * @param {S} shape
   */
  constructor (shape) {
    super()
    this.shape = shape
  }

  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is { [K in keyof S]: S[K] extends Schema<infer Type> ? Type : never }}
   */
  check (o, err) {
    return o != null && obj.every(this.shape, (vv, vk) => {
      const c = /** @type {Schema<any>} */ (vv).check(o[vk], err)
      /* c8 ignore next */
      !c && err?.extend(vk.toString(), 'Tuple', typeof vv)
      return c
    })
  }
}

/**
 * @template {Array<Schema<any>>} T
 * @param {T} def
 * @return {CastToSchema<$Tuple<T>>}
 */
export const $tuple = (...def) => new $Tuple(def)
export const $$tuple = $constructedBy($Tuple)

/**
 * @template {Schema<any>} S
 * @extends {Schema<Array<S extends Schema<infer T> ? T : never>>}
 */
export class $Array extends Schema {
  /**
   * @param {Array<S>} v
   */
  constructor (v) {
    super()
    /**
     * @type {Schema<S extends Schema<infer T> ? T : never>}
     */
    this.shape = v.length === 1 ? v[0] : new $Union(v)
  }

  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is Array<S extends Schema<infer T> ? T : never>} o
   */
  check (o, err) {
    const c = arr.isArray(o) && arr.every(o, oi => this.shape.check(oi))
    /* c8 ignore next */
    !c && err?.extend(null, 'Array', '')
    return c
  }
}

/**
 * @template {Array<Schema<any>>} T
 * @param {T} def
 * @return {Schema<Array<T extends Array<Schema<infer S>> ? S : never>>}
 */
export const $array = (...def) => new $Array(def)
export const $$array = $constructedBy($Array)
/**
 * @type {Schema<Array<any>>}
 */
export const $arrayAny = $custom(o => arr.isArray(o))

/**
 * @template T
 * @extends {Schema<T>}
 */
export class $InstanceOf extends Schema {
  /**
   * @param {new (...args:any) => T} constructor
   * @param {((o:T) => boolean)|null} check
   */
  constructor (constructor, check) {
    super()
    this.shape = constructor
    this._c = check
  }

  /**
   * @param {any} o
   * @param {ValidationError} err
   * @return {o is T}
   */
  check (o, err) {
    const c = o instanceof this.shape && (this._c == null || this._c(o))
    /* c8 ignore next */
    !c && err?.extend(null, this.shape.name, o?.constructor.name)
    return c
  }
}

/**
 * @template T
 * @param {new (...args:any) => T} c
 * @param {((o:T) => boolean)|null} check
 * @return {Schema<T>}
 */
export const $instanceOf = (c, check = null) => new $InstanceOf(c, check)
export const $$instanceOf = $constructedBy($InstanceOf)

export const $$schema = $instanceOf(Schema)

/**
 * @template {Schema<any>[]} Args
 * @typedef {(...args:UnwrapArray<TuplePop<Args>>)=>Unwrap<TupleLast<Args>>} _LArgsToLambdaDef
 */

/**
 * @template {Array<Schema<any>>} Args
 * @extends {Schema<_LArgsToLambdaDef<Args>>}
 */
export class $Lambda extends Schema {
  /**
   * @param {Args} args
   */
  constructor (args) {
    super()
    this.len = args.length - 1
    this.args = $tuple(...args.slice(-1))
    this.res = args[this.len]
  }

  /**
   * @param {any} f
   * @param {ValidationError} err
   * @return {f is _LArgsToLambdaDef<Args>}
   */
  check (f, err) {
    const c = f.constructor === Function && f.length <= this.len
    /* c8 ignore next */
    !c && err?.extend(null, 'function', typeof f)
    return c
  }
}

/**
 * @template {Schema<any>[]} Args
 * @param {Args} args
 * @return {Schema<(...args:UnwrapArray<TuplePop<Args>>)=>Unwrap<TupleLast<Args>>>}
 */
export const $lambda = (...args) => new $Lambda(args.length > 0 ? args : [$void])
export const $$lambda = $constructedBy($Lambda)

/**
 * @type {Schema<Function>}
 */
export const $function = $custom(o => typeof o === 'function')

/**
 * @template {Array<Schema<any>>} T
 * @extends {Schema<Intersect<UnwrapArray<T>>>}
 */
export class $Intersection extends Schema {
  /**
   * @param {T} v
   */
  constructor (v) {
    super()
    /**
     * @type {T}
     */
    this.shape = v
  }

  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is Intersect<UnwrapArray<T>>}
   */
  check (o, err) {
    // @ts-ignore
    const c = arr.every(this.shape, check => check.check(o, err))
    /* c8 ignore next */
    !c && err?.extend(null, 'Intersectinon', typeof o)
    return c
  }
}

/**
 * @template {Schema<any>[]} T
 * @param {T} def
 * @return {CastToSchema<$Intersection<T>>}
 */
export const $intersect = (...def) => new $Intersection(def)
export const $$intersect = $constructedBy($Intersection, o => o.shape.length > 0) // Intersection with length=0 is considered "any"

/**
 * @template S
 * @extends {Schema<S>}
 */
export class $Union extends Schema {
  static _dilutes = true

  /**
   * @param {Array<Schema<S>>} v
   */
  constructor (v) {
    super()
    this.shape = v
  }

  /**
   * @param {any} o
   * @param {ValidationError} [err]
   * @return {o is S}
   */
  check (o, err) {
    const c = arr.some(this.shape, (vv) => vv.check(o, err))
    err?.extend(null, 'Union', typeof o)
    return c
  }
}

/**
 * @template {Array<any>} T
 * @param {T} schemas
 * @return {CastToSchema<$Union<Unwrap<ReadSchema<T>>>>}
 */
export const $union = (...schemas) => schemas.findIndex($s => $$union.check($s)) >= 0
  ? $union(...schemas.map($s => $($s)).map($s => $$union.check($s) ? $s.shape : [$s]).flat(1))
  : (schemas.length === 1
      ? schemas[0]
      : new $Union(schemas))
export const $$union = /** @type {Schema<$Union<any>>} */ ($constructedBy($Union))

const _t = () => true
/**
 * @type {Schema<any>}
 */
export const $any = $custom(_t)
export const $$any = /** @type {Schema<Schema<any>>} */ ($constructedBy($Custom, o => o.shape === _t))

/**
 * @type {Schema<bigint>}
 */
export const $bigint = $custom(o => typeof o === 'bigint')
export const $$bigint = /** @type {Schema<Schema<BigInt>>} */ ($custom(o => o === $bigint))

/**
 * @type {Schema<symbol>}
 */
export const $symbol = $custom(o => typeof o === 'symbol')
export const $$symbol = /** @type {Schema<Schema<Symbol>>} */ ($custom(o => o === $symbol))

/**
 * @type {Schema<number>}
 */
export const $number = $custom(o => typeof o === 'number')
export const $$number = /** @type {Schema<Schema<number>>} */ ($custom(o => o === $number))

/**
 * @type {Schema<string>}
 */
export const $string = $custom(o => typeof o === 'string')
export const $$string = /** @type {Schema<Schema<string>>} */ ($custom(o => o === $string))

/**
 * @type {Schema<boolean>}
 */
export const $boolean = $custom(o => typeof o === 'boolean')
export const $$boolean = /** @type {Schema<Schema<Boolean>>} */ ($custom(o => o === $boolean))

/**
 * @type {Schema<undefined>}
 */
export const $undefined = $literal(undefined)
export const $$undefined = /** @type {Schema<Schema<undefined>>} */ ($constructedBy($Literal, o => o.shape.length === 1 && o.shape[0] === undefined))

/**
 * @type {Schema<void>}
 */
export const $void = $literal(undefined)
export const $$void = /** @type {Schema<Schema<void>>} */ ($$undefined)

export const $null = $literal(null)
export const $$null = /** @type {Schema<Schema<null>>} */ ($constructedBy($Literal, o => o.shape.length === 1 && o.shape[0] === null))

export const $uint8Array = $constructedBy(Uint8Array)
export const $$uint8Array = /** @type {Schema<Schema<Uint8Array>>} */ ($constructedBy($ConstructedBy, o => o.shape === Uint8Array))

/**
 * @type {Schema<Primitive>}
 */
export const $primitive = $union($number, $string, $null, $undefined, $bigint, $boolean, $symbol)

/**
 * @typedef {JSON[]} JSONArray
 */
/**
 * @typedef {Primitive|JSONArray|{ [key:string]:JSON }} JSON
 */
/**
 * @type {Schema<null|number|string|boolean|JSON[]|{[key:string]:JSON}>}
 */
export const $json = (() => {
  const $jsonArr = /** @type {$Array<$any>} */ ($array($any))
  const $jsonRecord = /** @type {$Record<$string,$any>} */ ($record($string, $any))
  const $json = $union($number, $string, $null, $boolean, $jsonArr, $jsonRecord)
  $jsonArr.shape = $json
  $jsonRecord.shape.values = $json
  return $json
})()

/**
 * @template {any} IN
 * @typedef {IN extends Schema<any> ? IN
 *   : (IN extends string|number|boolean|null ? Schema<IN>
 *     : (IN extends new (...args:any[])=>any ? Schema<InstanceType<IN>>
 *       : (IN extends any[] ? Schema<{ [K in keyof IN]: Unwrap<ReadSchema<IN[K]>> }[number]>
   *       : (IN extends object ? (_ObjectDefToSchema<{[K in keyof IN]:ReadSchema<IN[K]>}> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K] }> : never)
   *         : never)
 *         )
 *       )
 *     )
 * } ReadSchemaOld
 */

/**
 * @template {any} IN
 * @typedef {[Extract<IN,Schema<any>>,Extract<IN,string|number|boolean|null>,Extract<IN,new (...args:any[])=>any>,Extract<IN,any[]>,Extract<Exclude<IN,Schema<any>|string|number|boolean|null|(new (...args:any[])=>any)|any[]>,object>] extends [infer Schemas, infer Primitives, infer Constructors, infer Arrs, infer Obj]
 *   ? Schema<
 *       (Schemas extends Schema<infer S> ? S : never)
 *     | Primitives
 *     | (Constructors extends new (...args:any[])=>any ? InstanceType<Constructors> : never)
 *     | (Arrs extends any[] ? { [K in keyof Arrs]: Unwrap<ReadSchema<Arrs[K]>> }[number] : never)
 *     | (Obj extends object ? Unwrap<(_ObjectDefToSchema<{[K in keyof Obj]:ReadSchema<Obj[K]>}> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K] }> : never)> : never)>
 *   : never
 * } ReadSchema
 */

/**
 * @typedef {ReadSchema<{x:42}|{y:99}|Schema<string>|[1,2,{}]>} Q
 */

/**
 * @template IN
 * @param {IN} o
 * @return {ReadSchema<IN>}
 */
export const $ = o => {
  if ($$schema.check(o)) {
    return /** @type {any} */ (o)
  } else if ($objectAny.check(o)) {
    /**
     * @type {any}
     */
    const o2 = {}
    for (const k in o) {
      o2[k] = $(o[k])
    }
    return /** @type {any} */ ($object(o2))
  } else if ($arrayAny.check(o)) {
    return /** @type {any} */ ($union(...o.map($)))
  } else if ($primitive.check(o)) {
    return /** @type {any} */ ($literal(o))
  } else if ($function.check(o)) {
    return /** @type {any} */ ($constructedBy(/** @type {any} */ (o)))
  }
  /* c8 ignore next */
  error.unexpectedCase()
}

/* c8 ignore start */
/**
 * Assert that a variable is of this specific type.
 * The assertion check is only performed in non-production environments.
 *
 * @type {<T>(o:any,schema:Schema<T>) => asserts o is T}
 */
export const assert = env.production
  ? () => {}
  : (o, schema) => {
      const err = new ValidationError()
      if (!schema.check(o, err)) {
        throw error.create(`Expected value to be of type ${schema.constructor.name}.\n${err.toString()}`)
      }
    }
/* c8 ignore end */

/**
 * @template In
 * @template Out
 * @typedef {{ if: Schema<In>, h: (o:In,state?:any)=>Out }} Pattern
 */

/**
 * @template {Pattern<any,any>} P
 * @template In
 * @typedef {ReturnType<Extract<P,Pattern<In extends number ? number : (In extends string ? string : In),any>>['h']>} PatternMatchResult
 */

/**
 * @todo move this to separate library
 * @template {any} [State=undefined]
 * @template {Pattern<any,any>} [Patterns=never]
 */
export class PatternMatcher {
  /**
   * @param {Schema<State>} [$state]
   */
  constructor ($state) {
    /**
     * @type {Array<Patterns>}
     */
    this.patterns = []
    this.$state = $state
  }

  /**
   * @template P
   * @template R
   * @param {P} pattern
   * @param {(o:NoInfer<Unwrap<ReadSchema<P>>>,s:State)=>R} handler
   * @return {PatternMatcher<State,Patterns|Pattern<Unwrap<ReadSchema<P>>,R>>}
   */
  if (pattern, handler) {
    // @ts-ignore
    this.patterns.push({ if: $(pattern), h: handler })
    // @ts-ignore
    return this
  }

  /**
   * @template R
   * @param {(o:any,s:State)=>R} h
   */
  else (h) {
    return this.if($any, h)
  }

  /**
   * @return {State extends undefined
   *   ? <In extends Unwrap<Patterns['if']>>(o:In,state?:undefined)=>PatternMatchResult<Patterns,In>
   *   : <In extends Unwrap<Patterns['if']>>(o:In,state:State)=>PatternMatchResult<Patterns,In>}
   */
  done () {
    // @ts-ignore
    return /** @type {any} */ (o, s) => {
      for (let i = 0; i < this.patterns.length; i++) {
        const p = this.patterns[i]
        if (p.if.check(o)) {
          // @ts-ignore
          return p.h(o, s)
        }
      }
      throw error.create('Unhandled pattern')
    }
  }
}

/**
 * @template [State=undefined]
 * @param {State} [state]
 * @return {PatternMatcher<State extends undefined ? undefined : Unwrap<ReadSchema<State>>>}
 */
export const match = state => new PatternMatcher(/** @type {any} */ (state))

/**
 * Helper function to generate a (non-exhaustive) sample set from a gives schema.
 *
 * @type {<T>(o:T,gen:prng.PRNG)=>T}
 */
const _random = /** @type {any} */ (match(/** @type {Schema<prng.PRNG>} */ ($any))
  .if($$number, (_o, gen) => prng.int53(gen, number.MIN_SAFE_INTEGER, number.MAX_SAFE_INTEGER))
  .if($$string, (_o, gen) => prng.word(gen))
  .if($$boolean, (_o, gen) => prng.bool(gen))
  .if($$bigint, (_o, gen) => BigInt(prng.int53(gen, number.MIN_SAFE_INTEGER, number.MAX_SAFE_INTEGER)))
  .if($$union, (o, gen) => random(gen, prng.oneOf(gen, o.shape)))
  .if($$object, (o, gen) => {
    /**
     * @type {any}
     */
    const res = {}
    for (const k in o.shape) {
      let prop = o.shape[k]
      if ($$optional.check(prop)) {
        if (prng.bool(gen)) { continue }
        prop = prop.shape
      }
      res[k] = _random(prop, gen)
    }
    return res
  })
  .if($$array, (o, gen) => {
    const arr = []
    const n = prng.int32(gen, 0, 42)
    for (let i = 0; i < n; i++) {
      arr.push(random(gen, o.shape))
    }
    return arr
  })
  .if($$literal, (o, gen) => {
    return prng.oneOf(gen, o.shape)
  })
  .if($$null, (o, gen) => {
    return null
  })
  .if($$lambda, (o, gen) => {
    const res = random(gen, o.res)
    return () => res
  })
  .if($$any, (o, gen) => random(gen, prng.oneOf(gen, [
    $number, $string, $null, $undefined, $bigint, $boolean,
    $array($number),
    $record($union('a', 'b', 'c'), $number)
  ])))
  .if($$record, (o, gen) => {
    /**
     * @type {any}
     */
    const res = {}
    const keysN = prng.int53(gen, 0, 3)
    for (let i = 0; i < keysN; i++) {
      const key = random(gen, o.shape.keys)
      const val = random(gen, o.shape.values)
      res[key] = val
    }
    return res
  })
  .done())

/**
 * @template S
 * @param {prng.PRNG} gen
 * @param {S} schema
 * @return {Unwrap<ReadSchema<S>>}
 */
export const random = (gen, schema) => /** @type {any} */ (_random($(schema), gen))
