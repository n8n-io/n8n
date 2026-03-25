/**
 * @beta this API is about to change
 *
 * ## Mutability
 *
 * Deltas are mutable by default. But references are often shared, by marking a Delta as "done". You
 * may only modify deltas by applying other deltas to them. Casting a Delta to a DeltaBuilder
 * manually, will likely modify "shared" state.
 */

import * as list from '../list.js'
import * as object from '../object.js'
import * as equalityTrait from '../trait/equality.js'
import * as fingerprintTrait from '../trait/fingerprint.js'
import * as arr from '../array.js'
import * as fun from '../function.js'
import * as s from '../schema.js'
import * as error from '../error.js'
import * as math from '../math.js'
import * as rabin from '../hash/rabin.js'
import * as encoding from '../encoding.js'
import * as buffer from '../buffer.js'
import * as patience from '../diff/patience.js'
import * as prng from '../prng.js'

/**
 * @typedef {{
 *   insert?: string[]
 *   insertAt?: number
 *   delete?: string[]
 *   deleteAt?: number
 *   format?: Record<string,string[]>
 *   formatAt?: number
 * }} Attribution
 */

/**
 * @type {s.Schema<Attribution>}
 */
export const $attribution = s.$object({
  insert: s.$array(s.$string).optional,
  insertAt: s.$number.optional,
  delete: s.$array(s.$string).optional,
  deleteAt: s.$number.optional,
  format: s.$record(s.$string, s.$array(s.$string)).optional,
  formatAt: s.$number.optional
})

/**
 * @typedef {s.Unwrap<$anyOp>} DeltaOps
 */

/**
 * @typedef {{ [key: string]: any }} FormattingAttributes
 */

/**
 * @typedef {{
 *   type: 'delta',
 *   name?: string,
 *   attrs?: { [Key in string|number]: DeltaAttrOpJSON },
 *   children?: Array<DeltaListOpJSON>
 * }} DeltaJSON
 */

/**
 * @typedef {{ type: 'insert', insert: string|Array<any>, format?: { [key: string]: any }, attribution?: Attribution } | { delete: number } | { type: 'retain', retain: number, format?: { [key:string]: any }, attribution?: Attribution } | { type: 'modify', value: object }} DeltaListOpJSON
 */

/**
 * @typedef {{ type: 'insert', value: any, prevValue?: any, attribution?: Attribution } | { type: 'delete', prevValue?: any, attribution?: Attribution } | { type: 'modify', value: DeltaJSON }} DeltaAttrOpJSON
 */

/**
 * @typedef {TextOp|InsertOp<any>|DeleteOp|RetainOp|ModifyOp<any>} ChildrenOpAny
 */

/**
 * @typedef {AttrInsertOp<any>|AttrDeleteOp<any>|AttrModifyOp} AttrOpAny
 */

/**
 * @typedef {ChildrenOpAny|AttrOpAny} _OpAny
 */

/**
 * @type {s.Schema<DeltaAttrOpJSON>}
 */
export const $deltaMapChangeJson = s.$union(
  s.$object({ type: s.$literal('insert'), value: s.$any, prevValue: s.$any.optional, attribution: $attribution.optional }),
  s.$object({ type: s.$literal('modify'), value: s.$any }),
  s.$object({ type: s.$literal('delete'), prevValue: s.$any.optional, attribution: $attribution.optional })
)

/**
 * @template {{[key:string]: any} | null} Attrs
 * @param {Attrs} attrs
 * @return {Attrs}
 */
const _cloneAttrs = attrs => attrs == null ? attrs : { ...attrs }
/**
 * @template {any} MaybeDelta
 * @param {MaybeDelta} maybeDelta
 * @return {MaybeDelta}
 */
const _markMaybeDeltaAsDone = maybeDelta => $deltaAny.check(maybeDelta) ? /** @type {MaybeDelta} */ (maybeDelta.done()) : maybeDelta

export class TextOp extends list.ListNode {
  /**
   * @param {string} insert
   * @param {FormattingAttributes|null} format
   * @param {Attribution?} attribution
   */
  constructor (insert, format, attribution) {
    super()
    // Whenever this is modified, make sure to clear _fingerprint
    /**
     * @readonly
     * @type {string}
     */
    this.insert = insert
    /**
     * @readonly
     * @type {FormattingAttributes|null}
     */
    this.format = format
    this.attribution = attribution
    /**
     * @type {string?}
     */
    this._fingerprint = null
  }

  /**
   * @param {string} newVal
   */
  _updateInsert (newVal) {
    // @ts-ignore
    this.insert = newVal
    this._fingerprint = null
  }

  /**
   * @return {'insert'}
   */
  get type () {
    return 'insert'
  }

  get length () {
    return this.insert.length
  }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 0) // textOp type: 0
      encoding.writeVarString(encoder, this.insert)
      encoding.writeAny(encoder, this.format)
    })))
  }

  /**
   * Remove a part of the operation (similar to Array.splice)
   *
   * @param {number} offset
   * @param {number} len
   */
  _splice (offset, len) {
    this._fingerprint = null
    // @ts-ignore
    this.insert = this.insert.slice(0, offset) + this.insert.slice(offset + len)
    return this
  }

  /**
   * @return {DeltaListOpJSON}
   */
  toJSON () {
    const { insert, format, attribution } = this
    return object.assign(/** @type {{type: 'insert', insert: string}} */ ({ type: 'insert', insert }), format != null ? { format } : ({}), attribution != null ? { attribution } : ({}))
  }

  /**
   * @param {TextOp} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return fun.equalityDeep(this.insert, other.insert) && fun.equalityDeep(this.format, other.format) && fun.equalityDeep(this.attribution, other.attribution)
  }

  /**
   * @return {TextOp}
   */
  clone (start = 0, end = this.length) {
    return new TextOp(this.insert.slice(start, end), _cloneAttrs(this.format), _cloneAttrs(this.attribution))
  }
}

/**
 * @template {fingerprintTrait.Fingerprintable} ArrayContent
 */
export class InsertOp extends list.ListNode {
  /**
   * @param {Array<ArrayContent>} insert
   * @param {FormattingAttributes|null} format
   * @param {Attribution?} attribution
   */
  constructor (insert, format, attribution) {
    super()
    /**
     * @readonly
     * @type {Array<ArrayContent>}
     */
    this.insert = insert
    /**
     * @readonly
     * @type {FormattingAttributes?}
     */
    this.format = format
    /**
     * @readonly
     * @type {Attribution?}
     */
    this.attribution = attribution
    /**
     * @type {string?}
     */
    this._fingerprint = null
  }

  /**
   * @param {ArrayContent} newVal
   */
  _updateInsert (newVal) {
    // @ts-ignore
    this.insert = newVal
    this._fingerprint = null
  }

  /**
   * @return {'insert'}
   */
  get type () {
    return 'insert'
  }

  get length () {
    return this.insert.length
  }

  /**
   * @param {number} i
   * @return {Extract<ArrayContent,DeltaAny>}
   */
  _modValue (i) {
    /**
     * @type {any}
     */
    let d = this.insert[i]
    this._fingerprint = null
    $deltaAny.expect(d)
    if (d.isDone) {
      // @ts-ignore
      this.insert[i] = (d = clone(d))
      return d
    }
    return d
  }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 1) // insertOp type: 1
      encoding.writeVarUint(encoder, this.insert.length)
      this.insert.forEach(ins => {
        encoding.writeVarString(encoder, fingerprintTrait.fingerprint(ins))
      })
      encoding.writeAny(encoder, this.format)
    })))
  }

  /**
   * Remove a part of the operation (similar to Array.splice)
   *
   * @param {number} offset
   * @param {number} len
   */
  _splice (offset, len) {
    this._fingerprint = null
    this.insert.splice(offset, len)
    return this
  }

  /**
   * @return {DeltaListOpJSON}
   */
  toJSON () {
    const { insert, format, attribution } = this
    return object.assign({ type: /** @type {'insert'} */ ('insert'), insert: insert.map(ins => $deltaAny.check(ins) ? ins.toJSON() : ins) }, format ? { format } : ({}), attribution != null ? { attribution } : ({}))
  }

  /**
   * @param {InsertOp<ArrayContent>} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return fun.equalityDeep(this.insert, other.insert) && fun.equalityDeep(this.format, other.format) && fun.equalityDeep(this.attribution, other.attribution)
  }

  /**
   * @return {InsertOp<ArrayContent>}
   */
  clone (start = 0, end = this.length) {
    return new InsertOp(this.insert.slice(start, end).map(_markMaybeDeltaAsDone), _cloneAttrs(this.format), _cloneAttrs(this.attribution))
  }
}

/**
 * @template {fingerprintTrait.Fingerprintable} [Children=never]
 * @template {string} [Text=never]
 */
export class DeleteOp extends list.ListNode {
  /**
   * @param {number} len
   */
  constructor (len) {
    super()
    this.delete = len
    /**
     * @type {(Children|Text) extends never ? null : (Delta<any,{},Children,Text>?)}
     */
    this.prevValue = null
    /**
     * @type {string|null}
     */
    this._fingerprint = null
  }

  /**
   * @return {'delete'}
   */
  get type () {
    return 'delete'
  }

