/**
 * Description of the function
 *  @callback generatorNext
 *  @return {number} A random float in the cange of [0,1)
 */
/**
 * A random type generator.
 *
 * @typedef {Object} PRNG
 * @property {generatorNext} next Generate new number
 */
export const DefaultPRNG: typeof Xoroshiro128plus;
export function create(seed: number): PRNG;
export function bool(gen: PRNG): boolean;
export function int53(gen: PRNG, min: number, max: number): number;
export function uint53(gen: PRNG, min: number, max: number): number;
export function int32(gen: PRNG, min: number, max: number): number;
export function uint32(gen: PRNG, min: number, max: number): number;
export function int31(gen: PRNG, min: number, max: number): number;
export function real53(gen: PRNG): number;
export function char(gen: PRNG): string;
export function letter(gen: PRNG): string;
export function word(gen: PRNG, minLen?: number, maxLen?: number): string;
export function utf16Rune(gen: PRNG): string;
export function utf16String(gen: PRNG, maxlen?: number): string;
export function oneOf<T>(gen: PRNG, array: Array<T>): T;
export function uint8Array(gen: PRNG, len: number): Uint8Array<ArrayBuffer>;
export function uint16Array(gen: PRNG, len: number): Uint16Array;
export function uint32Array(gen: PRNG, len: number): Uint32Array;
/**
 * Description of the function
 */
export type generatorNext = () => number;
/**
 * A random type generator.
 */
export type PRNG = {
    /**
     * Generate new number
     */
    next: generatorNext;
};
import { Xoroshiro128plus } from './prng/Xoroshiro128plus.js';
//# sourceMappingURL=prng.d.ts.map