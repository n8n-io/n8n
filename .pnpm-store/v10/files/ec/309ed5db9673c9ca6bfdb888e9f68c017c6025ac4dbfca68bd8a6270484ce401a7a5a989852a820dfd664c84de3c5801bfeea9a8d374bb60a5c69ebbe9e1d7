import {
  YText,
  YXmlTextRefID,
  ContentType, YXmlElement, UpdateDecoderV1, UpdateDecoderV2, UpdateEncoderV1, UpdateEncoderV2, // eslint-disable-line
} from '../internals.js'

/**
 * Represents text in a Dom Element. In the future this type will also handle
 * simple formatting information like bold and italic.
 */
export class YXmlText extends YText {
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

  _copy () {
    return new YXmlText()
  }

  /**
   * Makes a copy of this data type that can be included somewhere else.
   *
   * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
   *
   * @return {YXmlText}
   */
  clone () {
    const text = new YXmlText()
    text.applyDelta(this.toDelta())
    return text
  }

  /**
   * Creates a Dom Element that mirrors this YXmlText.
   *
   * @param {Document} [_document=document] The document object (you must define
   *                                        this when calling this method in
   *                                        nodejs)
   * @param {Object<string, any>} [hooks] Optional property to customize how hooks
   *                                             are presented in the DOM
   * @param {any} [binding] You should not set this property. This is
   *                               used if DomBinding wants to create a
   *                               association to the created DOM type.
   * @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
   *
   * @public
   */
  toDOM (_document = document, hooks, binding) {
    const dom = _document.createTextNode(this.toString())
    if (binding !== undefined) {
      binding._createAssociation(dom, this)
    }
    return dom
  }

  toString () {
    // @ts-ignore
    return this.toDelta().map(delta => {
      const nestedNodes = []
      for (const nodeName in delta.attributes) {
        const attrs = []
        for (const key in delta.attributes[nodeName]) {
          attrs.push({ key, value: delta.attributes[nodeName][key] })
        }
        // sort attributes to get a unique order
        attrs.sort((a, b) => a.key < b.key ? -1 : 1)
        nestedNodes.push({ nodeName, attrs })
      }
      // sort node order to get a unique order
      nestedNodes.sort((a, b) => a.nodeName < b.nodeName ? -1 : 1)
      // now convert to dom string
      let str = ''
      for (let i = 0; i < nestedNodes.length; i++) {
        const node = nestedNodes[i]
        str += `<${node.nodeName}`
        for (let j = 0; j < node.attrs.length; j++) {
          const attr = node.attrs[j]
          str += ` ${attr.key}="${attr.value}"`
        }
        str += '>'
      }
      str += delta.insert
      for (let i = nestedNodes.length - 1; i >= 0; i--) {
        str += `</${nestedNodes[i].nodeName}>`
      }
      return str
    }).join('')
  }

  /**
   * @return {string}
   */
  toJSON () {
    return this.toString()
  }

  /**
   * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
   */
  _write (encoder) {
    encoder.writeTypeRef(YXmlTextRefID)
  }
}

/**
 * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
 * @return {YXmlText}
 *
 * @private
 * @function
 */
export const readYXmlText = decoder => new YXmlText()
