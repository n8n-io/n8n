import type * as swcWasm from '@swc/wasm';
import type { CreateTranspilerOptions, Transpiler } from './types';
export interface SwcTranspilerOptions extends CreateTranspilerOptions {
    /**
     * swc compiler to use for compilation
     * Set to '@swc/wasm' to use swc's WASM compiler
     * Default: '@swc/core', falling back to '@swc/wasm'
     */
    swc?: string | typeof swcWasm;
}
export declare function create(createOptions: SwcTranspilerOptions): Transpiler;
