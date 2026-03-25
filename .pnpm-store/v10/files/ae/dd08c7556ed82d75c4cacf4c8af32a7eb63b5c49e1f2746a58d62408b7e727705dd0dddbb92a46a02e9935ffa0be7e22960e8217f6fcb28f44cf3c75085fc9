import {
  YEvent,
  YXmlText, YXmlElement, YXmlFragment, Transaction // eslint-disable-line
} from '../internals.js'

/**
 * @extends YEvent<YXmlElement|YXmlText|YXmlFragment>
 * An Event that describes changes on a YXml Element or Yxml Fragment
 */
export class YXmlEvent extends YEvent {
  /**
   * @param {YXmlElement|YXmlText|YXmlFragment} target The target on which the event is created.
   * @param {Set<string|null>} subs The set of changed attributes. `null` is included if the
   *                   child list changed.
   * @param {Transaction} transaction The transaction instance with which the
   *                                  change was created.
   */
  constructor (target, subs, transaction) {
    super(target, transaction)
    /**
     * Whether the children changed.
     * @type {Boolean}
     * @private
     */
    this.childListChanged = false
    /**
     * Set of all changed attributes.
     * @type {Set<string>}
     */
    this.attributesChanged = new Set()
    subs.forEach((sub) => {
      if (sub === null) {
        this.childListChanged = true
      } else {
        this.attributesChanged.add(sub)
      }
    })
  }
}
