/**
 * @typedef {typeof import("typescript")} TypeScript
 * @typedef {import("typescript").Type} Type
 * @typedef {import("typescript").ObjectType} ObjectType
 * @typedef {import("typescript").InterfaceType} InterfaceType
 * @typedef {import("typescript").TypeReference} TypeReference
 * @typedef {import("typescript").UnionOrIntersectionType} UnionOrIntersectionType
 * @typedef {import("typescript").TypeParameter} TypeParameter
 */

/** @type {TypeScript | undefined} */
let cacheTypeScript

module.exports = {
  getTypeScript,
  isObject,
  isAny,
  isUnknown,
  isNever,
  isNull,
  isFunction,
  isArrayLikeObject,
  isStringLike,
  isNumberLike,
  isBooleanLike,
  isBigIntLike,
  isReferenceObject,
  extractTypeFlags,
  extractObjectFlags
}

/**
 * Get TypeScript instance
 */
function getTypeScript() {
  if (cacheTypeScript) {
    return cacheTypeScript
  }
  try {
    return (cacheTypeScript = require('typescript'))
  } catch (error) {
    if (/** @type {any} */ (error).code === 'MODULE_NOT_FOUND') {
      return undefined
    }

    throw error
  }
}
/**
 * For debug
 * @param {Type} tsType
 * @returns {string[]}
 */
function extractTypeFlags(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  /** @type {string[]} */
  const result = []
  const keys = /** @type {(keyof (typeof ts.TypeFlags))[]} */ (
    Object.keys(ts.TypeFlags)
  )
  for (const k of keys) {
    if ((tsType.flags & ts.TypeFlags[k]) !== 0) {
      result.push(k)
    }
  }
  return result
}
/**
 * For debug
 * @param {Type} tsType
 * @returns {string[]}
 */
function extractObjectFlags(tsType) {
  if (!isObject(tsType)) {
    return []
  }
  const ts = /** @type {TypeScript} */ (getTypeScript())
  /** @type {string[]} */
  const result = []
  const keys = /** @type {(keyof (typeof ts.ObjectFlags))[]} */ (
    Object.keys(ts.ObjectFlags)
  )
  for (const k of keys) {
    if ((tsType.objectFlags & ts.ObjectFlags[k]) !== 0) {
      result.push(k)
    }
  }
  return result
}

/**
 * Check if a given type is an object type or not.
 * @param {Type} tsType The type to check.
 * @returns {tsType is ObjectType}
 */
function isObject(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.Object) !== 0
}

/**
 * Check if a given type is an array-like type or not.
 * @param {Type} tsType The type to check.
 */
function isArrayLikeObject(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (
    isObject(tsType) &&
    (tsType.objectFlags &
      (ts.ObjectFlags.ArrayLiteral |
        ts.ObjectFlags.EvolvingArray |
        ts.ObjectFlags.Tuple)) !==
      0
  )
}
/**
 * Check if a given type is an any type or not.
 * @param {Type} tsType The type to check.
 */
function isAny(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.Any) !== 0
}
/**
 * Check if a given type is an unknown type or not.
 * @param {Type} tsType The type to check.
 */
function isUnknown(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.Unknown) !== 0
}
/**
 * Check if a given type is a never type or not.
 * @param {Type} tsType The type to check.
 */
function isNever(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.Never) !== 0
}
/**
 * Check if a given type is an null type or not.
 * @param {Type} tsType The type to check.
 */
function isNull(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.Null) !== 0
}

/**
 * Check if a given type is a string-like type or not.
 * @param {Type} tsType The type to check.
 * @returns {boolean} `true` if the type is a string-like type.
 */
function isStringLike(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.StringLike) !== 0
}
/**
 * Check if a given type is an number-like type or not.
 * @param {Type} tsType The type to check.
 * @returns {boolean} `true` if the type is a number-like type.
 */
function isNumberLike(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.NumberLike) !== 0
}
/**
 * Check if a given type is an boolean-like type or not.
 * @param {Type} tsType The type to check.
 * @returns {boolean} `true` if the type is a boolean-like type.
 */
function isBooleanLike(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.BooleanLike) !== 0
}
/**
 * Check if a given type is an bigint-like type or not.
 * @param {Type} tsType The type to check.
 * @returns {boolean} `true` if the type is a bigint-like type.
 */
function isBigIntLike(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (tsType.flags & ts.TypeFlags.BigIntLike) !== 0
}

/**
 * Check if a given type is a reference type or not.
 * @param {Type} tsType The type to check.
 * @returns {tsType is TypeReference} `true` if the type is a reference type.
 */
function isReferenceObject(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  return (
    isObject(tsType) && (tsType.objectFlags & ts.ObjectFlags.Reference) !== 0
  )
}
/**
 * Check if a given type is `function` or not.
 * @param {Type} tsType The type to check.
 */
function isFunction(tsType) {
  const ts = /** @type {TypeScript} */ (getTypeScript())
  if (
    tsType.symbol &&
    (tsType.symbol.flags &
      (ts.SymbolFlags.Function | ts.SymbolFlags.Method)) !==
      0
  ) {
    return true
  }

  const signatures = tsType.getCallSignatures()
  return signatures.length > 0
}
