export { production } from "./environment.js";
export const extensive: boolean;
export const envSeed: number | null;
export class TestCase {
    /**
     * @param {string} moduleName
     * @param {string} testName
     */
    constructor(moduleName: string, testName: string);
    /**
     * @type {string}
     */
    moduleName: string;
    /**
     * @type {string}
     */
    testName: string;
    /**
     * This type can store custom information related to the TestCase
     *
     * @type {Map<string,any>}
     */
    meta: Map<string, any>;
    _seed: number | null;
    _prng: prng.PRNG | null;
    resetSeed(): void;
    /**
     * @type {number}
     */
    get seed(): number;
    /**
     * A PRNG for this test case. Use only this PRNG for randomness to make the test case reproducible.
     *
     * @type {prng.PRNG}
     */
    get prng(): prng.PRNG;
}
export const repetitionTime: number;
export function run(moduleName: string, name: string, f: (arg0: TestCase) => void | Promise<any>, i: number, numberOfTests: number): Promise<boolean>;
export function describe(description: string, info?: string): void;
export function info(info: string): void;
export const printDom: (_createNode: () => Node) => void;
export const printCanvas: (canvas: HTMLCanvasElement, height: number) => void;
export function group(description: string, f: (...args: any[]) => void): void;
export function groupAsync(description: string, f: (...args: any[]) => Promise<any>): Promise<void>;
export function measureTime(message: string, f: (...args: any[]) => void): number;
export function measureTimeAsync(message: string, f: (...args: any[]) => Promise<any>): Promise<number>;
export function compareArrays<T>(as: Array<T>, bs: Array<T>, m?: string): boolean;
export function compareStrings(a: string, b: string, m?: string): void;
export function compareObjects<K, V>(a: any, b: any, m?: string): void;
export function compare<T>(a: T, b: T, message?: string | null, customCompare?: (arg0: any, arg1: T, arg2: T, arg3: string, arg4: any) => boolean): boolean;
export function assert<T>(property: T, message?: string | null): asserts property is NonNullable<T>;
export function promiseRejected(f: (...args: any[]) => Promise<any>): Promise<void>;
export function fails(f: (...args: any[]) => void): void;
export function failsAsync(f: (...args: any[]) => Promise<any>): Promise<void>;
export function runTests(tests: {
    [x: string]: {
        [x: string]: (arg0: TestCase) => void | Promise<any>;
    };
}): Promise<boolean>;
export function fail(reason: string): never;
export function skip(cond?: boolean): void;
import * as prng from './prng.js';
//# sourceMappingURL=testing.d.ts.map