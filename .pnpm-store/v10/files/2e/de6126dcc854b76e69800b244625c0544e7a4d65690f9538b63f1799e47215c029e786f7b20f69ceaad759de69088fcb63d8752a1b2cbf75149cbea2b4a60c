import * as object from 'lib0/object'

import {
  YXmlFragment,
  transact,
  typeMapDelete,
  typeMapHas,
  typeMapSet,
  typeMapGet,
  typeMapGetAll,
  typeMapGetAllSnapshot,
  typeListForEach,
  YXmlElementRefID,
  Snapshot, YXmlText, ContentType, AbstractType, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, Doc, Item // eslint-disable-line
} from '../internals.js'

/**
 * @typedef {Object|number|null|Array<any>|string|Uint8Array|AbstractType<any>} ValueTypes
 */

/**
 * An YXmlElement imitates the behavior of a
 * https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element
 *
 * * An YXmlElement has attributes (key value pairs)
 * * An YXmlElement has childElements that must inherit from YXmlElement
 *
 * @template {{ [key: string]: ValueTypes }} [KV={ [key: string]: string }]
 */
export class YXmlElement extends YXmlFragment {
  constructor (nodeName = 'UNDEFINED') {
    super()
    this.nodeName = nodeName
    /**
     * @type {Map<string, any>|null}
     */
    this._prelimAttrs = new Map()
  }

  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get nextSibling () {
    const n = this._item ? this._item.next : null
    return n ? /** @type {YXmlElement|YXmlText} */ (/** @type {ContentType} */ (n.content).type) : null
  }

  /**
   * @type {YXmlElement|YXmlText|null}
   */
  get prevSibling () {
    const n = this._item ? this._item.prev : null
    return n ? /** @type {YXmlElement|YXmlText} */ (/** @type {ContentType} */ (n.content).type) : null
  }

  /**
   * Integrate this type into the Yjs instance.
   *
   * * Save this struct in the os
   * * This type is sent to other client
   * * Observer functions are fired
   *
   * @param {Doc} y The Yjs instance
   * @param {Item} item
   */
  _integrate (y, item) {
    super._integrate(y, item)
    ;(/** @type {Map<string, any>} */ (this._prelimAttrs)).forEach((value, key) => {
      this.setAttribute(key, value)
    })
    this._prelimAttrs = null
  }

  /**
   * Creates an Item with the same effect as this Item (without position effect)
   *
   * @return {YXmlElement}
   */
  _copy () {
    return new YXmlElement(this.nodeName)
  }

  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlElement<KV>}
   */
  clone () {
    /**
     * @type {YXmlElement<KV>}
     */
    const el = new YXmlElement(this.nodeName)
    const attrs = this.getAttributes()
    object.forEach(attrs, (value, key) => {
      el.setAttribute(key, /** @type {any} */ (value))
    })
    // @ts-ignore
    el.insert(0, this.toArray().map(v => v instanceof AbstractType ? v.clone() : v))
    return el
  }

  /**
   * Returns the XML serialization of this YXmlElement.
   * The attributes are ordered by attribute-name, so you can easily use this
   * method to compare YXmlElements
   *
   * @return {string} The string representation of this type.
   *
   * @public
   */
  toString () {
    const attrs = this.getAttributes()
    const stringBuilder = []
    const keys = []
    for (const key in attrs) {
      keys.push(key)
    }
    keys.sort()
    const keysLen = keys.length
    for (let i = 0; i < keysLen; i++) {
      const key = keys[i]
      stringBuilder.push(key + '="' + attrs[key] + '"')
    }
    const nodeName = this.nodeName.toLocaleLowerCase()
    const attrsString = stringBuilder.length > 0 ? ' ' + stringBuilder.join(' ') : ''
    return `<${nodeName}${attrsString}>${super.toString()}</${nodeName}>`
  }

  /**
   * Removes an attribute from this YXmlElement.
   *
   * @param {string} attributeName The attribute name that is to be removed.
   *
   * @public
   */
  removeAttribute (attributeName) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapDelete(transaction, this, attributeName)
      })
    } else {
      /** @type {Map<string,any>} */ (this._prelimAttrs).delete(attributeName)
    }
  }

  /**
   * Sets or updates an attribute.
   *
   * @template {keyof KV & string} KEY
   *
   * @param {KEY} attributeName The attribute name that is to be set.
   * @param {KV[KEY]} attributeValue The attribute value that is to be set.
   *
   * @public
   */
  setAttribute (attributeName, attributeValue) {
    if (this.doc !== null) {
      transact(this.doc, transaction => {
        typeMapSet(transaction, this, attributeName, attributeValue)
      })
    } else {
      /** @type {Map<string, any>} */ (this._prelimAttrs).set(attributeName, attributeValue)
    }
  }

  /**
   * Returns an attribute value that belongs to the attribute name.
   *
   * @template {keyof KV & string} KEY
   *
   * @param {KEY} attributeName The attribute name that identifies the
   *                               queried value.
   * @return {KV[KEY]|undefined} The queried attribute value.
   *
   * @public
   */
  getAttribute (attributeName) {
    return /** @type {any} */ (typeMapGet(this, attributeName))
  }

  /**
   * Returns whether an attribute exists
   *
   * @param {string} attributeName The attribute name to check for existence.
   * @return {boolean} whether the attribute exists.
   *
   * @public
   */
  hasAttribute (attributeName) {
    return /** @type {any} */ (typeMapHas(this, attributeName))
  }

  /**
   * Returns all attribute name/value pairs in a JSON Object.
   *
   * @param {Snapshot} [snapshot]
   * @return {{ [Key in Extract<keyof KV,string>]?: KV[Key]}} A JSON Object that describes the attributes.
   *
   * @public
   */
  getAttributes (snapshot) {
    return /** @type {any} */ (snapshot ? typeMapGetAllSnapshot(this, snapshot) : typeMapGetAll(this))
  }

  /**
   * Creates a Dom Element that mirrors this YXmlElement.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {any} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDOM (_document = document, hooks = {}, binding) {
    const dom = _document.createElement(this.nodeName)
    const attrs = this.getAttributes()
    for (const key in attrs) {
      const value = attrs[key]
      if (typeof value === 'string') {
        dom.setAttribute(key, value)
      }
    }
    typeListForEach(this, yxml => {
      dom.appendChild(yxml.toDOM(_document, hooks, binding))
    })
    if (binding !== undefined) {
      binding._createAssociation(dom, this)
    }
    return dom
  }

  /**
   * Transform the properties of this type to binary and write it to an
   * BinaryEncoder.
   *
   * This is called when this Item is sent to a remote peer.
   *
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
   */
  _write (encoder) {
    encoder.writeTypeRef(YXmlElementRefID)
    encoder.writeKey(this.nodeName)
  }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlElement}
 *
 * @function
 */
export const readYXmlElement = decoder => new YXmlElement(decoder.readKey())
