'use strict'

/* This file implements operations for static tracing of evaluated items/properties, which is also
 * used to determine whether dynamic evaluated tracing is required or the schema can be compiled
 * with only statical checks.
 *
 * That is done by keeping track of evaluated and potentially evaluated and accounting to that
 * while doing merges and intersections.
 *
 * isDynamic() checks that all potentially evaluated are also definitely evaluated, seperately
 * for items and properties, for use with unevaluatedItems and unevaluatedProperties.
 *
 * WARNING: it is important that this doesn't produce invalid information. i.e.:
 *  * Extra properties or patterns, too high items
 *  * Missing dyn.properties or dyn.patterns, too low dyn.items
 *  * Extra fullstring flag or required entries
 *  * Missing types, if type is present
 *  * Missing unknown or dyn.item
 *
 * The other way around is non-optimal but safe.
 *
 * null means any type (i.e. any type is possible, not validated)
 * true in properties means any property (i.e. all properties were evaluated)
 * fullstring means that the object is not an unvalidated string (i.e. is either validated or not a string)
 * unknown means that there could be evaluated items or properties unknown to both top-level or dyn
 * dyn.item (bool) means there could be possible specific evaluated items, e.g. from "contains".
 *
 * For normalization:
 *   1. If type is applicable:
 *     * dyn.items >= items,
 *     * dyn.properties includes properties
 *     * dyn.patterns includes patterns.
 *   2. If type is not applicable, the following rules apply:
 *     * `fullstring = true` if `string` type is not applicable
 *     * `items = Infinity`, `dyn.item = false`, `dyn.items = 0` if `array` type is not applicable
 *     * `properties = [true]`, `dyn.properties = []` if `object` type is not applicable
 *     * `patterns = dyn.patterns = []` if `object` type is not applicable
 *     * `required = []` if `object` type is not applicable
 *
 * That allows to simplify the `or` operation.
 */

const merge = (a, b) => [...new Set([...a, ...b])].sort()
const intersect = (a, b) => a.filter((x) => b.includes(x))
const wrapArgs = (f) => (...args) => f(...args.map(normalize))
const wrapFull = (f) => (...args) => normalize(f(...args.map(normalize)))
const typeIsNot = (type, t) => type && !type.includes(t) // type=null means any and includes anything

const normalize = ({ type = null, dyn: d = {}, ...A }) => ({
  type: type ? [...type].sort() : type,
  items: typeIsNot(type, 'array') ? Infinity : A.items || 0,
  properties: typeIsNot(type, 'object') ? [true] : [...(A.properties || [])].sort(),
  patterns: typeIsNot(type, 'object') ? [] : [...(A.patterns || [])].sort(),
  required: typeIsNot(type, 'object') ? [] : [...(A.required || [])].sort(),
  fullstring: typeIsNot(type, 'string') || A.fullstring || false,
  dyn: {
    item: typeIsNot(type, 'array') ? false : d.item || false,
    items: typeIsNot(type, 'array') ? 0 : Math.max(A.items || 0, d.items || 0),
    properties: typeIsNot(type, 'object') ? [] : merge(A.properties || [], d.properties || []),
    patterns: typeIsNot(type, 'object') ? [] : merge(A.patterns || [], d.patterns || []),
  },
  unknown: (A.unknown && !(typeIsNot(type, 'object') && typeIsNot(type, 'array'))) || false,
})

const initTracing = () => normalize({})

// Result means that both sets A and B are correct
// type is intersected, lists of known properties are merged
const andDelta = wrapFull((A, B) => ({
  type: A.type && B.type ? intersect(A.type, B.type) : A.type || B.type || null,
  items: Math.max(A.items, B.items),
  properties: merge(A.properties, B.properties),
  patterns: merge(A.patterns, B.patterns),
  required: merge(A.required, B.required),
  fullstring: A.fullstring || B.fullstring,
  dyn: {
    item: A.dyn.item || B.dyn.item,
    items: Math.max(A.dyn.items, B.dyn.items),
    properties: merge(A.dyn.properties, B.dyn.properties),
    patterns: merge(A.dyn.patterns, B.dyn.patterns),
  },
  unknown: A.unknown || B.unknown,
}))

const regtest = (pattern, value) => value !== true && new RegExp(pattern, 'u').test(value)

const intersectProps = ({ properties: a, patterns: rega }, { properties: b, patterns: regb }) => {
  // properties
  const af = a.filter((x) => b.includes(x) || b.includes(true) || regb.some((p) => regtest(p, x)))
  const bf = b.filter((x) => a.includes(x) || a.includes(true) || rega.some((p) => regtest(p, x)))
  // patterns
  const ar = rega.filter((x) => regb.includes(x) || b.includes(true))
  const br = regb.filter((x) => rega.includes(x) || a.includes(true))
  return { properties: merge(af, bf), patterns: merge(ar, br) }
}

const inProperties = ({ properties: a, patterns: rega }, { properties: b, patterns: regb }) =>
  b.every((x) => a.includes(x) || a.includes(true) || rega.some((p) => regtest(p, x))) &&
  regb.every((x) => rega.includes(x) || a.includes(true))

// Result means that at least one of sets A and B is correct
// type is merged, lists of known properties are intersected, lists of dynamic properties are merged
const orDelta = wrapFull((A, B) => ({
  type: A.type && B.type ? merge(A.type, B.type) : null,
  items: Math.min(A.items, B.items),
  ...intersectProps(A, B),
  required:
    (typeIsNot(A.type, 'object') && B.required) ||
    (typeIsNot(B.type, 'object') && A.required) ||
    intersect(A.required, B.required),
  fullstring: A.fullstring && B.fullstring,
  dyn: {
    item: A.dyn.item || B.dyn.item,
    items: Math.max(A.dyn.items, B.dyn.items),
    properties: merge(A.dyn.properties, B.dyn.properties),
    patterns: merge(A.dyn.patterns, B.dyn.patterns),
  },
  unknown: A.unknown || B.unknown,
}))

const applyDelta = (stat, delta) => Object.assign(stat, andDelta(stat, delta))

const isDynamic = wrapArgs(({ unknown, items, dyn, ...stat }) => ({
  items: items !== Infinity && (unknown || dyn.items > items || dyn.item),
  properties: !stat.properties.includes(true) && (unknown || !inProperties(stat, dyn)),
}))

module.exports = { initTracing, andDelta, orDelta, applyDelta, isDynamic, inProperties }