  get length () {
    return 0
  }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 2) // deleteOp type: 2
      encoding.writeVarUint(encoder, this.delete)
    })))
  }

  /**
   * Remove a part of the operation (similar to Array.splice)
   *
   * @param {number} _offset
   * @param {number} len
   */
  _splice (_offset, len) {
    this.prevValue = /** @type {any} */ (this.prevValue?.slice(_offset, len) || null)
    this._fingerprint = null
    this.delete -= len
    return this
  }

  /**
   * @return {DeltaListOpJSON}
   */
  toJSON () {
    return { delete: this.delete }
  }

  /**
   * @param {DeleteOp} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return this.delete === other.delete
  }

  clone (start = 0, end = this.delete) {
    return new DeleteOp(end - start)
  }
}

export class RetainOp extends list.ListNode {
  /**
   * @param {number} retain
   * @param {FormattingAttributes|null} format
   * @param {Attribution?} attribution
   */
  constructor (retain, format, attribution) {
    super()
    /**
     * @readonly
     * @type {number}
     */
    this.retain = retain
    /**
     * @readonly
     * @type {FormattingAttributes?}
     */
    this.format = format
    /**
     * @readonly
     * @type {Attribution?}
     */
    this.attribution = attribution
    /**
     * @type {string|null}
     */
    this._fingerprint = null
  }

  /**
   * @return {'retain'}
   */
  get type () {
    return 'retain'
  }

  get length () {
    return this.retain
  }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 3) // retainOp type: 3
      encoding.writeVarUint(encoder, this.retain)
      encoding.writeAny(encoder, this.format)
    })))
  }

  /**
   * Remove a part of the operation (similar to Array.splice)
   *
   * @param {number} _offset
   * @param {number} len
   */
  _splice (_offset, len) {
    // @ts-ignore
    this.retain -= len
    this._fingerprint = null
    return this
  }

  /**
   * @return {DeltaListOpJSON}
   */
  toJSON () {
    const { retain, format, attribution } = this
    return object.assign({ type: /** @type {'retain'} */ ('retain'), retain }, format ? { format } : {}, attribution != null ? { attribution } : {})
  }

  /**
   * @param {RetainOp} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return this.retain === other.retain && fun.equalityDeep(this.format, other.format) && fun.equalityDeep(this.attribution, other.attribution)
  }

  clone (start = 0, end = this.retain) {
    return new RetainOp(end - start, _cloneAttrs(this.format), _cloneAttrs(this.attribution))
  }
}

/**
 * Delta that can be applied on a YType Embed
 *
 * @template {DeltaAny} [DTypes=DeltaAny]
 */
export class ModifyOp extends list.ListNode {
  /**
   * @param {DTypes} delta
   * @param {FormattingAttributes|null} format
   * @param {Attribution?} attribution
   */
  constructor (delta, format, attribution) {
    super()
    /**
     * @readonly
     * @type {DTypes}
     */
    this.value = delta
    /**
     * @readonly
     * @type {FormattingAttributes?}
     */
    this.format = format
    /**
     * @readonly
     * @type {Attribution?}
     */
    this.attribution = attribution
    /**
     * @type {string|null}
     */
    this._fingerprint = null
  }

  /**
   * @return {'modify'}
   */
  get type () {
    return 'modify'
  }

  get length () {
    return 1
  }

  /**
   * @type {DeltaBuilderAny}
   */
  get _modValue () {
    /**
     * @type {any}
     */
    const d = this.value
    this._fingerprint = null
    if (d.isDone) {
      // @ts-ignore
      return (this.value = clone(d))
    }
    return d
  }

  get fingerprint () {
    // don't cache fingerprint because we don't know when delta changes
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 4) // modifyOp type: 4
      encoding.writeVarString(encoder, this.value.fingerprint)
      encoding.writeAny(encoder, this.format)
    })))
  }

  /**
   * Remove a part of the operation (similar to Array.splice)
   *
   * @param {number} _offset
   * @param {number} _len
   */
  _splice (_offset, _len) {
    return this
  }

  /**
   * @return {DeltaListOpJSON}
   */
  toJSON () {
    const { value, attribution, format } = this
    return object.assign({ type: /** @type {'modify'} */ ('modify'), value: value.toJSON() }, format ? { format } : {}, attribution != null ? { attribution } : {})
  }

  /**
   * @param {ModifyOp<any>} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return this.value[equalityTrait.EqualityTraitSymbol](other.value) && fun.equalityDeep(this.format, other.format) && fun.equalityDeep(this.attribution, other.attribution)
  }

  /**
   * @return {ModifyOp<DTypes>}
   */
  clone () {
    return new ModifyOp(/** @type {DTypes} */ (this.value.done()), _cloneAttrs(this.format), _cloneAttrs(this.attribution))
  }
}

/**
 * @template {fingerprintTrait.Fingerprintable} V
 * @template {string|number} [K=any]
 */
export class AttrInsertOp {
  /**
   * @param {K} key
   * @param {V} value
   * @param {V|undefined} prevValue
   * @param {Attribution?} attribution
   */
  constructor (key, value, prevValue, attribution) {
    /**
     * @readonly
     * @type {K}
     */
    this.key = key
    /**
     * @readonly
     * @type {V}
     */
    this.value = value
    /**
     * @readonly
     * @type {V|undefined}
     */
    this.prevValue = prevValue
    /**
     * @readonly
     * @type {Attribution?}
     */
    this.attribution = attribution
    /**
     * @type {string|null}
     */
    this._fingerprint = null
  }

  /**
   * @return {'insert'}
   */
  get type () { return 'insert' }

  /**
   * @type {DeltaBuilderAny}
   */
  get _modValue () {
    /**
     * @type {any}
     */
    const v = this.value
    this._fingerprint = null
    if ($deltaAny.check(v) && v.isDone) {
      // @ts-ignore
      return (this.value = clone(v))
    }
    return v
  }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 5) // map insert type: 5
      encoding.writeAny(encoder, this.key)
      if ($deltaAny.check(this.value)) {
        encoding.writeUint8(encoder, 0)
        encoding.writeVarString(encoder, this.value.fingerprint)
      } else {
        encoding.writeUint8(encoder, 1)
        encoding.writeAny(encoder, this.value)
      }
    })))
  }

  toJSON () {
    const v = this.value
    const prevValue = this.prevValue
    const attribution = this.attribution
    return object.assign({
      type: this.type,
      value: $deltaAny.check(v) ? v.toJSON() : v
    }, attribution != null ? { attribution } : {}, prevValue !== undefined ? { prevValue } : {})
  }

  /**
   * @param {AttrInsertOp<V>} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return this.key === other.key && fun.equalityDeep(this.value, other.value) && fun.equalityDeep(this.attribution, other.attribution)
  }

  /**
   * @return {AttrInsertOp<V,K>}
   */
  clone () {
    return new AttrInsertOp(this.key, _markMaybeDeltaAsDone(this.value), _markMaybeDeltaAsDone(this.prevValue), _cloneAttrs(this.attribution))
  }
}

/**
 * @template V
 * @template {string|number} [K=string]
 */
export class AttrDeleteOp {
  /**
   * @param {K} key
   * @param {V|undefined} prevValue
   * @param {Attribution?} attribution
   */
  constructor (key, prevValue, attribution) {
    /**
     * @type {K}
     */
    this.key = key
    /**
     * @type {V|undefined}
     */
    this.prevValue = prevValue
    this.attribution = attribution
    /**
     * @type {string|null}
     */
    this._fingerprint = null
  }

  get value () { return undefined }

  /**
   * @type {'delete'}
   */
  get type () { return 'delete' }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 6) // map delete type: 6
      encoding.writeAny(encoder, this.key)
    })))
  }

  /**
   * @return {DeltaAttrOpJSON}
   */
  toJSON () {
    const {
      type, attribution, prevValue
    } = this
    return object.assign({ type }, attribution != null ? { attribution } : {}, prevValue !== undefined ? { prevValue } : {})
  }

  /**
   * @param {AttrDeleteOp<V>} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return this.key === other.key && fun.equalityDeep(this.attribution, other.attribution)
  }

  clone () {
    return new AttrDeleteOp(this.key, _markMaybeDeltaAsDone(this.prevValue), _cloneAttrs(this.attribution))
  }
}

/**
 * @template {DeltaAny} [Modifier=DeltaAny]
 * @template {string|number} [K=string]
 */
export class AttrModifyOp {
  /**
   * @param {K} key
   * @param {Modifier} delta
   */
  constructor (key, delta) {
    /**
     * @readonly
     * @type {K}
     */
    this.key = key
    /**
     * @readonly
     * @type {Modifier}
     */
    this.value = delta
    /**
     * @type {string|null}
     */
    this._fingerprint = null
  }

  /**
   * @type {'modify'}
   */
  get type () { return 'modify' }

  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeVarUint(encoder, 7) // map modify type: 7
      encoding.writeAny(encoder, this.key)
      encoding.writeVarString(encoder, this.value.fingerprint)
    })))
  }

  /**
   * @return {DeltaBuilder}
   */
  get _modValue () {
    this._fingerprint = null
    if (this.value.isDone) {
      // @ts-ignore
      this.value = /** @type {any} */ (clone(this.value))
    }
    // @ts-ignore
    return this.value
  }

  /**
   * @return {DeltaAttrOpJSON}
   */
  toJSON () {
    return {
      type: this.type,
      value: this.value.toJSON()
    }
  }

  /**
   * @param {AttrModifyOp<Modifier>} other
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    return this.key === other.key && this.value[equalityTrait.EqualityTraitSymbol](other.value)
  }

  /**
   * @return {AttrModifyOp<Modifier,K>}
   */
  clone () {
    return new AttrModifyOp(this.key, /** @type {Modifier} */ (this.value.done()))
  }
}

/**
 * @type {s.Schema<AttrDeleteOp<any> | DeleteOp>}
 */
export const $deleteOp = s.$custom(o => o != null && (o.constructor === DeleteOp || o.constructor === AttrDeleteOp))

/**
 * @type {s.Schema<AttrInsertOp<any> | InsertOp<any>>}
 */
export const $insertOp = s.$custom(o => o != null && (o.constructor === AttrInsertOp || o.constructor === InsertOp))

/**
 * @template {fingerprintTrait.Fingerprintable} Content
 * @param {s.Schema<Content>} $content
 * @return {s.Schema<AttrInsertOp<Content> | InsertOp<Content>>}
 */
