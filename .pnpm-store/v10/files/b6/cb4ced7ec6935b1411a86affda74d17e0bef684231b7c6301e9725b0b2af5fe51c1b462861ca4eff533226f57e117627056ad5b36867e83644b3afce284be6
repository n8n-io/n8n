export function last<L>(arr: ArrayLike<L>): L;
export function create<C>(): Array<C>;
export function copy<D>(a: Array<D>): Array<D>;
export function appendTo<M>(dest: Array<M>, src: Array<M>): void;
/**
 * Transforms something array-like to an actual Array.
 *
 * @function
 * @template T
 * @param {ArrayLike<T>|Iterable<T>} arraylike
 * @return {T}
 */
export const from: {
    <T_1>(arrayLike: ArrayLike<T_1>): T_1[];
    <T_1, U>(arrayLike: ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
    <T_1>(iterable: Iterable<T_1> | ArrayLike<T_1>): T_1[];
    <T_1, U>(iterable: Iterable<T_1> | ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
};
export function every<ARR extends ArrayLike<any>>(arr: ARR, f: ARR extends ArrayLike<infer S> ? ((value: S, index: number, arr: ARR) => boolean) : any): boolean;
export function some<ARR extends ArrayLike<any>>(arr: ARR, f: ARR extends ArrayLike<infer S> ? ((value: S, index: number, arr: ARR) => boolean) : never): boolean;
export function equalFlat<ELEM>(a: ArrayLike<ELEM>, b: ArrayLike<ELEM>): boolean;
export function flatten<ELEM>(arr: Array<Array<ELEM>>): Array<ELEM>;
export function unfold<T_1>(len: number, f: (arg0: number, arg1: Array<T_1>) => T_1): Array<T_1>;
export function fold<T_1, RESULT>(arr: Array<T_1>, seed: RESULT, folder: (arg0: RESULT, arg1: T_1, arg2: number) => RESULT): RESULT;
export const isArray: (arg: any) => arg is any[];
export function unique<T_1>(arr: Array<T_1>): Array<T_1>;
export function uniqueBy<T_1, M>(arr: ArrayLike<T_1>, mapper: (arg0: T_1) => M): Array<T_1>;
export function map<ARR extends ArrayLike<any>, MAPPER extends (arg0: ARR extends ArrayLike<infer T_1> ? T_1 : never, arg1: number, arg2: ARR) => any>(arr: ARR, mapper: MAPPER): Array<MAPPER extends (...args: any[]) => infer M ? M : never>;
export function bubblesortItem<T_1>(arr: Array<T_1>, i: number, compareFn: (a: T_1, b: T_1) => number): number;
//# sourceMappingURL=array.d.ts.map