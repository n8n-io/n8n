import { ITSPartialRecord } from '../../type/record/partial';
/**
 * 在项目开发中，很多时候会遇到一种场景，需要定义一个对象的类型，此类型必须包含某n个字段中的其中一种，且只选一个。
 *
 * @see https://juejin.cn/post/7150316226009382919#heading-2
 */
export type ITSPickOne<T, Keys extends keyof T = keyof T> = {
    [K in Keys]: Record<K, T[K]> & ITSPartialRecord<Exclude<keyof T, K>, void>;
}[Keys];