export const $insertOpWith = $content => s.$custom(o =>
  o != null && (
    (o.constructor === AttrInsertOp && $content.check(/** @type {AttrInsertOp<Content>} */ (o).value)) ||
      (o.constructor === InsertOp && /** @type {InsertOp<Content>} */ (o).insert.every(ins => $content.check(ins)))
  )
)

/**
 * @type {s.Schema<TextOp>}
 */
export const $textOp = s.$constructedBy(TextOp)

/**
 * @type {s.Schema<RetainOp>}
 */
export const $retainOp = s.$constructedBy(RetainOp)

/**
 * @type {s.Schema<AttrModifyOp | ModifyOp>}
 */
export const $modifyOp = s.$custom(o => o != null && (o.constructor === AttrModifyOp || o.constructor === ModifyOp))

/**
 * @template {DeltaAny} Modify
 * @param {s.Schema<Modify>} $content
 * @return {s.Schema<AttrModifyOp<Modify> | ModifyOp<Modify>>}
 */
export const $modifyOpWith = $content => s.$custom(o =>
  o != null && (
    (o.constructor === AttrModifyOp && $content.check(/** @type {AttrModifyOp<Modify>} */ (o).value)) ||
      (o.constructor === ModifyOp && $content.check(/** @type {ModifyOp<Modify>} */ (o).value))
  )
)

export const $anyOp = s.$union($insertOp, $deleteOp, $textOp, $modifyOp)

/**
 * @template {Array<any>|string} C1
 * @template {Array<any>|string} C2
 * @typedef {Extract<C1 | C2, Array<any>> extends never
 *   ? never
 *   : (Array<(Extract<C1 | C2,Array<any>> extends Array<infer AC1> ? (unknown extends AC1 ? never : AC1) : never)>)} MergeListArrays
 */

/**
 * @template {{[Key in string|number]: any}} Attrs
 * @template {string|number} Key
 * @template {any} Val
 * @typedef {{ [K in (Key | keyof Attrs)]: (unknown extends Attrs[K] ? never : Attrs[K]) | (Key extends K ? Val : never) }} AddToAttrs
 */

/**
 * @template {{[Key in string|number|symbol]: any}} Attrs
 * @template {{[Key in string|number|symbol]: any}} NewAttrs
 * @typedef {{ [K in (keyof NewAttrs | keyof Attrs)]: (unknown extends Attrs[K] ? never : Attrs[K]) | (unknown extends NewAttrs[K] ? never : NewAttrs[K]) }} MergeAttrs
 */

/**
 * @template X
 * @typedef {0 extends (1 & X) ? null : X} _AnyToNull
 */

/**
 * @template {s.Schema<Delta<any,any,any,any,any>>|null} Schema
 * @typedef {_AnyToNull<Schema> extends null ? Delta<any,{[key:string|number]:any},any,string> : (Schema extends s.Schema<infer D> ? D : never)} AllowedDeltaFromSchema
 */

/**
 * @typedef {Delta<any,{ [k:string|number]: any },any,any,any>} DeltaAny
 */
/**
 * @typedef {DeltaBuilder<any,{ [k:string|number]: any },any,any,any>} DeltaBuilderAny
 */

/**
 * @template {string} [NodeName=any]
 * @template {{[k:string|number]:any}} [Attrs={}]
 * @template {fingerprintTrait.Fingerprintable} [Children=never]
 * @template {string} [Text=never]
 * @template {s.Schema<Delta<any,any,any,any,any>>|null} [Schema=any]
 */
export class Delta {
  /**
   * @param {NodeName} [name]
   * @param {Schema} [$schema]
   */
  constructor (name, $schema) {
    this.name = name || null
    this.$schema = $schema || null
    /**
     * @type {{ [K in keyof Attrs]?: K extends string|number ? (AttrInsertOp<Attrs[K],K>|AttrDeleteOp<Attrs[K],K>|(Delta extends Attrs[K] ? AttrModifyOp<Extract<Attrs[K],DeltaAny>,K> : never)) : never }
     *   & { [Symbol.iterator]: () => Iterator<{ [K in keyof Attrs]: K extends string|number ? (AttrInsertOp<Attrs[K],K>|AttrDeleteOp<Attrs[K],K>|(Delta extends Attrs[K] ? AttrModifyOp<Extract<Attrs[K],DeltaAny>,K> : never)) : never }[keyof Attrs]> }
     * }
     */
    this.attrs = /** @type {any} */ ({
      * [Symbol.iterator] () {
        for (const k in this) {
          yield this[k]
        }
      }
    })

    /**
     * @type {list.List<
     *   RetainOp
     *   | DeleteOp
     *   | (Text extends never ? never : TextOp)
     *   | (Children extends never ? never : InsertOp<Children>)
     *   | (Delta extends Children ? ModifyOp<Extract<Children,Delta<any,any,any,any,any>>> : never)
     * >}
     */
    this.children = /** @type {any} */ (list.create())
    this.childCnt = 0
    /**
     * @type {any}
     */
    this.origin = null
    /**
     * @type {string|null}
     */
    this._fingerprint = null
    this.isDone = false
  }

  /**
   * @type {string}
   */
  get fingerprint () {
    return this._fingerprint || (this._fingerprint = buffer.toBase64(encoding.encode(encoder => {
      encoding.writeUint32(encoder, 0xf2ae5680) // "magic number" that ensures that different types of content don't yield the same fingerprint
      encoding.writeAny(encoder, this.name)
      /**
       * @type {Array<number|string>}
       */
      const keys = []
      for (const attr of this.attrs) {
        keys.push(attr.key)
      }
      keys.sort((a, b) => {
        const aIsString = s.$string.check(a)
        const bIsString = s.$string.check(b)
        // numbers first
        // in ascending order
        return (aIsString && bIsString)
          ? a.localeCompare(b)
          : (aIsString ? 1 : (bIsString ? -1 : (a - b)))
      })
      encoding.writeVarUint(encoder, keys.length)
      for (const key of keys) {
        encoding.writeVarString(encoder, /** @type {any} */ (this.attrs[/** @type {keyof Attrs} */ (key)]).fingerprint)
      }
      encoding.writeVarUint(encoder, this.children.len)
      for (const child of this.children) {
        encoding.writeVarString(encoder, child.fingerprint)
      }
      return buffer.toBase64(rabin.fingerprint(rabin.StandardIrreducible128, encoding.toUint8Array(encoder)))
    })))
  }

  [fingerprintTrait.FingerprintTraitSymbol] () {
    return this.fingerprint
  }

  isEmpty () {
    return object.isEmpty(this.attrs) && list.isEmpty(this.children)
  }

  /**
   * @return {DeltaJSON}
   */
  toJSON () {
    const name = this.name
    /**
     * @type {any}
     */
    const attrs = {}
    /**
     * @type {any}
     */
    const children = []
    for (const attr of this.attrs) {
      attrs[attr.key] = attr.toJSON()
    }
    this.children.forEach(val => {
      children.push(val.toJSON())
    })
    return object.assign(
      { type: /** @type {'delta'} */ ('delta') },
      (name != null ? { name } : {}),
      (object.isEmpty(attrs) ? {} : { attrs }),
      (children.length > 0 ? { children } : {})
    )
  }

  /**
   * @param {Delta<any,any,any,any,any>} other
   * @return {boolean}
   */
  equals (other) {
    return this[equalityTrait.EqualityTraitSymbol](other)
  }

  /**
   * @param {any} other
   * @return {boolean}
   */
  [equalityTrait.EqualityTraitSymbol] (other) {
    // @todo it is only necessary to compare finrerprints OR do a deep equality check (remove
    // childCnt as well)
    return this.name === other.name && fun.equalityDeep(this.attrs, other.attrs) && fun.equalityDeep(this.children, other.children) && this.childCnt === other.childCnt
  }

  /**
   * @return {DeltaBuilder<NodeName,Attrs,Children,Text,Schema>}
   */
  clone () {
    return this.slice(0, this.childCnt)
  }

  /**
   * @param {number} start
   * @param {number} end
   * @return {DeltaBuilder<NodeName,Attrs,Children,Text,Schema>}
   */
  slice (start = 0, end = this.childCnt) {
    const cpy = /** @type {DeltaAny} */ (new DeltaBuilder(/** @type {any} */ (this.name), this.$schema))
    cpy.origin = this.origin
    // copy attrs
    for (const op of this.attrs) {
      cpy.attrs[op.key] = /** @type {any} */ (op.clone())
    }
    // copy children
    const slicedLen = end - start
    let remainingLen = slicedLen
    /**
     * @type {ChildrenOpAny?}
     */
    let currNode = this.children.start
    let currNodeOffset = 0
    while (start > 0 && currNode != null) {
      if (currNode.length <= start) {
        start -= currNode.length
        currNode = currNode.next
      } else {
        currNodeOffset = start
        start = 0
      }
    }
    if (currNodeOffset > 0 && currNode) {
      const ncpy = currNode.clone(currNodeOffset, currNodeOffset + math.min(remainingLen, currNode.length - currNodeOffset))
      list.pushEnd(cpy.children, ncpy)
      remainingLen -= ncpy.length
      currNode = currNode.next
    }
    while (currNode != null && currNode.length <= remainingLen) {
      list.pushEnd(cpy.children, currNode.clone())
      remainingLen -= currNode.length
      currNode = currNode.next
    }
    if (currNode != null && remainingLen > 0) {
      list.pushEnd(cpy.children, currNode.clone(0, remainingLen))
      remainingLen -= math.min(currNode.length, remainingLen)
    }
    cpy.childCnt = slicedLen - remainingLen
    // @ts-ignore
    return cpy
  }

