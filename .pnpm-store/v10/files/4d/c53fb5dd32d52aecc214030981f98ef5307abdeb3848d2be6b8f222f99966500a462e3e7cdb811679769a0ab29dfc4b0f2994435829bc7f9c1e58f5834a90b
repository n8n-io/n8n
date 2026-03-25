import { IntersectOf } from './IntersectOf';
/**
 * Get the last item within an [[Union]]
 * (⚠️ it might not preserve order)
 * @param U
 * @returns [[Any]]
 * @example
 * ```ts
 * ```
 */
export declare type Last<U extends any> = IntersectOf<U extends unknown ? (x: U) => void : never> extends (x: infer P) => void ? P : never;
