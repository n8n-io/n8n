'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var observable = require('./observable.cjs');
var delta = require('./delta.cjs');
require('./testing.cjs');
var schema = require('./schema.cjs');
var dom = require('./dom-7e625b09.cjs');
var set = require('./set-5b47859e.cjs');
var map = require('./map-24d263c0.cjs');
var error = require('./error-0c1f634f.cjs');
var math = require('./math-96d5e8c4.cjs');
var mutex = require('./mutex-63f09c81.cjs');
require('./array-78849c95.cjs');
require('./list.cjs');
require('./function-314580f7.cjs');
require('./object-c0c9435b.cjs');
require('./equality.cjs');
require('./fingerprint.cjs');
require('./encoding-1a745c43.cjs');
require('./number-1fb57bba.cjs');
require('./binary-ac8e39e2.cjs');
require('./string-fddc5f8b.cjs');
require('./rabin.cjs');
require('./buffer-3e750729.cjs');
require('./environment-1c97264d.cjs');
require('./conditions-f5c0c102.cjs');
require('./storage.cjs');
require('./decoding-76e75827.cjs');
require('./patience.cjs');
require('./prng-37d48618.cjs');
require('lib0/logging');
require('./diff-9d236524.cjs');
require('./random.cjs');
require('lib0/webcrypto');
require('./statistics-65f6114b.cjs');
require('./json-092190a1.cjs');
require('./time-d8438852.cjs');
require('./metric.cjs');
require('./promise-cda7b9bb.cjs');
require('lib0/performance');
require('./pair-ab022bc3.cjs');

/* eslint-disable */

/**
 * @template {delta.Delta?} DeltaA
 * @template {delta.Delta?} DeltaB
 * @typedef {{ a: DeltaA?, b: DeltaB? }} TransformResult
 */

/**
 * @template {delta.DeltaBuilder?} DeltaA
 * @template {delta.DeltaBuilder?} DeltaB
 * @param {DeltaA} a
 * @param {DeltaB} b
 * @return {TransformResult<DeltaA?,DeltaB?>}
 */
const transformResult = (a, b) => ({ a, b });

transformResult(delta.create('x'), null);

/**
 * @template {delta.DeltaAny} DeltaA
 * @template {delta.DeltaAny} DeltaB
 * @typedef {(t:{a:DeltaA?,b:DeltaB?})=>({a:DeltaA?,b:DeltaB?})} DeltaTransformer
 */

/**
 * @template {delta.Delta<string,any,any,any>} A
 * @template {(A extends delta.Delta<infer NodeName,infer Attrs,infer Children,infer Text> ? delta.Delta<`x-${NodeName}`,Attrs,Children,Text> : never)} B
 * @param {TransformResult<A,B>} t
 * @return {TransformResult<A,B>}
 */
const rename = t => {
  /**
   * @type {any}
   */
  const tout = /** @type {any} */ (transformResult(null, null));
  if (t.a) {
    const c = /** @type {delta.Delta} */ (t.a.clone());
    c.name = 'x-' + c.name;
    // @ts-ignore
    tout.b = c;
  }
  if (t.b) {
    const c = /** @type {delta.Delta} */ (t.b.clone());
    c.name = c.name.slice(2);
    // @ts-ignore
    tout.a = c;
  }
  return tout
};

delta.create('x', { x: 'dtrn' });
rename({ a: delta.create('x', { x: 'dtrn' }), b: null });
//
// /**
//  * @template {delta.Delta} D
//  * @param {s.Schema<D>} $d
//  * @return {Transformer<D,D>}
//  */
// const id = ($d) => /** @type {Transformer<D,D>} */ (new Transformer($d))
//
// const q = id(delta.$delta({ name: 'div' }))
// const q2 = id(delta.$delta({ name: 'div', attrs: { a: s.$string } })).pipe(t.delta('h1', { color: t => query('a')(t), name:'mystuff' }, t => [query('b')(t)]))
// const q3 = t.delta('h1', { color: t => query('a')(t), name:'mystuff' }, t => [query('b')(t)])(id(delta.$delta({ name: 'div', attrs: { a: s.$string } }))))
//
//
// /**
//  * @param {Transformer<delta.Delta<any,{ a: string, name: string }>>} t
//  */
// const dataToH1 = t => t.delta('h1', { color: t => query('a')(t), name:'mystuff' }, t => [query('b')(t)])(t)
// const q4 = dataToH1(id(delta.$delta({ name: 'div', attrs: { a: s.$string } })))
//
// const dataToH1_2 = t => rename('h1')(renameAttr({ a: 'color' })(static(delta.create('h1', { name: 'mystuff' }, 'some content!'))(t)))

/* eslint-disable */

/**
 * @template T
 * @typedef {import('../schema.js').Schema<T>} Schema
 */

/**
 * @template {delta.AbstractDelta} DeltaA
 * @template {delta.AbstractDelta} DeltaB
 */