  /**
   * Mark this delta as done and perform some cleanup (e.g. remove appended retains without
   * formats&attributions). In the future, there might be additional merge operations that can be
   * performed to result in smaller deltas. Set `markAsDone=false` to only perform the cleanup.
   *
   * @return {Delta<NodeName,Attrs,Children,Text,Schema>}
   */
  done (markAsDone = true) {
    if (!this.isDone) {
      this.isDone = markAsDone
      const cs = this.children
      for (let end = cs.end; end !== null && $retainOp.check(end) && end.format == null && end.attribution == null; end = cs.end) {
        this.childCnt -= end.length
        list.popEnd(cs)
      }
    }
    return this
  }
}

/**
 * @template {DeltaAny} D
 * @param {D} d
 * @return {D extends DeltaBuilder<infer NodeName,infer Attrs,infer Children,infer Text,infer Schema> ? DeltaBuilder<NodeName,Attrs,Children,Text,Schema> : never}
 */
export const clone = d => /** @type {any} */ (d.slice(0, d.childCnt))

/**
 * Try merging this op with the previous op
 * @param {list.List<any>} parent
 * @param {InsertOp<any>|RetainOp|DeleteOp|TextOp|ModifyOp<any>} op
 */
const tryMergeWithPrev = (parent, op) => {
  const prevOp = op.prev
  if (
    prevOp?.constructor !== op.constructor ||
    (
      (!$deleteOp.check(op) && !$modifyOp.check(op)) && (!fun.equalityDeep(op.format, /** @type {InsertOp<any>} */ (prevOp).format) || !fun.equalityDeep(op.attribution, /** @type {InsertOp<any>} */ (prevOp).attribution))
    )
  ) {
    // constructor mismatch or format/attribution mismatch
    return
  }
  // can be merged
  if ($insertOp.check(op)) {
    /** @type {InsertOp<any>} */ (prevOp).insert.push(...op.insert)
  } else if ($retainOp.check(op)) {
    // @ts-ignore
    /** @type {RetainOp} */ (prevOp).retain += op.retain
  } else if ($deleteOp.check(op)) {
    /** @type {DeleteOp} */ (prevOp).delete += op.delete
  } else if ($textOp.check(op)) {
    /** @type {TextOp} */ (prevOp)._updateInsert(/** @type {TextOp} */ (prevOp).insert + op.insert)
  } else {
    error.unexpectedCase()
  }
  list.remove(parent, op)
}

/**
 * Ensures that the delta can be edited. clears _fingerprint cache.
 *
 * @param {any} d
 */
const modDeltaCheck = d => {
  if (d.isDone) {
    /**
     * You tried to modify a delta after it has been marked as "done".
     */
    throw error.create("Readonly Delta can't be modified")
  }
  d._fingerprint = null
}

/**
 * @template {string} [NodeName=any]
 * @template {{[key:string|number]:any}} [Attrs={}]
 * @template {fingerprintTrait.Fingerprintable} [Children=never]
 * @template {string} [Text=never]
 * @template {s.Schema<Delta<any,any,any,any,any>>|null} [Schema=any]
 * @extends {Delta<NodeName,Attrs,Children,Text,Schema>}
 */
export class DeltaBuilder extends Delta {
  /**
   * @param {NodeName} [name]
   * @param {Schema} [$schema]
   */
  constructor (name, $schema) {
    super(name, $schema)
    /**
     * @type {FormattingAttributes?}
     */
    this.usedAttributes = null
    /**
     * @type {Attribution?}
     */
    this.usedAttribution = null
  }

  /**
   * @param {Attribution?} attribution
   */
  useAttribution (attribution) {
    modDeltaCheck(this)
    this.usedAttribution = attribution
    return this
  }

  /**
   * @param {FormattingAttributes?} attributes
   * @return {this}
   */
  useAttributes (attributes) {
    modDeltaCheck(this)
    this.usedAttributes = attributes
    return this
  }

  /**
   * @param {string} name
   * @param {any} value
   */
  updateUsedAttributes (name, value) {
    modDeltaCheck(this)
    if (value == null) {
      this.usedAttributes = object.assign({}, this.usedAttributes)
      delete this.usedAttributes?.[name]
      if (object.isEmpty(this.usedAttributes)) {
        this.usedAttributes = null
      }
    } else if (!fun.equalityDeep(this.usedAttributes?.[name], value)) {
      this.usedAttributes = object.assign({}, this.usedAttributes)
      this.usedAttributes[name] = value
    }
    return this
  }

  /**
   * @template {keyof Attribution} NAME
   * @param {NAME} name
   * @param {Attribution[NAME]?} value
   */
  updateUsedAttribution (name, value) {
    modDeltaCheck(this)
    if (value == null) {
      this.usedAttribution = object.assign({}, this.usedAttribution)
      delete this.usedAttribution?.[name]
      if (object.isEmpty(this.usedAttribution)) {
        this.usedAttribution = null
      }
    } else if (!fun.equalityDeep(this.usedAttribution?.[name], value)) {
      this.usedAttribution = object.assign({}, this.usedAttribution)
      this.usedAttribution[name] = value
    }
    return this
  }

  /**
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,any,infer Children,infer Text,infer Schema> ? ((Children extends never ? never : Array<Children>) | Text) : never} NewContent
   * @param {NewContent} insert
   * @param {FormattingAttributes?} [formatting]
   * @param {Attribution?} [attribution]
   * @return {DeltaBuilder<
   *   NodeName,
   *   Attrs,
   *   Exclude<NewContent,string>[number]|Children,
   *   (Extract<NewContent,string>|Text) extends never ? never : string,
   *   Schema
   * >}
   */
  insert (insert, formatting = null, attribution = null) {
    modDeltaCheck(this)
    const mergedAttributes = mergeAttrs(this.usedAttributes, formatting)
    const mergedAttribution = mergeAttrs(this.usedAttribution, attribution)
    /**
     * @param {TextOp | InsertOp<any>} lastOp
     */
    const checkMergedEquals = lastOp => (mergedAttributes === lastOp.format || fun.equalityDeep(mergedAttributes, lastOp.format)) && (mergedAttribution === lastOp.attribution || fun.equalityDeep(mergedAttribution, lastOp.attribution))
    const end = this.children.end
    if (s.$string.check(insert)) {
      if ($textOp.check(end) && checkMergedEquals(end)) {
        end._updateInsert(end.insert + insert)
      } else if (insert.length > 0) {
        list.pushEnd(this.children, new TextOp(insert, object.isEmpty(mergedAttributes) ? null : mergedAttributes, object.isEmpty(mergedAttribution) ? null : mergedAttribution))
      }
      this.childCnt += insert.length
    } else if (arr.isArray(insert)) {
      if ($insertOp.check(end) && checkMergedEquals(end)) {
        // @ts-ignore
        end.insert.push(...insert)
        end._fingerprint = null
      } else if (insert.length > 0) {
        list.pushEnd(this.children, new InsertOp(insert, object.isEmpty(mergedAttributes) ? null : mergedAttributes, object.isEmpty(mergedAttribution) ? null : mergedAttribution))
      }
      this.childCnt += insert.length
    }
    return /** @type {any} */ (this)
  }

  /**
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,any,infer Children,any,any> ? Extract<Children,Delta<any,any,any,any,any>> : never} NewContent
   * @param {NewContent} modify
   * @param {FormattingAttributes?} formatting
   * @param {Attribution?} attribution
   * @return {DeltaBuilder<
   *   NodeName,
   *   Attrs,
   *   Exclude<NewContent,string>[number]|Children,
   *   (Extract<NewContent,string>|Text) extends string ? string : never,
   *   Schema
   * >}
   */
  modify (modify, formatting = null, attribution = null) {
    modDeltaCheck(this)
    const mergedAttributes = mergeAttrs(this.usedAttributes, formatting)
    const mergedAttribution = mergeAttrs(this.usedAttribution, attribution)
    list.pushEnd(this.children, new ModifyOp(modify, object.isEmpty(mergedAttributes) ? null : mergedAttributes, object.isEmpty(mergedAttribution) ? null : mergedAttribution))
    this.childCnt += 1
    return /** @type {any} */ (this)
  }

  /**
   * @param {number} len
   * @param {FormattingAttributes?} [format]
   * @param {Attribution?} [attribution]
   */
  retain (len, format = null, attribution = null) {
    modDeltaCheck(this)
    const mergedFormats = mergeAttrs(this.usedAttributes, format)
    const mergedAttribution = mergeAttrs(this.usedAttribution, attribution)
    const lastOp = /** @type {RetainOp|InsertOp<any>} */ (this.children.end)
    if (lastOp instanceof RetainOp && fun.equalityDeep(mergedFormats, lastOp.format) && fun.equalityDeep(mergedAttribution, lastOp.attribution)) {
      // @ts-ignore
      lastOp.retain += len
    } else if (len > 0) {
      list.pushEnd(this.children, new RetainOp(len, mergedFormats, mergedAttribution))
    }
    this.childCnt += len
    return this
  }

  /**
   * @param {number} len
   */
  delete (len) {
    modDeltaCheck(this)
    const lastOp = /** @type {DeleteOp|InsertOp<any>} */ (this.children.end)
    if (lastOp instanceof DeleteOp) {
      lastOp.delete += len
    } else if (len > 0) {
      list.pushEnd(this.children, new DeleteOp(len))
    }
    this.childCnt += len
    return this
  }

  /**
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer Attrs,any,any,any> ? (keyof Attrs) : never} Key
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer Attrs,any,any,any> ? (Attrs[Key]) : never} Val
   * @param {Key} key
   * @param {Val} val
   * @param {Attribution?} attribution
   * @param {Val|undefined} [prevValue]
   * @return {DeltaBuilder<
   *   NodeName,
   *   { [K in keyof AddToAttrs<Attrs,Key,Val>]: AddToAttrs<Attrs,Key,Val>[K]  },
   *   Children,
   *   Text,
   *   Schema
   * >}
   */
  set (key, val, attribution = null, prevValue) {
    modDeltaCheck(this)
    this.attrs[key] = /** @type {any} */ (new AttrInsertOp(key, val, prevValue, mergeAttrs(this.usedAttribution, attribution)))
    return /** @type {any} */ (this)
  }

