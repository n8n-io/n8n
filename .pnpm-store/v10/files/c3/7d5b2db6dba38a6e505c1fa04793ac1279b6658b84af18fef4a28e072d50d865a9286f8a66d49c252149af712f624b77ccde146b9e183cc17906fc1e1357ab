/* eslint-disable */
// @ts-nocheck
// @todo remove all @ts-nocheck and eslint-disable
/* global MutationObserver */
import { ObservableV2 } from '../observable.js'
import * as delta from './delta.js'
import * as dt from './t3.test.js' // eslint-disable-line
import * as dom from '../dom.js'
import * as set from '../set.js'
import * as map from '../map.js'
import * as error from '../error.js'
import * as math from '../math.js'
import * as mux from '../mutex.js'
import * as s from '../schema.js'

/**
 * @template T
 * @typedef {import('../schema.js').Schema<T>} Schema
 */

/**
 * @template {delta.AbstractDelta} DeltaA
 * @template {delta.AbstractDelta} DeltaB
 */
export class Binding {
  /**
   * @param {RDT<DeltaA>} a
   * @param {RDT<DeltaB>} b
   * @param {dt.Template<any,DeltaA,DeltaB>} template
   */
  constructor (a, b, template) {
    /**
     * @type {dt.Transformer<any,DeltaA,DeltaB>}
     */
    this.t = template.init()
    this.a = a
    this.b = b
    this._mux = mux.createMutex()
    this._achanged = this.a.on('change', d => this._mux(() => {
      const tres = this.t.applyA(d)
      if (tres.a) {
        a.update(tres.a)
      }
      if (tres.b) {
        b.update(tres.b)
      }
    }))
    this._bchanged = this.b.on('change', d => this._mux(() => {
      const tres = this.t.applyB(d)
      if (tres.b) {
        this.b.update(tres.b)
      }
      if (tres.a) {
        a.update(tres.a)
      }
    }))
  }

  destroy = () => {
    this.a.off('destroy', this.destroy)
    this.b.off('destroy', this.destroy)
    this.a.off('change', this._achanged)
    this.b.off('change', this._bchanged)
  }
}

/**
 * Abstract Interface for a delta-based Replicated Data Type.
 *
 * @template {delta.AbstractDelta} Delta
 * @typedef {ObservableV2<{ 'change': (delta: Delta) => void, 'destroy': (rdt:RDT<Delta>)=>void }> & { update: (delta: Delta) => any, destroy: () => void }} RDT
 */

/**
 * @template {delta.AbstractDelta} DeltaA
 * @template {dt.Template<any,DeltaA,any>} Transformer
 * @param {RDT<DeltaA>} a
 * @param {RDT<Transformer extends dt.Template<any,DeltaA,infer DeltaB> ? DeltaB : never>} b
 * @param {dt.Template<any,DeltaA,any>} template
 */
export const bind = (a, b, template) => new Binding(a, b, template)

/**
 * @template {delta.AbstractDelta} Delta
 * @implements RDT<Delta>
 * @extends {ObservableV2<{ change: (delta: Delta) => void, 'destroy': (rdt:DeltaRDT<Delta>)=>void }>}
 */
class DeltaRDT extends ObservableV2 {
  /**
   * @param {Schema<Delta>} $delta
   */
  constructor ($delta) {
    super()
    this.$delta = $delta
    /**
     * @type {Delta?}
     */
    this.state = null
    this._mux = mux.createMutex()
  }

  /**
   * @param {Delta} delta
   */
  update = delta => delta.isEmpty() || this._mux(() => {
    if (this.state != null) {
      this.state.apply(delta)
    } else {
      this.state = delta
    }
    this.emit('change', [delta])
  })

  destroy () {
    this.emit('destroy', [this])
    super.destroy()
  }
}

/**
 * @template {delta.AbstractDelta} Delta
 * @param {Schema<Delta>} $delta
 */
export const deltaRDT = $delta => new DeltaRDT($delta)

/**
 * @param {Node} domNode
 */