class Binding {
  /**
   * @param {RDT<DeltaA>} a
   * @param {RDT<DeltaB>} b
   * @param {dt.Template<any,DeltaA,DeltaB>} template
   */
  constructor (a, b, template) {
    /**
     * @type {dt.Transformer<any,DeltaA,DeltaB>}
     */
    this.t = template.init();
    this.a = a;
    this.b = b;
    this._mux = mutex.createMutex();
    this._achanged = this.a.on('change', d => this._mux(() => {
      const tres = this.t.applyA(d);
      if (tres.a) {
        a.update(tres.a);
      }
      if (tres.b) {
        b.update(tres.b);
      }
    }));
    this._bchanged = this.b.on('change', d => this._mux(() => {
      const tres = this.t.applyB(d);
      if (tres.b) {
        this.b.update(tres.b);
      }
      if (tres.a) {
        a.update(tres.a);
      }
    }));
  }

  destroy = () => {
    this.a.off('destroy', this.destroy);
    this.b.off('destroy', this.destroy);
    this.a.off('change', this._achanged);
    this.b.off('change', this._bchanged);
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
const bind = (a, b, template) => new Binding(a, b, template);

/**
 * @template {delta.AbstractDelta} Delta
 * @implements RDT<Delta>
 * @extends {ObservableV2<{ change: (delta: Delta) => void, 'destroy': (rdt:DeltaRDT<Delta>)=>void }>}
 */
class DeltaRDT extends observable.ObservableV2 {
  /**
   * @param {Schema<Delta>} $delta
   */
  constructor ($delta) {
    super();
    this.$delta = $delta;
    /**
     * @type {Delta?}
     */
    this.state = null;
    this._mux = mutex.createMutex();
  }

  /**
   * @param {Delta} delta
   */
  update = delta => delta.isEmpty() || this._mux(() => {
    if (this.state != null) {
      this.state.apply(delta);
    } else {
      this.state = delta;
    }
    this.emit('change', [delta]);
  })

  destroy () {
    this.emit('destroy', [this]);
    super.destroy();
  }
}

/**
 * @template {delta.AbstractDelta} Delta
 * @param {Schema<Delta>} $delta
 */
const deltaRDT = $delta => new DeltaRDT($delta);

/**
 * @param {Node} domNode
 */
const domToDelta = domNode => {
  if (dom.$element.check(domNode)) {
    const d = undefined(domNode.nodeName.toLowerCase());
    for (let i = 0; i < domNode.attributes.length; i++) {
      const attr = /** @type {Attr} */ (domNode.attributes.item(i));
      d.attributes.set(attr.nodeName, attr.value);
    }
    domNode.childNodes.forEach(child => {
      d.children.insert(dom.$text.check(child) ? child.textContent : [domToDelta(child)]);
    });
    return d
  }
  error.unexpectedCase();
};

/**
 * @param {DomDelta} d
 */
const deltaToDom = d => {
  if (undefined(d)) {
    const n = dom.element(d.name);
    d.attributes.forEach(change => {
      if (delta.$insertOp.check(change)) {
        n.setAttribute(change.key, change.value);
      }
    });
    d.children.forEach(child => {
      if (delta.$insertOp.check(child)) {
        n.append(...child.insert.map(deltaToDom));
      } else if (delta.$textOp.check(child)) {
        n.append(dom.text(child.insert));
      }
    });
    return n
  }
  error.unexpectedCase();
};

/**
 * @param {Element} el
 * @param {delta.Node<string,any,any,any>} d
 */
const applyDeltaToDom = (el, d) => {
  d.attributes.forEach(change => {
    if (delta.$deleteOp.check(change)) {
      el.removeAttribute(change.key);
    } else {
      el.setAttribute(change.key, change.value);
    }
  });
  let childIndex = 0;
  let childOffset = 0;
  d.children.forEach(change => {
    let child = el.childNodes[childIndex] || null;
    if (delta.$deleteOp.check(change)) {
      let len = change.length;
      while (len > 0) {
        if (dom.$element.check(child)) {
          child.remove();
          len--;
        } else if (dom.$text.check(child)) {
          const childLen = child.length;
          if (childOffset === 0 && childLen <= len) {
            child.remove();
            len -= childLen;
          } else {
            const spliceLen = math.min(len, childLen - childOffset);
            child.deleteData(childOffset, spliceLen);
            if (child.length <= childOffset) {
              childOffset = 0;
              childIndex++;
            }
          }
        }
      }
    } else if (delta.$insertOp.check(change)) {
      if (childOffset > 0) {
        const tchild = dom.$text.cast(child);
        child = tchild.splitText(childOffset);
        childIndex++;
        childOffset = 0;
      }
      el.insertBefore(dom.fragment(change.insert.map(deltaToDom)), child);
    } else if (delta.$modifyOp.check(change)) {
      applyDeltaToDom(dom.$element.cast(child), change.modify);
    } else if (delta.$textOp.check(change)) {
      el.insertBefore(dom.text(change.insert), child);
    } else {
      error.unexpectedCase();
    }
  });
};

const $domDelta = undefined(schema.$string, schema.$record(schema.$string, schema.$string), schema.$never, { recursive: true, withText: true });

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
  const changedNodes = map.create();
  /**
   * @param {Node} node
   * @return {ChangedNodeInfo}
   */
  const getChangedNodeInfo = node => map.setIfUndefined(changedNodes, node, () => ({ removedBefore: map.create(), added: set.create(), modified: 0, d: undefined(node.nodeName.toLowerCase()) }));
  const observedNodeInfo = getChangedNodeInfo(observedNode);
  mutations.forEach(mutation => {
    const target = /** @type {HTMLElement} */ (mutation.target);
    const parent = target.parentNode;
    const attrName = /** @type {string} */ (mutation.attributeName);
    const newVal = target.getAttribute(attrName);
    const info = getChangedNodeInfo(target);
    const d = info.d;
    // go up the tree and mark that a child has been modified
    for (let changedParent = parent; changedParent != null && getChangedNodeInfo(changedParent).modified++ > 1 && changedParent !== observedNode; changedParent = changedParent.parentNode) {
      // nop
    }
    switch (mutation.type) {
      case 'attributes': {
        const attrs = /** @type {delta.Node<any,any,any>} */ (d).attributes;
        if (newVal == null) {
          attrs.delete(attrName);
        } else {
          attrs.set(/** @type {string} */ (attrName), newVal);
        }
        break
      }
      case 'characterData': {
        error.methodUnimplemented();
        break
      }
      case 'childList': {
        const targetInfo = getChangedNodeInfo(target);
        mutation.addedNodes.forEach(node => {
          targetInfo.added.add(node);
        });
        const removed = mutation.removedNodes.length;
        if (removed > 0) {
          // @todo this can't work because next can be null
          targetInfo.removedBefore.set(mutation.nextSibling, removed);
        }
        break
      }
    }
  });
  changedNodes.forEach((info, node) => {
    const numOfChildChanges = info.modified + info.removedBefore.size + info.added.size;
    const d = /** @type {delta.Node<any,any,any>} */ (info.d);
    if (numOfChildChanges > 0) {
      node.childNodes.forEach(nchild => {
        if (info.removedBefore.has(nchild)) { // can happen separately
          d.children.delete(/** @type {number} */ (info.removedBefore.get(nchild)));
        }
        if (info.added.has(nchild)) {
          d.children.insert(dom.$text.check(nchild) ? nchild.textContent : [domToDelta(nchild)]);
        } else if (changedNodes.has(nchild)) {
          d.children.modify(getChangedNodeInfo(nchild).d);
        }
      });
      // remove items to the end, if necessary
      d.children.delete(info.removedBefore.get(null) ?? 0);
    }
    d.done();
  });
  observedNodeInfo.d.origin = origin;
  return observedNodeInfo.d
};

/**
 * @typedef {delta.RecursiveNode<string, { [key:string]: string }, never, true>} DomDelta
 */

/**
 * @template {DomDelta} [D=DomDelta]
 * @implements RDT<D>
 * @extends {ObservableV2<{ change: (delta: D)=>void, destroy: (rdt:DomRDT<D>)=>void }>}>}
 */
class DomRDT extends observable.ObservableV2 {
  /**
   * @param {Element} observedNode
   */
  constructor (observedNode) {
    super();
    this.observedNode = observedNode;
    this._mux = mutex.createMutex();
    this.observer = new MutationObserver(this._mutationHandler);
    this.observer.observe(observedNode, {
      subtree: true,
      childList: true,
      attributes: true,
      characterDataOldValue: true
    });
  }

  /**
   * @param {MutationRecord[]} mutations
   */
  _mutationHandler = mutations =>
    mutations.length > 0 && this._mux(() => {
      this.emit('change', [/** @type {D} */(_mutationsToDelta(this.observedNode, mutations, this))]);
    })

  /**
   * @param {D} delta
   */
  update = delta => {
    if (delta.origin !== this) {
      // @todo the retrieved changes must be transformed agains the updated changes. need a proper
      // transaction system
      this._mutationHandler(this.observer.takeRecords());
      this._mux(() => {
        applyDeltaToDom(this.observedNode, delta);
        const mutations = this.observer.takeRecords();
        this.emit('change', [/** @type {D} */(_mutationsToDelta(this.observedNode, mutations, delta.origin))]);
      });
    }
  }

  destroy () {
    this.emit('destroy', [this]);
    super.destroy();
    this.observer.disconnect();
  }
}

/**
 * @param {Element} dom
 */
const domRDT = dom => new DomRDT(dom);

exports.$domDelta = $domDelta;
exports.Binding = Binding;
exports.bind = bind;
exports.deltaRDT = deltaRDT;
exports.domRDT = domRDT;
//# sourceMappingURL=binding.cjs.map