  /**
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer Attrs,any,any,any> ? Attrs : never} NewAttrs
   * @param {NewAttrs} attrs
   * @param {Attribution?} attribution
   * @return {DeltaBuilder<
   *   NodeName,
   *   { [K in keyof MergeAttrs<Attrs,NewAttrs>]: MergeAttrs<Attrs,NewAttrs>[K] },
   *   Children,
   *   Text,
   *   Schema
   * >}
   */
  setMany (attrs, attribution = null) {
    modDeltaCheck(this)
    for (const k in attrs) {
      this.set(/** @type {any} */ (k), attrs[k], attribution)
    }
    return /** @type {any} */ (this)
  }

  /**
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer As,any,any,any> ? keyof As : never} Key
   * @param {Key} key
   * @param {Attribution?} attribution
   * @param {any} [prevValue]
   * @return {DeltaBuilder<
   *   NodeName,
   *   { [K in keyof AddToAttrs<Attrs,Key,never>]: AddToAttrs<Attrs,Key,never>[K] },
   *   Children,
   *   Text,
   *   Schema
   * >}
   */
  unset (key, attribution = null, prevValue) {
    modDeltaCheck(this)
    this.attrs[key] = /** @type {any} */ (new AttrDeleteOp(key, prevValue, mergeAttrs(this.usedAttribution, attribution)))
    return /** @type {any} */ (this)
  }

  /**
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer As,any,any,any> ? { [K in keyof As]: Extract<As[K],Delta<any,any,any,any,any>> extends never ? never : K }[keyof As] : never} Key
   * @template {AllowedDeltaFromSchema<Schema> extends Delta<any,infer As,any,any,any> ? Extract<As[Key],Delta<any,any,any,any,any>> : never} D
   * @param {Key} key
   * @param {D} modify
   * @return {DeltaBuilder<
   *   NodeName,
   *   { [K in keyof AddToAttrs<Attrs,Key,D>]: AddToAttrs<Attrs,Key,D>[K]  },
   *   Children,
   *   Text,
   *   Schema
   * >}
   */
  update (key, modify) {
    modDeltaCheck(this)
    this.attrs[key] = /** @type {any} */ (new AttrModifyOp(key, modify))
    return /** @type {any} */ (this)
  }

  /**
   * @param {Delta<NodeName,Attrs,Children,Text,any>} other
   */
  apply (other) {
    modDeltaCheck(this)
    this.$schema?.expect(other)
    // apply attrs
    for (const op of other.attrs) {
      const c = /** @type {AttrInsertOp<any,any>|AttrDeleteOp<any>|AttrModifyOp<any,any>} */ (this.attrs[op.key])
      if ($modifyOp.check(op)) {
        if ($deltaAny.check(c?.value)) {
          c._modValue.apply(op.value)
        } else {
          // then this is a simple modify
          // @ts-ignore
          this.attrs[op.key] = op.clone()
        }
      } else if ($insertOp.check(op)) {
        // @ts-ignore
        op.prevValue = c?.value
        // @ts-ignore
        this.attrs[op.key] = op.clone()
      } else if ($deleteOp.check(op)) {
        op.prevValue = c?.value
        delete this.attrs[op.key]
      }
    }
    // apply children
    /**
     * @type {ChildrenOpAny?}
     */
    let opsI = this.children.start
    let offset = 0
    /**
     * At the end, we will try to merge this op, and op.next op with their respective previous op.
     *
     * Hence, anytime an op is cloned, deleted, or inserted (anytime list.* api is used) we must add
     * an op to maybeMergeable.
     *
     * @type {Array<InsertOp<any>|RetainOp|DeleteOp|TextOp|ModifyOp<any>>}
     */
    const maybeMergeable = []
    /**
     * @template {InsertOp<any>|RetainOp|DeleteOp|TextOp|ModifyOp<any>|null} OP
     * @param {OP} op
     * @return {OP}
     */
    const scheduleForMerge = op => {
      op && maybeMergeable.push(op)
      return op
    }
    other.children.forEach(op => {
      if ($textOp.check(op) || $insertOp.check(op)) {
        if (offset === 0) {
          list.insertBetween(this.children, opsI == null ? this.children.end : opsI.prev, opsI, scheduleForMerge(op.clone()))
        } else {
          // @todo inmplement "splitHelper" and "insertHelper" - I'm splitting all the time and
          // forget to update opsI
          if (opsI == null) error.unexpectedCase()
          const cpy = scheduleForMerge(opsI.clone(offset))
          opsI._splice(offset, opsI.length - offset)
          list.insertBetween(this.children, opsI, opsI.next || null, cpy)
          list.insertBetween(this.children, opsI, cpy || null, scheduleForMerge(op.clone()))
          opsI = cpy
          offset = 0
        }
        this.childCnt += op.insert.length
      } else if ($retainOp.check(op)) {
        let retainLen = op.length

        if (offset > 0 && opsI != null && op.format != null && !$deleteOp.check(opsI) && !object.every(op.format, (v, k) => fun.equalityDeep(v, /** @type {InsertOp<any>|RetainOp|ModifyOp} */ (opsI).format?.[k] || null))) {
          // need to split current op
          const cpy = scheduleForMerge(opsI.clone(offset))
          opsI._splice(offset, opsI.length - offset)
          list.insertBetween(this.children, opsI, opsI.next || null, cpy)
          opsI = cpy
          offset = 0
        }

        while (opsI != null && opsI.length - offset <= retainLen) {
          op.format != null && updateOpFormat(opsI, op.format)
          retainLen -= opsI.length - offset
          opsI = opsI?.next || null
          offset = 0
        }

        if (opsI != null) {
          if (op.format != null && retainLen > 0) {
            // split current op and apply format
            const cpy = scheduleForMerge(opsI.clone(retainLen))
            opsI._splice(retainLen, opsI.length - retainLen)
            list.insertBetween(this.children, opsI, opsI.next || null, cpy)
            updateOpFormat(opsI, op.format)
            opsI = cpy
          } else {
            offset += retainLen
          }
        } else if (retainLen > 0) {
          list.pushEnd(this.children, scheduleForMerge(new RetainOp(retainLen, op.format, op.attribution)))
          this.childCnt += retainLen
        }
      } else if ($deleteOp.check(op)) {
        let remainingLen = op.delete
        while (remainingLen > 0) {
          if (opsI == null) {
            list.pushEnd(this.children, scheduleForMerge(new DeleteOp(remainingLen)))
            this.childCnt += remainingLen
            break
          } else if (opsI instanceof DeleteOp) {
            const delLen = opsI.length - offset
            // the same content can't be deleted twice, remove duplicated deletes
            if (delLen >= remainingLen) {
              offset = 0
              opsI = opsI.next
            } else {
              offset += remainingLen
            }
            remainingLen -= delLen
          } else { // insert / embed / retain / modify ⇒ replace
            // case1: delete o fully
            // case2: delete some part of beginning
            // case3: delete some part of end
            // case4: delete some part of center
            const delLen = math.min(opsI.length - offset, remainingLen)
            this.childCnt -= delLen
            if (opsI.length === delLen) {
              // case 1
              offset = 0
              scheduleForMerge(opsI.next)
              list.remove(this.children, opsI)
              opsI = opsI.next
            } else if (offset === 0) {
              // case 2
              offset = 0
              opsI._splice(0, delLen)
            } else if (offset + delLen === opsI.length) {
              // case 3
              opsI._splice(offset, delLen)
              offset = 0
              opsI = opsI.next
            } else {
              // case 4
              opsI._splice(offset, delLen)
            }
            remainingLen -= delLen
          }
        }
      } else if ($modifyOp.check(op)) {
        if (opsI == null) {
          list.pushEnd(this.children, op.clone())
          this.childCnt += 1
          return
        }
        if ($modifyOp.check(opsI)) {
          opsI._modValue.apply(op.value)
        } else if ($insertOp.check(opsI)) {
          opsI._modValue(offset).apply(op.value)
        } else if ($retainOp.check(opsI)) {
          if (offset > 0) {
            const cpy = scheduleForMerge(opsI.clone(0, offset)) // skipped len
            opsI._splice(0, offset) // new remainder
            list.insertBetween(this.children, opsI.prev, opsI, cpy) // insert skipped len
            offset = 0
          }
          list.insertBetween(this.children, opsI.prev, opsI, scheduleForMerge(op.clone())) // insert skipped len
          if (opsI.length === 1) {
            list.remove(this.children, opsI)
          } else {
            opsI._splice(0, 1)
            scheduleForMerge(opsI)
          }
        } else if ($deleteOp.check(opsI)) {
          // nop
        } else {
          error.unexpectedCase()
        }
      } else {
        error.unexpectedCase()
      }
    })
    maybeMergeable.forEach(op => {
      // check if this is still integrated
      if (op.prev?.next === op) {
        tryMergeWithPrev(this.children, op)
        op.next && tryMergeWithPrev(this.children, op.next)
      }
    })
    return this
  }

