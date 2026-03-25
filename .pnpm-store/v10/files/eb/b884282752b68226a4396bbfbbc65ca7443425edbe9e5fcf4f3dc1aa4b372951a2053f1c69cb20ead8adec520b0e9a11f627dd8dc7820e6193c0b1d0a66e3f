'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var queue = require('./queue.cjs');
var object = require('./object-c0c9435b.cjs');
require('./equality.cjs');

/**
 * @experimental Use of this module is not encouraged!
 * This is just an experiment.
 * @todo remove `c8 ignore` line once this is moved to "non-experimental"
 */

/* c8 ignore start */

/**
 * @type {queue.Queue<queue.QueueValue<()=>void>>}
 */
const ctxFs = queue.create();

/**
 * @param {() => void} f
 */
const runInGlobalContext = f => {
  const isEmpty = queue.isEmpty(ctxFs);
  queue.enqueue(ctxFs, new queue.QueueValue(f));
  if (isEmpty) {
    while (!queue.isEmpty(ctxFs)) {
      /** @type {queue.QueueValue<()=>{}>} */ (ctxFs.start).v();
      queue.dequeue(ctxFs);
    }
  }
};

/**
 * @template V
 * @typedef {V | PledgeInstance<V>} Pledge
 */

/**
 * @template {any} Val
 * @template {any} [CancelReason=Error]
 */
class PledgeInstance {
  constructor () {
    /**
     * @type {Val | CancelReason | null}
     */
    this._v = null;
    this.isResolved = false;
    /**
     * @type {Array<function(Val):void> | null}
     */
    this._whenResolved = [];
    /**
     * @type {Array<function(CancelReason):void> | null}
     */
    this._whenCanceled = [];
  }

  get isDone () {
    return this._whenResolved === null
  }

  get isCanceled () {
    return !this.isResolved && this._whenResolved === null
  }

  /**
   * @param {Val} v
   */
  resolve (v) {
    const whenResolved = this._whenResolved;
    if (whenResolved === null) return
    this._v = v;
    this.isResolved = true;
    this._whenResolved = null;
    this._whenCanceled = null;
    for (let i = 0; i < whenResolved.length; i++) {
      whenResolved[i](v);
    }
  }

  /**
   * @param {CancelReason} reason
   */
  cancel (reason) {
    const whenCanceled = this._whenCanceled;
    if (whenCanceled === null) return
    this._v = reason;
    this._whenResolved = null;
    this._whenCanceled = null;
    for (let i = 0; i < whenCanceled.length; i++) {
      whenCanceled[i](reason);
    }
  }

  /**
   * @template R
   * @param {function(Val):Pledge<R>} f
   * @return {PledgeInstance<R>}
   */
  map (f) {
    /**
     * @type {PledgeInstance<R>}
     */
    const p = new PledgeInstance();
    this.whenResolved(v => {
      const result = f(v);
      if (result instanceof PledgeInstance) {
        if (result._whenResolved === null) {
          result.resolve(/** @type {R} */ (result._v));
        } else {
          result._whenResolved.push(p.resolve.bind(p));
        }
      } else {
        p.resolve(result);
      }
    });
    return p
  }

  /**
   * @param {function(Val):void} f
   */
  whenResolved (f) {
    if (this.isResolved) {
      f(/** @type {Val} */ (this._v));
    } else {
      this._whenResolved?.push(f);
    }
  }

  /**
   * @param {(reason: CancelReason) => void} f
   */
  whenCanceled (f) {
    if (this.isCanceled) {
      f(/** @type {CancelReason} */ (this._v));
    } else {
      this._whenCanceled?.push(f);
    }
  }

  /**
   * @return {Promise<Val>}
   */
  promise () {
    return new Promise((resolve, reject) => {
      this.whenResolved(resolve);
      this.whenCanceled(reject);
    })
  }
}

/**
 * @template T
 * @return {PledgeInstance<T>}
 */
