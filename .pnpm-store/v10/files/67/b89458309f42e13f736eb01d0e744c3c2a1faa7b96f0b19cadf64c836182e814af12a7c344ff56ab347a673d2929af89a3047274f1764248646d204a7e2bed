/**
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 * @example
 * type FunctionUnion = (() => void) | ((p: string) => void);
 * type FunctionIntersection = (() => void) & ((p: string) => void);
 * type SynthesizedFunctionIntersection = ITSUnionToIntersection<FunctionUnion>
 * // type SynthesizedFunctionIntersection = (() => void) & ((p: string) => void)
 */
export type ITSUnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
