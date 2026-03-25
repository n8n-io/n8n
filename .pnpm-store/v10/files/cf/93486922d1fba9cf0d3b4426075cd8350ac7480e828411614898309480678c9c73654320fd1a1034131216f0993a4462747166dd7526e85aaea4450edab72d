/**
 * Created by user on 2019/6/11.
 */
/**
 * https://stackoverflow.com/questions/49285864/is-there-a-valueof-similar-to-keyof-in-typescript
 */
import { ITSMapLike } from '../generic';
import { ITSIteratorLazy } from './typeof';
import { ITSArrayListMaybeReadonly } from '../type/base';
export type ITSValueOf<T extends Record<any, any>> = T[keyof T];
export type { ITSValueOf as ITSValueOfRecord };
export type ITSKeyOf<T> = keyof T;
export type ITSPickValueOf<T, K extends keyof T> = ITSValueOf<Pick<T, K>>;
export type ITSValueOfIterator<T extends ITSIteratorLazy<any>> = (T extends Iterator<infer U> ? U : T extends IteratorResult<infer U> ? U : any)[];
export type ITSValueOfMap<T extends ITSMapLike<any, any>> = T extends ITSMapLike<any, infer U> ? U[] : any[];
export type ITSValueOfArray<T extends ITSArrayListMaybeReadonly<any>> = T extends readonly (infer U)[] ? U : T extends (infer U)[] ? U : never;
export type ITSValueOfArrayLike<T extends ITSArrayListMaybeReadonly<any> | ArrayLike<any>> = T extends ITSArrayListMaybeReadonly<T> ? ITSValueOfArray<T> : T extends ArrayLike<infer U> ? U : never;