const domToDelta = domNode => {
  if (dom.$element.check(domNode)) {
    const d = delta.node(domNode.nodeName.toLowerCase())
    for (let i = 0; i < domNode.attributes.length; i++) {
      const attr = /** @type {Attr} */ (domNode.attributes.item(i))
      d.attributes.set(attr.nodeName, attr.value)
    }
    domNode.childNodes.forEach(child => {
      d.children.insert(dom.$text.check(child) ? child.textContent : [domToDelta(child)])
    })
    return d
  }
  error.unexpectedCase()
}

/**
 * @param {DomDelta} d
 */
const deltaToDom = d => {
  if (delta.$nodeAny.check(d)) {
    const n = dom.element(d.name)
    d.attributes.forEach(change => {
      if (delta.$insertOp.check(change)) {
        n.setAttribute(change.key, change.value)
      }
    })
    d.children.forEach(child => {
      if (delta.$insertOp.check(child)) {
        n.append(...child.insert.map(deltaToDom))
      } else if (delta.$textOp.check(child)) {
        n.append(dom.text(child.insert))
      }
    })
    return n
  }
  error.unexpectedCase()
}

/**
 * @param {Element} el
 * @param {delta.Node<string,any,any,any>} d
 */
const applyDeltaToDom = (el, d) => {
  d.attributes.forEach(change => {
    if (delta.$deleteOp.check(change)) {
      el.removeAttribute(change.key)
    } else {
      el.setAttribute(change.key, change.value)
    }
  })
  let childIndex = 0
  let childOffset = 0
  d.children.forEach(change => {
    let child = el.childNodes[childIndex] || null
    if (delta.$deleteOp.check(change)) {
      let len = change.length
      while (len > 0) {
        if (dom.$element.check(child)) {
          child.remove()
          len--
        } else if (dom.$text.check(child)) {
          const childLen = child.length
          if (childOffset === 0 && childLen <= len) {
            child.remove()
            len -= childLen
          } else {
            const spliceLen = math.min(len, childLen - childOffset)
            child.deleteData(childOffset, spliceLen)
            if (child.length <= childOffset) {
              childOffset = 0
              childIndex++
            }
          }
        }
      }
    } else if (delta.$insertOp.check(change)) {
      if (childOffset > 0) {
        const tchild = dom.$text.cast(child)
        child = tchild.splitText(childOffset)
        childIndex++
        childOffset = 0
      }
      el.insertBefore(dom.fragment(change.insert.map(deltaToDom)), child)
    } else if (delta.$modifyOp.check(change)) {
      applyDeltaToDom(dom.$element.cast(child), change.modify)
    } else if (delta.$textOp.check(change)) {
      el.insertBefore(dom.text(change.insert), child)
    } else {
      error.unexpectedCase()
    }
  })
}

export const $domDelta = delta.$node(s.$string, s.$record(s.$string, s.$string), s.$never, { recursive: true, withText: true })

/**
 * @param {Element} observedNode
 * @param {MutationRecord[]} mutations
 * @param {any} origin assign this origin to the generated delta
 */