  /**
   * @param {DeltaAny} other
   * @param {boolean} priority
   */
  rebase (other, priority) {
    modDeltaCheck(this)
    /**
     * Rebase attributes
     *
     * - insert vs delete ⇒ insert takes precedence
     * - insert vs modify ⇒ insert takes precedence
     * - insert vs insert ⇒ priority decides
     * - delete vs modify ⇒ delete takes precedence
     * - delete vs delete ⇒ current delete op is removed because item has already been deleted
     * - modify vs modify ⇒ rebase using priority
     */
    for (const op of this.attrs) {
      if ($insertOp.check(op)) {
        if ($insertOp.check(other.attrs[op.key]) && !priority) {
          delete this.attrs[op.key]
        }
      } else if ($deleteOp.check(op)) {
        const otherOp = other.attrs[/** @type {any} */ (op.key)]
        if ($insertOp.check(otherOp)) {
          delete this.attrs[otherOp.key]
        }
      } else if ($modifyOp.check(op)) {
        const otherOp = other.attrs[/** @type {any} */ (op.key)]
        if (otherOp == null) {
          // nop
        } else if ($modifyOp.check(otherOp)) {
          op._modValue.rebase(otherOp.value, priority)
        } else {
          delete this.attrs[otherOp.key]
        }
      }
    }
    /**
     * Rebase children.
     *
     * Precedence: insert with higher priority comes first. Op with less priority is transformed to
     * be inserted later.
     *
     * @todo always check if inser OR text
     */
    /**
     * @type {ChildrenOpAny?}
     */
    let currChild = this.children.start
    let currOffset = 0
    /**
     * @type {ChildrenOpAny?}
     */
    let otherChild = other.children.start
    let otherOffset = 0
    while (currChild != null && otherChild != null) {
      if ($insertOp.check(currChild) || $textOp.check(currChild)) {
        /**
         * Transforming *insert*. If other is..
         * - insert: transform based on priority
         * - retain/delete/modify: transform next op against other
         */
        if ($insertOp.check(otherChild) || $modifyOp.check(otherChild) || $textOp.check(otherChild)) {
          if (!priority) {
            list.insertBetween(this.children, currChild.prev, currChild, new RetainOp(otherChild.length, null, null))
            this.childCnt += otherChild.length
            // curr is transformed against other, transform curr against next
            otherOffset = otherChild.length
          } else {
            // curr stays as is, transform next op
            currOffset = currChild.length
          }
        } else { // otherChild = delete | retain | modify - curr stays as is, transform next op
          currOffset = currChild.length
        }
      } else if ($modifyOp.check(currChild)) {
        /**
         * Transforming *modify*. If other is..
         * - insert: adjust position
         * - modify: rebase curr modify on other modify
         * - delete: remove modify
         * - retain: adjust offset
         */
        if ($insertOp.check(otherChild) || $textOp.check(otherChild)) {
          // @todo: with all list changes (retain insertions, removal), try to merge the surrounding
          // ops later
          list.insertBetween(this.children, currChild.prev, currChild, new RetainOp(otherChild.length, null, null))
          this.childCnt += otherChild.length
          // curr is transformed against other, transform curr against next
          otherOffset = otherChild.length
        } else {
          if ($modifyOp.check(otherChild)) {
            /** @type {any} */ (currChild.value).rebase(otherChild, priority)
          } else if ($deleteOp.check(otherChild)) {
            list.remove(this.children, currChild)
            this.childCnt -= 1
          }
          currOffset += 1
          otherOffset += 1
        }
      } else { // DeleteOp | RetainOp
        const maxCommonLen = math.min(currChild.length - currOffset, otherChild.length - otherOffset)
        /**
         * Transforming *retain* OR *delete*. If other is..
         * - retain / modify: adjust offsets
         * - delete: shorten curr op
         * - insert: split curr op and insert retain
         */
        if ($retainOp.check(otherChild) || $modifyOp.check(otherChild)) {
          currOffset += maxCommonLen
          otherOffset += maxCommonLen
        } else if ($deleteOp.check(otherChild)) {
          if ($retainOp.check(currChild)) {
            // @ts-ignore
            currChild.retain -= maxCommonLen
          } else if ($deleteOp.check(currChild)) {
            currChild.delete -= maxCommonLen
          }
          this.childCnt -= maxCommonLen
        } else { // insert/text.check(currOp)
          if (currOffset > 0) {
            const leftPart = currChild.clone(currOffset)
            list.insertBetween(this.children, currChild.prev, currChild, leftPart)
            currChild._splice(currOffset, currChild.length - currOffset)
            currOffset = 0
          }
          list.insertBetween(this.children, currChild.prev, currChild, new RetainOp(otherChild.length, null, null))
          this.childCnt += otherChild.length
          otherOffset = otherChild.length
        }
      }
      if (currOffset >= currChild.length) {
        currChild = currChild.next
        currOffset = 0
      }
      if (otherOffset >= otherChild.length) {
        otherChild = otherChild.next
        otherOffset = 0
      }
    }
    return this
  }

  /**
   * Same as doing `delta.rebase(other.inverse())`, without creating a temporary delta.
   *
   * @param {DeltaAny} other
   * @param {boolean} priority
   */
  rebaseOnInverse (other, priority) {
    modDeltaCheck(this)
    // @todo
    console.info('method rebaseOnInverse unimplemented')
    return this
  }

  /**
   * Append child ops from one op to the other.
   *
   *     delta.create().insert('a').append(delta.create().insert('b')) // => insert "ab"
   *
   * @template {DeltaAny} OtherDelta
   * @param {OtherDelta} other
   * @return {CastToDelta<OtherDelta> extends Delta<any,any,infer OtherChildren,infer OtherText,any> ? DeltaBuilder<NodeName,Attrs,Children|OtherChildren,Text|OtherText,Schema> : never}
   */
  append (other) {
    const children = this.children
    const prevLast = children.end
    // @todo Investigate. Above is a typescript issue. It is necessary to cast OtherDelta to a Delta first before
    // inferring type, otherwise Children will contain Text.
    for (const child of other.children) {
      list.pushEnd(children, child.clone())
    }
    this.childCnt += other.childCnt
    prevLast?.next && tryMergeWithPrev(children, prevLast.next)
    // @ts-ignore
    return this
  }
}

/**
 * @param {ChildrenOpAny} op
 * @param {{[k:string]:any}} formatUpdate
 */
const updateOpFormat = (op, formatUpdate) => {
  if (!$deleteOp.check(op)) {
    // apply formatting attributes
    for (const k in formatUpdate) {
      const v = formatUpdate[k]
      if (v != null || $retainOp.check(op)) {
        // never modify formats
        /** @type {any} */ (op).format = object.assign({}, op.format, { [k]: v })
      } else if (op.format != null) {
        const { [k]: _, ...rest } = op.format
        ;/** @type {any} */ (op).format = rest
      }
    }
  }
}

/**
 * @template {DeltaAny} D
 * @typedef {D extends DeltaBuilder<infer N,infer Attrs,infer Children,infer Text,infer Schema> ? Delta<N,Attrs,Children,Text,Schema> : D} CastToDelta
 */

/**
 * @template {string} NodeName
 * @template {{ [key: string|number]: any }} [Attrs={}]
 * @template {fingerprintTrait.Fingerprintable|never} [Children=never]
 * @template {string|never} [Text=never]
 * @typedef {Delta<NodeName,Attrs,Children|Delta<NodeName,Attrs,Children,Text>|RecursiveDelta<NodeName,Attrs,Children,Text>,Text>} RecursiveDelta
 */

/**
 * @template {string} Name
 * @template {{[k:string|number]:any}} Attrs
 * @template {fingerprintTrait.Fingerprintable} Children
 * @template {boolean} HasText
 * @template {{ [k:string]:any }} Formats
 * @template {boolean} Recursive
 * @extends {s.Schema<Delta<
 *   Name,
 *   Attrs,
 *   Children|(Recursive extends true ? RecursiveDelta<Name,Attrs,Children,HasText extends true ? string : never> : never),
 *   HasText extends true ? string : never,
 *   any>>}
 */
export class $Delta extends s.Schema {
  /**
   * @param {s.Schema<Name>} $name
   * @param {s.Schema<Attrs>} $attrs
   * @param {s.Schema<Children>} $children
   * @param {HasText} hasText
   * @param {s.Schema<Formats>} $formats
   * @param {Recursive} recursive
   */
  constructor ($name, $attrs, $children, hasText, $formats, recursive) {
    super()
    const $attrsPartial = s.$$object.check($attrs) ? $attrs.partial : $attrs
    if (recursive) {
      // @ts-ignore
      $children = s.$union($children, this)
    }
    this.shape = { $name, $attrs: $attrsPartial, $children, hasText, $formats }
  }

  /**
   * @param {any} o
   * @param {s.ValidationError} [err]
   * @return {o is Delta<
   *   Name,
   *   Attrs,
   *   Children|(Recursive extends true ? RecursiveDelta<Name,Attrs,Children,HasText extends true ? string : never> : never),
   *   HasText extends true ? string : never,
   *   any>}
   */
  check (o, err = undefined) {
    const { $name, $attrs, $children, hasText, $formats } = this.shape
    if (!(o instanceof Delta)) {
      err?.extend(null, 'Delta', o?.constructor.name, 'Constructor match failed')
    } else if (o.name != null && !$name.check(o.name, err)) {
      err?.extend('Delta.name', $name.toString(), o.name, 'Unexpected node name')
    } else if (list.toArray(o.children).some(c => (!hasText && $textOp.check(c)) || (hasText && $textOp.check(c) && c.format != null && !$formats.check(c.format)) || ($insertOp.check(c) && !c.insert.every(ins => $children.check(ins))))) {
      err?.extend('Delta.children', '', '', 'Children don\'t match the schema')
    } else if (object.some(o.attrs, (op, k) => $insertOp.check(op) && !$attrs.check({ [k]: op.value }, err))) {
      err?.extend('Delta.attrs', '', '', 'Attrs don\'t match the schema')
    } else {
      return true
    }
    return false
  }
}

