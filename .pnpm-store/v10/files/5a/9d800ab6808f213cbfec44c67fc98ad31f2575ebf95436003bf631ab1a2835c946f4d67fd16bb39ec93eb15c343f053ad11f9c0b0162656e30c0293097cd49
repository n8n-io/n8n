import { At } from '../Any/At';
import { Replace } from '../Union/Replace';
import { x } from '../Any/x';
import { Exclude } from '../Union/Exclude';
/**
 * Modify `O` with `OMod` & the [[x]] placeholder
 * @param O to copy from
 * @param OMod to copy to
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Modify<O extends object, OMod extends object> = {
    [K in keyof OMod]: Replace<OMod[K], x, Exclude<At<O, K>, undefined>>;
} & {};