const _mutationsToDelta = (observedNode, mutations, origin) => {
  /**
   * @typedef {{ removedBefore: Map<Node?,number>, added: Set<Node>, modified: number, d: delta.Node }} ChangedNodeInfo
   */
  /**
   * Compute all deltas without recursion.
   *
   * 1. mark all changed parents in parentsChanged
   * 2. fill out necessary information for each changed parent ()
   */
  //
  /**
   * @type {Map<Node,ChangedNodeInfo>}
   */
  const changedNodes = map.create()
  /**
   * @param {Node} node
   * @return {ChangedNodeInfo}
   */
  const getChangedNodeInfo = node => map.setIfUndefined(changedNodes, node, () => ({ removedBefore: map.create(), added: set.create(), modified: 0, d: delta.node(node.nodeName.toLowerCase()) }))
  const observedNodeInfo = getChangedNodeInfo(observedNode)
  mutations.forEach(mutation => {
    const target = /** @type {HTMLElement} */ (mutation.target)
    const parent = target.parentNode
    const attrName = /** @type {string} */ (mutation.attributeName)
    const newVal = target.getAttribute(attrName)
    const info = getChangedNodeInfo(target)
    const d = info.d
    // go up the tree and mark that a child has been modified
    for (let changedParent = parent; changedParent != null && getChangedNodeInfo(changedParent).modified++ > 1 && changedParent !== observedNode; changedParent = changedParent.parentNode) {
      // nop
    }
    switch (mutation.type) {
      case 'attributes': {
        const attrs = /** @type {delta.Node<any,any,any>} */ (d).attributes
        if (newVal == null) {
          attrs.delete(attrName)
        } else {
          attrs.set(/** @type {string} */ (attrName), newVal)
        }
        break
      }
      case 'characterData': {
        error.methodUnimplemented()
        break
      }
      case 'childList': {
        const targetInfo = getChangedNodeInfo(target)
        mutation.addedNodes.forEach(node => {
          targetInfo.added.add(node)
        })
        const removed = mutation.removedNodes.length
        if (removed > 0) {
          // @todo this can't work because next can be null
          targetInfo.removedBefore.set(mutation.nextSibling, removed)
        }
        break
      }
    }
  })
  changedNodes.forEach((info, node) => {
    const numOfChildChanges = info.modified + info.removedBefore.size + info.added.size
    const d = /** @type {delta.Node<any,any,any>} */ (info.d)
    if (numOfChildChanges > 0) {
      node.childNodes.forEach(nchild => {
        if (info.removedBefore.has(nchild)) { // can happen separately
          d.children.delete(/** @type {number} */ (info.removedBefore.get(nchild)))
        }
        if (info.added.has(nchild)) {
          d.children.insert(dom.$text.check(nchild) ? nchild.textContent : [domToDelta(nchild)])
        } else if (changedNodes.has(nchild)) {
          d.children.modify(getChangedNodeInfo(nchild).d)
        }
      })
      // remove items to the end, if necessary
      d.children.delete(info.removedBefore.get(null) ?? 0)
    }
    d.done()
  })
  observedNodeInfo.d.origin = origin
  return observedNodeInfo.d
}

/**
 * @typedef {delta.RecursiveNode<string, { [key:string]: string }, never, true>} DomDelta
 */

/**
 * @template {DomDelta} [D=DomDelta]
 * @implements RDT<D>
 * @extends {ObservableV2<{ change: (delta: D)=>void, destroy: (rdt:DomRDT<D>)=>void }>}>}
 */
class DomRDT extends ObservableV2 {
  /**
   * @param {Element} observedNode
   */
  constructor (observedNode) {
    super()
    this.observedNode = observedNode
    this._mux = mux.createMutex()
    this.observer = new MutationObserver(this._mutationHandler)
    this.observer.observe(observedNode, {
      subtree: true,
      childList: true,
      attributes: true,
      characterDataOldValue: true
    })
  }

  /**
   * @param {MutationRecord[]} mutations
   */
  _mutationHandler = mutations =>
    mutations.length > 0 && this._mux(() => {
      this.emit('change', [/** @type {D} */(_mutationsToDelta(this.observedNode, mutations, this))])
    })

  /**
   * @param {D} delta
   */
  update = delta => {
    if (delta.origin !== this) {
      // @todo the retrieved changes must be transformed agains the updated changes. need a proper
      // transaction system
      this._mutationHandler(this.observer.takeRecords())
      this._mux(() => {
        applyDeltaToDom(this.observedNode, delta)
        const mutations = this.observer.takeRecords()
        this.emit('change', [/** @type {D} */(_mutationsToDelta(this.observedNode, mutations, delta.origin))])
      })
    }
  }

  destroy () {
    this.emit('destroy', [this])
    super.destroy()
    this.observer.disconnect()
  }
}

/**
 * @param {Element} dom
 */
export const domRDT = dom => new DomRDT(dom)
