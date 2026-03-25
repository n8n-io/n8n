import { Merge } from "../merge";
type _MergeN<Tuple extends readonly any[], Result> = Tuple extends readonly [infer Head, ...infer Tail] ? _MergeN<Tail, Merge<Result, Head>> : Result;
export type MergeN<Tuple extends readonly any[]> = _MergeN<Tuple, {}>;
export {};