/**
 * @template {s.Schema<string>|string|Array<string>} [NodeNameSchema=s.Schema<any>]
 * @template {s.Schema<{ [key: string|number]: any }>|{ [key:string|number]:any }} [AttrsSchema=s.Schema<{}>]
 * @template {any} [ChildrenSchema=s.Schema<never>]
 * @template {boolean} [HasText=false]
 * @template {boolean} [Recursive=false]
 * @template {{ [k:string]:any }} [Formats={[k:string]:any}]
 * @param {object} opts
 * @param {NodeNameSchema?} [opts.name]
 * @param {AttrsSchema?} [opts.attrs] What key-value pairs are included.
 * @param {ChildrenSchema?} [opts.children] The type of content in `insertOp`
 * @param {HasText} [opts.text] Whether this delta contains text using `textOp`
 * @param {Formats} [opts.formats]
 * @param {Recursive} [opts.recursive]
 * @return {[s.Unwrap<s.ReadSchema<NodeNameSchema>>,s.Unwrap<s.ReadSchema<AttrsSchema>>,s.Unwrap<s.ReadSchema<ChildrenSchema>>] extends [infer NodeName, infer Attrs, infer Children] ? s.Schema<Delta<
 *     NodeName,
 *     Attrs,
 *     Children|(Recursive extends true ? RecursiveDelta<NodeName,Attrs,Children,HasText extends true ? string : never> : never),
 *     HasText extends true ? string : never
 * >> : never}
 */
export const $delta = ({ name, attrs, children, text, formats, recursive }) => /** @type {any} */ (new $Delta(
  name == null ? s.$any : s.$(name),
  /** @type {any} */ (attrs == null ? s.$object({}) : s.$(attrs)),
  /** @type {any} */ (children == null ? s.$never : s.$(children)),
  text ?? false,
  formats == null ? s.$any : s.$(formats),
  recursive ?? false
))

export const $$delta = s.$constructedBy($Delta)

/**
 * @todo remove this
 *
 * @template {s.Schema<string>|string|Array<string>} [NodeNameSchema=s.Schema<any>]
 * @template {s.Schema<{ [key: string|number]: any }>|{ [key:string|number]:any }} [AttrsSchema=s.Schema<{}>]
 * @template {any} [ChildrenSchema=s.Schema<never>]
 * @template {boolean} [HasText=false]
 * @template {boolean} [Recursive=false]
 * @param {object} opts
 * @param {NodeNameSchema?} [opts.name]
 * @param {AttrsSchema?} [opts.attrs]
 * @param {ChildrenSchema?} [opts.children]
 * @param {HasText} [opts.text]
 * @param {Recursive} [opts.recursive]
 * @return {[s.Unwrap<s.ReadSchema<NodeNameSchema>>,s.Unwrap<s.ReadSchema<AttrsSchema>>,s.Unwrap<s.ReadSchema<ChildrenSchema>>] extends [infer NodeName, infer Attrs, infer Children] ? s.Schema<Delta<
 *     NodeName,
 *     Attrs,
 *     Children|(Recursive extends true ? RecursiveDelta<NodeName,Attrs,Children,HasText extends true ? string : never> : never),
 *     HasText extends true ? string : never
 * >> : never}
 */
export const _$delta = ({ name, attrs, children, text, recursive }) => {
  /**
   * @type {s.Schema<Array<any>>}
   */
  let $arrContent = children == null ? s.$never : s.$array(s.$(children))
  const $name = name == null ? s.$any : s.$(name)
  const $attrsPartial = attrs == null ? s.$object({}) : (s.$$record.check(attrs) ? attrs : /** @type {any} */ (s.$(attrs)).partial)
  const $d = s.$instanceOf(Delta, /** @param {Delta<any,any,any,any,any>} d */ d => {
    if (
      !$name.check(d.name) ||
      object.some(d.attrs,
        (op, k) => $insertOp.check(op) && !$attrsPartial.check({ [k]: op.value })
      )
    ) return false
    for (const op of d.children) {
      if ((!text && $textOp.check(op)) || ($insertOp.check(op) && !$arrContent.check(op.insert))) {
        return false
      }
    }
    return true
  })
  if (recursive) {
    $arrContent = children == null ? s.$array($d) : s.$array(s.$(children), $d)
  }
  return /** @type {any} */ ($d)
}

/**
 * @type {s.Schema<DeltaAny>}
 */
export const $deltaAny = /** @type {any} */ (s.$instanceOf(Delta))

/**
 * @type {s.Schema<DeltaBuilderAny>}
 */
export const $deltaBuilderAny = /** @type {any} */ (s.$instanceOf(DeltaBuilder))

/**
 * Helper function to merge attribution and attributes. The latter input "wins".
 *
 * @template {{ [key: string]: any }} T
 * @param {T | null} a
 * @param {T | null} b
 */
export const mergeAttrs = (a, b) => object.isEmpty(a)
  ? (object.isEmpty(b) ? null : b)
  : (object.isEmpty(b) ? a : object.assign({}, a, b))

/**
 * @template {DeltaAny|null} D
 * @param {D} a
 * @param {D} b
 * @return {D}
 */
export const mergeDeltas = (a, b) => {
  if (a != null && b != null) {
    const c = clone(a)
    c.apply(b)
    return /** @type {any} */ (c)
  }
  return a == null ? b : (a || null)
}

/**
 * @template {DeltaAny} D
 * @param {prng.PRNG} gen
 * @param {s.Schema<D>} $d
 * @return {D extends Delta<infer NodeName,infer Attrs,infer Children,infer Text,infer Schema> ? DeltaBuilder<NodeName,Attrs,Children,Text,Schema> : never}
 */
export const random = (gen, $d) => {
  const { $name, $attrs, $children, hasText, $formats: $formats_ } = /** @type {$Delta<any,any,any,boolean,any,any>} */ (/** @type {any} */ ($d)).shape
  const d = s.$$any.check($name) ? create($deltaAny) : create(s.random(gen, $name), $deltaAny)
  const $formats = s.$$any.check($formats_) ? s.$null : $formats_
  prng.bool(gen) && d.setMany(s.random(gen, $attrs))
  for (let i = prng.uint32(gen, 0, 5); i > 0; i--) {
    if (hasText && prng.bool(gen)) {
      d.insert(prng.word(gen), s.random(gen, $formats))
    } else if (!s.$$never.check($children)) {
      /**
       * @type {Array<any>}
       */
      const ins = []
      let insN = prng.int32(gen, 0, 5)
      while (insN--) {
        ins.push(s.random(gen, $children))
      }
      d.insert(ins, s.random(gen, $formats))
    }
  }
  return /** @type {any} */ (d)
}

/**
 * @overload
 * @return {DeltaBuilder<any,{},never,never,null>}
 */
/**
 * @template {string} NodeName
 * @overload
 * @param {NodeName} nodeName
 * @return {DeltaBuilder<NodeName,{},never,never,null>}
 */
/**
 * @template {string} NodeName
 * @template {s.Schema<DeltaAny>} Schema
 * @overload
 * @param {NodeName} nodeName
 * @param {Schema} schema
 * @return {Schema extends s.Schema<Delta<infer N,infer Attrs,infer Children,infer Text,any>> ? DeltaBuilder<NodeName,Attrs,Children,Text,Schema> : never}
 */
/**
 * @template {s.Schema<DeltaAny>} Schema
 * @overload
 * @param {Schema} schema
 * @return {Schema extends s.Schema<Delta<infer N,infer Attrs,infer Children,infer Text,any>> ? DeltaBuilder<N,Attrs,Children,Text,Schema> : never}
 */
/**
 * @template {string|null} NodeName
 * @template {{[k:string|number]:any}|null} Attrs
 * @template {Array<any>|string} [Children=never]
 * @overload
 * @param {NodeName} nodeName
 * @param {Attrs} attrs
 * @param {Children} [children]
 * @return {DeltaBuilder<
 *   NodeName extends null ? any : NodeName,
 *   Attrs extends null ? {} : Attrs,
 *   Extract<Children,Array<any>> extends Array<infer Ac> ? (unknown extends Ac ? never : Ac) : never,
 *   Extract<Children,string>,
 *   null
 * >}
 */
/**
 * @param {string|s.Schema<DeltaAny>} [nodeNameOrSchema]
 * @param {{[K:string|number]:any}|s.Schema<DeltaAny>} [attrsOrSchema]
 * @param {(Array<any>|string)} [children]
 * @return {DeltaBuilder<any,any,any,any,any>}
 */
export const create = (nodeNameOrSchema, attrsOrSchema, children) => {
  const nodeName = /** @type {any} */ (s.$string.check(nodeNameOrSchema) ? nodeNameOrSchema : null)
  const schema = /** @type {any} */ (s.$$schema.check(nodeNameOrSchema) ? nodeNameOrSchema : (s.$$schema.check(attrsOrSchema) ? attrsOrSchema : null))
  const d = /** @type {DeltaBuilder<any,any,any,string,null>} */ (new DeltaBuilder(nodeName, schema))
  if (s.$objectAny.check(attrsOrSchema)) {
    d.setMany(attrsOrSchema)
  }
  children && d.insert(children)
  return d
}

// DELTA TEXT

/**
 * @template {fingerprintTrait.Fingerprintable} [Embeds=never]
 * @typedef {Delta<any,{},Embeds,string>} TextDelta
 */

/**
 * @template {fingerprintTrait.Fingerprintable} [Embeds=never]
 * @typedef {DeltaBuilder<any,{},Embeds,string>} TextDeltaBuilder
 */

/**
 * @template {Array<s.Schema<any>>} [$Embeds=any]
 * @param {$Embeds} $embeds
 * @return {s.Schema<TextDelta<_AnyToNull<$Embeds> extends null ? never : ($Embeds extends Array<s.Schema<infer $C>> ? $C : never)>>}
 */
export const $text = (...$embeds) => /** @type {any} */ ($delta({ children: s.$union(...$embeds), text: true }))
export const $textOnly = $text()

/**
 * @template {s.Schema<Delta<any,{},any,any,null>>} [Schema=s.Schema<Delta<any,{},never,string,null>>]
 * @param {Schema} [$schema]
 * @return {Schema extends s.Schema<Delta<infer N,infer Attrs,infer Children,infer Text,any>> ? DeltaBuilder<N,Attrs,Children,Text,Schema> : never}
 */