const create = () => new PledgeInstance();

/**
 * @typedef {Array<Pledge<unknown>> | Object<string,Pledge<unknown>>} PledgeMap
 */

/**
 * @template {Pledge<unknown> | PledgeMap} P
 * @typedef {P extends PledgeMap ? { [K in keyof P]: P[K] extends Pledge<infer V> ? V : P[K]} : (P extends Pledge<infer V> ? V : never)} Resolved<P>
 */

/**
 * @todo Create a "resolveHelper" that will simplify creating indxeddbv2 functions. Double arguments
 * are not necessary.
 *
 * @template V
 * @template {Array<Pledge<unknown>>} DEPS
 * @param {(p: PledgeInstance<V>, ...deps: Resolved<DEPS>) => void} init
 * @param {DEPS} deps
 * @return {PledgeInstance<V>}
 */
const createWithDependencies = (init, ...deps) => {
  /**
   * @type {PledgeInstance<V>}
   */
  const p = new PledgeInstance();
  // @ts-ignore @todo remove this
  all(deps).whenResolved(ds => init(p, ...ds));
  return p
};

/**
 * @template R
 * @param {Pledge<R>} p
 * @param {function(R):void} f
 */
const whenResolved = (p, f) => {
  if (p instanceof PledgeInstance) {
    return p.whenResolved(f)
  }
  return f(p)
};

/**
 * @template {Pledge<unknown>} P
 * @param {P} p
 * @param {P extends PledgeInstance<unknown, infer CancelReason> ? function(CancelReason):void : function(any):void} f
 */
const whenCanceled = (p, f) => {
  if (p instanceof PledgeInstance) {
    p.whenCanceled(f);
  }
};

/**
 * @template P
 * @template Q
 * @param {Pledge<P>} p
 * @param {(r: P) => Q} f
 * @return {Pledge<Q>}
 */
const map = (p, f) => {
  if (p instanceof PledgeInstance) {
    return p.map(f)
  }
  return f(p)
};

/**
 * @template {PledgeMap} PS
 * @param {PS} ps
 * @return {PledgeInstance<Resolved<PS>>}
 */
const all = ps => {
  /**
   * @type {any}
   */
  const pall = create();
  /**
   * @type {any}
   */
  const result = ps instanceof Array ? new Array(ps.length) : {};
  let waitingPs = ps instanceof Array ? ps.length : object.size(ps);
  for (const key in ps) {
    const p = ps[key];
    whenResolved(p, r => {
      result[key] = r;
      if (--waitingPs === 0) {
        // @ts-ignore
        pall.resolve(result);
      }
    });
  }
  return pall
};

/**
 * @template Result
 * @template {any} YieldResults
 * @param {() => Generator<Pledge<YieldResults> | PledgeInstance<YieldResults,any>, Result, any>} f
 * @return {PledgeInstance<Result>}
 */
const coroutine = f => {
  const p = create();
  const gen = f();
  /**
   * @param {any} [yv]
   */
  const handleGen = (yv) => {
    const res = gen.next(yv);
    if (res.done) {
      p.resolve(res.value);
      return
    }
    // @ts-ignore
    whenCanceled(res.value, (reason) => {
      gen.throw(reason);
    });
    runInGlobalContext(() =>
      whenResolved(res.value, handleGen)
    );
  };
  handleGen();
  return p
};

/**
 * @param {number} timeout
 * @return {PledgeInstance<undefined>}
 */
const wait = timeout => {
  const p = create();
  setTimeout(p.resolve.bind(p), timeout);
  return p
};

/* c8 ignore end */

exports.PledgeInstance = PledgeInstance;
exports.all = all;
exports.coroutine = coroutine;
exports.create = create;
exports.createWithDependencies = createWithDependencies;
exports.map = map;
exports.wait = wait;
exports.whenCanceled = whenCanceled;
exports.whenResolved = whenResolved;
//# sourceMappingURL=pledge.cjs.map
