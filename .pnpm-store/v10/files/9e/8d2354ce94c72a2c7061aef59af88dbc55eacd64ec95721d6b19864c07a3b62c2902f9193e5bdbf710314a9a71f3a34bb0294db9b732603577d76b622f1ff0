export type XXHash<T> = {
  update(input: string | Uint8Array): XXHash<T>;
  digest(): T;
}

export type XXHashAPI = {
  h32(input: string, seed?: number): number;
  h32ToString(input: string, seed?: number): string;
  h32Raw(inputBuffer: Uint8Array, seed?: number): number;
  create32(seed?: number): XXHash<number>;
  h64(input: string, seed?: bigint): bigint;
  h64ToString(input: string, seed?: bigint): string;
  h64Raw(inputBuffer: Uint8Array, seed?: bigint): bigint;
  create64(seed?: bigint): XXHash<bigint>;
};

declare module "xxhash-wasm" {
  export default function xxhash(): Promise<XXHashAPI>;
}
