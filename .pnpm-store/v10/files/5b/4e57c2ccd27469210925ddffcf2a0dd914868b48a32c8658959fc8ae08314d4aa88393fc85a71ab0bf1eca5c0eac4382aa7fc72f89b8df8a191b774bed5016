import { Layout, Options } from './types.js';
/// <reference lib="dom" />
export type * from './types.js';
/**
 * Execute the Graphviz dot command and make a Stream of the results.
 */
export declare function toStream<T extends Layout>(dot: string, options?: Options<T>): Promise<ReadableStream<Uint8Array>>;
/**
 * Execute the Graphviz dot command and output the results to a file.
 */
export declare function toFile<T extends Layout>(dot: string, path: string, options?: Options<T>): Promise<void>;
