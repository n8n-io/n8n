import { type Buffer } from 'node:buffer';
import { type TSpawnStore } from './vendor-core.js';
export { isStringLiteral } from './vendor-core.js';
export declare function noop(): void;
export declare function identity<T>(v: T): T;
export declare function randomId(): string;
export declare function isString(obj: any): obj is string;
export declare const bufToString: (buf: Buffer | string) => string;
export declare const bufArrJoin: (arr: TSpawnStore[keyof TSpawnStore]) => string;
export declare const getLast: <T>(arr: {
    length: number;
    [i: number]: any;
}) => T;
export declare function preferLocalBin(env: NodeJS.ProcessEnv, ...dirs: (string | undefined)[]): {
    [x: string]: string | undefined;
    TZ?: string | undefined;
};
export declare function quote(arg: string): string;
export declare function quotePowerShell(arg: string): string;
export type Duration = number | `${number}` | `${number}m` | `${number}s` | `${number}ms`;
export declare function parseDuration(d: Duration): number;
export declare const once: <T extends (...args: any[]) => any>(fn: T) => (...args: Parameters<T>) => ReturnType<T>;
export declare const proxyOverride: <T extends object>(origin: T, ...fallbacks: any) => T;
export declare const toCamelCase: (str: string) => string;
export declare const parseBool: (v: string) => boolean | string;
export declare const getLines: (chunk: Buffer | string, next: (string | undefined)[], delimiter: string | RegExp) => string[];
export declare const iteratorToArray: <T>(it: Iterator<T>) => T[];