export const text = $schema => /** @type {any} */ (create($schema || $textOnly))

/**
 * @template {fingerprintTrait.Fingerprintable} Children
 * @typedef {Delta<any,{},Children,never>} ArrayDelta
 */

/**
 * @template {fingerprintTrait.Fingerprintable} Children
 * @typedef {DeltaBuilder<any,{},Children,never>} ArrayDeltaBuilder
 */

/**
 * @template {any|s.Schema<any>} $Children
 * @param {$Children} [$children]
 * @return {s.Schema<ArrayDelta<s.Unwrap<s.ReadSchema<$Children>>>>}
 */
export const $array = $children => /** @type {any} */ ($delta({ children: $children }))

/**
 * @template {s.Schema<ArrayDelta<any>>} [$Schema=never]
 * @param {$Schema} $schema
 * @return {$Schema extends never ? ArrayDeltaBuilder<never> : DeltaBuilder<any,{},never,never,$Schema>}
 */
export const array = $schema => /** @type {any} */ ($schema ? create($schema) : create())

/**
 * @template {{ [K: string|number]: any }} Attrs
 * @typedef {Delta<any,Attrs,never,never>} MapDelta
 */

/**
 * @template {{ [K: string|number]: any }} Attrs
 * @typedef {DeltaBuilder<any,Attrs,never,never>} MapDeltaBuilder
 */

/**
 * @template {{ [K: string|number]: any }} $Attrs
 * @param {s.Schema<$Attrs>} $attrs
 * @return {s.Schema<MapDelta<$Attrs>>}
 */
export const $map = $attrs => /** @type {any} */ ($delta({ attrs: $attrs }))

/**
 * @template {s.Schema<MapDelta<any>>|undefined} [$Schema=undefined]
 * @param {$Schema} [$schema]
 * @return {$Schema extends s.Schema<MapDelta<infer Attrs>> ? DeltaBuilder<any,Attrs,never,never,$Schema> : MapDeltaBuilder<{}>}
 */
export const map = $schema => /** @type {any} */ (create(/** @type {any} */ ($schema)))

/**
 * @template {DeltaAny} D
 * @param {D} d1
 * @param {NoInfer<D>} d2
 * @return {D extends Delta<infer N,infer Attrs,infer Children,infer Text,any> ? DeltaBuilder<N,Attrs,Children,Text,null> : never}
 */
export const diff = (d1, d2) => {
  /**
   * @type {DeltaBuilderAny}
   */
  const d = create()
  if (d1.fingerprint !== d2.fingerprint) {
    let left1 = d1.children.start
    let left2 = d2.children.start
    let right1 = d1.children.end
    let right2 = d2.children.end
    let commonPrefixOffset = 0
    // perform a patience sort
    // 1) remove common prefix and suffix
    while (left1 != null && left1.fingerprint === left2?.fingerprint) {
      if (!$deleteOp.check(left1)) {
        commonPrefixOffset += left1.length
      }
      left1 = left1.next
      left2 = left2.next
    }
    while (right1 !== null && right1 !== left1 && right1.fingerprint === right2?.fingerprint) {
      right1 = right1.prev
      right2 = right2.prev
    }
    /**
     * @type {Array<ChildrenOpAny>}
     */
    const ops1 = []
    /**
     * @type {Array<ChildrenOpAny>}
     */
    const ops2 = []
    while (left1 !== null && left1 !== right1?.next) {
      ops1.push(left1)
      left1 = left1.next
    }
    while (left2 !== null && left2 !== right2?.next) {
      ops2.push(left2)
      left2 = left2.next
    }
    const fprints1 = ops1.map(op => op.fingerprint)
    const fprints2 = ops2.map(op => op.fingerprint)
    const changeset = patience.diff(fprints1, fprints2)
    d.retain(commonPrefixOffset)
    for (let i = 0, lastIndex1 = 0, currIndexOffset2 = 0; i < changeset.length; i++) {
      const change = changeset[i]
      d.retain(change.index - lastIndex1)
      // insert minimal diff at curred position in d
      /**
       *
       * @todo it would be better if these would be slices of delta (an actual delta)
       *
       * @param {ChildrenOpAny[]} opsIs
       * @param {ChildrenOpAny[]} opsShould
       */
      const diffAndApply = (opsIs, opsShould) => {
        const d = create()
        // @todo unoptimized implementation. Convert content to array and diff that based on
        // generated fingerprints. We probably could do better and cache more information.
        // - benchmark
        // - cache fingerprints in ops
        /**
         * @type {Array<string|DeltaAny|fingerprintTrait.Fingerprintable>}
         */
        const isContent = opsIs.flatMap(op => $insertOp.check(op) ? op.insert : ($textOp.check(op) ? op.insert.split('') : error.unexpectedCase()))
        /**
         * @type {Array<string|DeltaAny|fingerprintTrait.Fingerprintable>}
         */
        const shouldContent = opsShould.flatMap(op => $insertOp.check(op) ? op.insert : ($textOp.check(op) ? op.insert.split('') : error.unexpectedCase()))
        const isContentFingerprinted = isContent.map(c => s.$string.check(c) ? c : fingerprintTrait.fingerprint(c))
        const shouldContentFingerprinted = shouldContent.map(c => s.$string.check(c) ? c : fingerprintTrait.fingerprint(c))
        const hasFormatting = opsIs.some(op => !$deleteOp.check(op) && op.format != null) || opsShould.some(op => !$deleteOp.check(op) && op.format != null)
        /**
         * @type {{ index: number, insert: Array<string|DeltaAny|fingerprintTrait.Fingerprintable>, remove: Array<string|DeltaAny|fingerprintTrait.Fingerprintable> }[]}
         */
        const cdiff = patience.diff(isContentFingerprinted, shouldContentFingerprinted)
        // overwrite fingerprinted content with actual content
        for (let i = 0, adj = 0; i < cdiff.length; i++) {
          const cd = cdiff[i]
          cd.remove = isContent.slice(cd.index, cd.index + cd.remove.length)
          cd.insert = shouldContent.slice(cd.index + adj, cd.index + adj + cd.insert.length)
          adj += cd.insert.length - cd.remove.length
        }
        for (let i = 0, lastIndex = 0; i < cdiff.length; i++) {
          const cd = cdiff[i]
          d.retain(cd.index - lastIndex)
          lastIndex = cd.index
          let cdii = 0
          let cdri = 0
          // try to match as much content as possible, preferring to skip over non-deltas
          for (; cdii < cd.insert.length && cdri < cd.remove.length;) {
            const a = cd.insert[cdii]
            const b = cd.remove[cdri]
            if ($deltaAny.check(a) && $deltaAny.check(b) && a.name === b.name) {
              d.modify(diff(b, a))
              cdii++
              cdri++
            } else if ($deltaAny.check(b)) {
              d.insert(s.$string.check(a) ? a : [a])
              cdii++
            } else {
              d.delete(1)
              cdri++
            }
          }
          for (; cdii < cd.insert.length; cdii++) {
            const a = cd.insert[cdii]
            d.insert(s.$string.check(a) ? a : [a])
          }
          d.delete(cd.remove.length - cdri)
        }
        // create the diff for formatting
        if (hasFormatting) {
          const formattingDiff = create()
          // update opsIs with content diff. then we can figure out the formatting diff.
          const isUpdated = create()
          // copy opsIs to fresh delta
          opsIs.forEach(op => {
            isUpdated.childCnt += op.length
            list.pushEnd(isUpdated.children, op.clone())
          })
          isUpdated.apply(d)
          let shouldI = 0
          let shouldOffset = 0
          let isOp = isUpdated.children.start
          let isOffset = 0
          while (shouldI < opsShould.length && isOp != null) {
            const shouldOp = opsShould[shouldI]
            if (!$deleteOp.check(shouldOp) && !$deleteOp.check(isOp)) {
              const isFormat = isOp.format
              const minForward = math.min(shouldOp.length - shouldOffset, isOp.length - isOffset)
              shouldOffset += minForward
              isOffset += minForward
              if (fun.equalityDeep(shouldOp.format, isFormat)) {
                formattingDiff.retain(minForward)
              } else {
                /**
                 * @type {FormattingAttributes}
                 */
                const fupdate = {}
                shouldOp.format != null && object.forEach(shouldOp.format, (v, k) => {
                  if (!fun.equalityDeep(v, isFormat?.[k] || null)) {
                    fupdate[k] = v
                  }
                })
                isFormat && object.forEach(isFormat, (_, k) => {
                  if (shouldOp?.format?.[k] === undefined) {
                    fupdate[k] = null
                  }
                })
                formattingDiff.retain(minForward, fupdate)
              }
              // update offset and iterators
              if (shouldOffset >= shouldOp.length) {
                shouldI++
                shouldOffset = 0
              }
              if (isOffset >= isOp.length) {
                isOp = isOp.next
                isOffset = 0
              }
            }
          }
          d.apply(formattingDiff)
        }
        return d
      }
      const subd = diffAndApply(ops1.slice(change.index, change.index + change.remove.length), ops2.slice(change.index + currIndexOffset2, change.index + currIndexOffset2 + change.insert.length))
      d.append(subd)
      lastIndex1 = change.index + change.remove.length
      currIndexOffset2 += change.insert.length - change.remove.length
    }
    for (const attr2 of d2.attrs) {
      const attr1 = d1.attrs[attr2.key]
      if (attr1 == null || (attr1.fingerprint !== attr2.fingerprint)) {
        /* c8 ignore else */
        if ($insertOp.check(attr2)) {
          d.set(attr2.key, attr2.value)
        } else {
          /* c8 ignore next 2 */
          error.unexpectedCase()
        }
      }
    }
    for (const attr1 of d1.attrs) {
      if (d2.attrs[attr1.key] == null) {
        d.unset(attr1.key)
      }
    }
  }
  return /** @type {any} */ (d.done(false))
}
