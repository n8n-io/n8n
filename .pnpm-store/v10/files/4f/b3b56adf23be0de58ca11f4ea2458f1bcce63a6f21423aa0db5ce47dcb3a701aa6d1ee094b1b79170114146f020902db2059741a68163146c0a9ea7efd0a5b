import { At } from '../Any/At';
import { Key } from '../Any/Key';
import { List } from '../List/List';
import { Depth } from './_Internal';
import { BuiltIn } from '../Misc/BuiltIn';
import { _Omit } from './Omit';
import { Length } from '../List/Length';
import { Has } from '../Union/Has';
/**
 * @hidden
 */
declare type Longer<L extends List, L1 extends List> = L extends unknown ? L1 extends unknown ? {
    0: 0;
    1: 1;
}[Has<keyof L, keyof L1>] : never : never;
/**
 * @hidden
 */
declare type PatchProp<OK, O1K, fill, OKeys extends Key, K extends Key> = K extends OKeys ? OK extends fill ? O1K : OK : O1K;
/**
 * @hidden
 */
declare type PatchFlatObject<O extends object, O1 extends object, fill, OKeys extends Key = keyof O> = {
    [K in keyof (O & _Omit<O1, OKeys>)]: PatchProp<At<O, K>, At<O1, K>, fill, OKeys, K>;
} & {};
/**
 * @hidden
 */
declare type PatchFlatList<L extends List, L1 extends List, ignore extends object, fill> = number extends Length<L | L1> ? PatchFlatChoice<L[number], L1[number], ignore, fill>[] : Longer<L, L1> extends 1 ? {
    [K in keyof L]: PatchProp<L[K], At<L1, K>, fill, keyof L, K>;
} : {
    [K in keyof L1]: PatchProp<At<L, K>, L1[K], fill, keyof L, K>;
};
/**
 * @hidden
 */
export declare type PatchFlatChoice<O extends object, O1 extends object, ignore extends object, fill> = O extends ignore ? O : O1 extends ignore ? O : O extends List ? O1 extends List ? PatchFlatList<O, O1, ignore, fill> : PatchFlatObject<O, O1, fill> : PatchFlatObject<O, O1, fill>;
/**
 * @hidden
 */
export declare type PatchFlat<O extends object, O1 extends object, ignore extends object = BuiltIn, fill = never> = O extends unknown ? O1 extends unknown ? PatchFlatChoice<O, O1, ignore, fill> : never : never;
/**
 * @hidden
 */
declare type PatchDeepList<L extends List, L1 extends List, ignore extends object, fill> = number extends Length<L | L1> ? PatchDeepChoice<L[number], L1[number], ignore, fill, never, any>[] : Longer<L, L1> extends 1 ? {
    [K in keyof L]: PatchDeepChoice<L[K], At<L1, K>, ignore, fill, keyof L, K>;
} : {
    [K in keyof L1]: PatchDeepChoice<At<L, K>, L1[K], ignore, fill, keyof L, K>;
};
/**
 * @hidden
 */
declare type PatchDeepObject<O extends object, O1 extends object, ignore extends object, fill, OKeys extends Key = keyof O> = {
    [K in keyof (O & _Omit<O1, OKeys>)]: PatchDeepChoice<At<O, K>, At<O1, K>, ignore, fill, OKeys, K>;
};
/**
 * @hidden
 */
declare type PatchDeepChoice<OK, O1K, ignore extends object, fill, OKeys extends Key, K extends Key> = [
    OK
] extends [never] ? PatchProp<OK, O1K, fill, OKeys, K> : [
    O1K
] extends [never] ? PatchProp<OK, O1K, fill, OKeys, K> : OK extends ignore ? PatchProp<OK, O1K, fill, OKeys, K> : O1K extends ignore ? PatchProp<OK, O1K, fill, OKeys, K> : OK extends List ? O1K extends List ? PatchDeepList<OK, O1K, ignore, fill> : PatchProp<OK, O1K, fill, OKeys, K> : OK extends object ? O1K extends object ? PatchDeepObject<OK, O1K, ignore, fill> : PatchProp<OK, O1K, fill, OKeys, K> : PatchProp<OK, O1K, fill, OKeys, K>;
/**
 * @hidden
 */
export declare type PatchDeep<O extends object, O1 extends object, ignore extends object, fill> = O extends unknown ? O1 extends unknown ? PatchDeepChoice<O, O1, ignore, fill, 'x', 'y'> : never : never;
/**
 * Complete the fields of `O` with the ones of `O1`. This is a version of
 * [[Merge]] that does NOT handle optional fields, it only completes fields of
 * `O` with the ones of `O1`.
 * @param O to complete
 * @param O1 to copy from
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @param ignore (?=`BuiltIn`) types not to merge
 * @param fill (?=`never`) types of `O` to be replaced with ones of `O1`
 * @returns [[Object]]
 * @example
 * ```ts
 * import {O} from 'ts-toolbelt'
 *
 * type O = {
 *  name?: string
 *  age? : number
 *  zip? : string
 *  pay  : {
 *      cvv?: number
 *  }
 * }
 *
 * type O1 = {
 *  age : number
 *  zip?: number
 *  city: string
 *  pay : {
 *      cvv : number
 *      ccn?: string
 *  }
 * }
 *
 * type test = O.Patch<O, O1, 'deep'>
 * // {
 * //     name?: string;
 * //     age?: number;
 * //     zip?: string | number;
 * //     pay: {
 * //         cvv?: number;
 * //         ccn?: string;
 * //     };
 * //     city: string;
 * // }
 * ```
 */
export declare type Patch<O extends object, O1 extends object, depth extends Depth = 'flat', ignore extends object = BuiltIn, fill extends any = never> = {
    'flat': PatchFlat<O, O1, ignore, fill>;
    'deep': PatchDeep<O, O1, ignore, fill>;
}[depth];
export {};
