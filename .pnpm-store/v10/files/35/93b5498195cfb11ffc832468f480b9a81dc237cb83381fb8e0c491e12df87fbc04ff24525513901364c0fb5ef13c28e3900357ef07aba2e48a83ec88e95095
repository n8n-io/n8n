import { IntersectOf } from '../Union/IntersectOf';
import { ComposeListAsync } from './Compose/List/Async';
import { ComposeListSync } from './Compose/List/Sync';
import { ComposeMultiAsync } from './Compose/Multi/Async';
import { ComposeMultiSync } from './Compose/Multi/Sync';
import { Input, Mode } from './_Internal';
/**
 * Compose [[Function]]s together
 * @param mode  (?=`'sync'`)    sync/async (this depends on your implementation)
 * @param input (?=`'multi'`)   whether you want it to take a list or parameters
 * @example
 * ```ts
 * import {F} from 'ts-toolbelt'
 *
 * /// If you are looking for creating types for `compose`
 * /// `Composer` will check for input & `Compose` the output
 * declare const compose: F.Compose
 *
 * const a = (a1: number) => `${a1}`
 * const c = (c1: string[]) => [c1]
 * const b = (b1: string) => [b1]
 *
 * compose(c, b, a)(42)
 *
 * /// And if you are looking for an async `compose` type
 * declare const compose: F.Compose<'async'>
 *
 * const a = async (a1: number) => `${a1}`
 * const b = async (b1: string) => [b1]
 * const c = async (c1: string[]) => [c1]
 *
 * await compose(c, b, a)(42)
 */
export declare type Compose<mode extends Mode = 'sync', input extends Input = 'multi'> = IntersectOf<{
    'sync': {
        'multi': ComposeMultiSync;
        'list': ComposeListSync;
    };
    'async': {
        'multi': ComposeMultiAsync;
        'list': ComposeListAsync;
    };
}[mode][input]>;
