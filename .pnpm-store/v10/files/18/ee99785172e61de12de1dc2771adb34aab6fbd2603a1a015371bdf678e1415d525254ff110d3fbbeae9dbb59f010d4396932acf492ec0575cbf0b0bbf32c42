import { Plugin, TSConfig } from '../interfaces';
export declare const TS_CONFIGS: Record<string, TSConfig | undefined>;
/**
 * Convert a path from the compiled ./lib files to the ./src typescript source
 * this is for developing typescript plugins/CLIs
 * if there is a tsconfig and the original sources exist, it attempts to require ts-node
 */
export declare function tsPath(root: string, orig: string, plugin: Plugin): Promise<string>;
export declare function tsPath(root: string, orig: string | undefined, plugin?: Plugin | undefined): Promise<string | undefined>;
