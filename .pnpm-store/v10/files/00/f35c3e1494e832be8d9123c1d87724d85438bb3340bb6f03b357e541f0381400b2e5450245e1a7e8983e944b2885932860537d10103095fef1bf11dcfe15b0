/**
 * @template T
 * @typedef {import('../schema.js').Schema<T>} Schema
 */
/**
 * @template {delta.AbstractDelta} DeltaA
 * @template {delta.AbstractDelta} DeltaB
 */
export class Binding<DeltaA extends delta.AbstractDelta, DeltaB extends delta.AbstractDelta> {
    /**
     * @param {RDT<DeltaA>} a
     * @param {RDT<DeltaB>} b
     * @param {dt.Template<any,DeltaA,DeltaB>} template
     */
    constructor(a: RDT<DeltaA>, b: RDT<DeltaB>, template: dt.Template<any, DeltaA, DeltaB>);
    /**
     * @type {dt.Transformer<any,DeltaA,DeltaB>}
     */
    t: dt.Transformer<any, DeltaA, DeltaB>;
    a: RDT<DeltaA>;
    b: RDT<DeltaB>;
    _mux: mux.mutex;
    _achanged: (delta: DeltaA) => void;
    _bchanged: (delta: DeltaB) => void;
    destroy: () => void;
}
export function bind<DeltaA extends delta.AbstractDelta, Transformer extends dt.Template<any, DeltaA, any>>(a: RDT<DeltaA>, b: RDT<Transformer extends dt.Template<any, DeltaA, infer DeltaB> ? DeltaB : never>, template: dt.Template<any, DeltaA, any>): Binding<DeltaA, Transformer extends dt.Template<any, DeltaA, infer DeltaB> ? DeltaB : never>;
export function deltaRDT<Delta extends delta.AbstractDelta>($delta: Schema<Delta>): DeltaRDT<Delta>;
export const $domDelta: any;
export function domRDT(dom: Element): DomRDT<delta.RecursiveNode<string, {
    [key: string]: string;
}, never, true>>;
export type Schema<T> = import("../schema.js").Schema<T>;
/**
 * Abstract Interface for a delta-based Replicated Data Type.
 */
export type RDT<Delta extends delta.AbstractDelta> = ObservableV2<{
    "change": (delta: Delta) => void;
    "destroy": (rdt: RDT<Delta>) => void;
}> & {
    update: (delta: Delta) => any;
    destroy: () => void;
};
export type DomDelta = delta.RecursiveNode<string, {
    [key: string]: string;
}, never, true>;
import * as delta from './delta.js';
import * as dt from './t3.test.js';
import * as mux from '../mutex.js';
/**
 * @template {delta.AbstractDelta} Delta
 * @implements RDT<Delta>
 * @extends {ObservableV2<{ change: (delta: Delta) => void, 'destroy': (rdt:DeltaRDT<Delta>)=>void }>}
 */
declare class DeltaRDT<Delta extends delta.AbstractDelta> extends ObservableV2<{
    change: (delta: Delta) => void;
    destroy: (rdt: DeltaRDT<Delta>) => void;
}> implements RDT<Delta> {
    /**
     * @param {Schema<Delta>} $delta
     */
    constructor($delta: Schema<Delta>);
    $delta: s.Schema<Delta>;
    /**
     * @type {Delta?}
     */
    state: Delta | null;
    _mux: mux.mutex;
    /**
     * @param {Delta} delta
     */
    update: (delta: Delta) => any;
}
/**
 * @typedef {delta.RecursiveNode<string, { [key:string]: string }, never, true>} DomDelta
 */
/**
 * @template {DomDelta} [D=DomDelta]
 * @implements RDT<D>
 * @extends {ObservableV2<{ change: (delta: D)=>void, destroy: (rdt:DomRDT<D>)=>void }>}>}
 */
declare class DomRDT<D extends DomDelta = delta.RecursiveNode<string, {
    [key: string]: string;
}, never, true>> extends ObservableV2<{
    change: (delta: D) => void;
    destroy: (rdt: DomRDT<D>) => void;
}> implements RDT<D> {
    /**
     * @param {Element} observedNode
     */
    constructor(observedNode: Element);
    observedNode: Element;
    _mux: mux.mutex;
    observer: MutationObserver;
    /**
     * @param {MutationRecord[]} mutations
     */
    _mutationHandler: (mutations: MutationRecord[]) => any;
    /**
     * @param {D} delta
     */
    update: (delta: D) => void;
}
import { ObservableV2 } from '../observable.js';
import * as s from '../schema.js';
export {};
//# sourceMappingURL=binding.d.ts.map