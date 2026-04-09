export interface DiffOptions {
    verbose?: boolean;
    raw?: boolean;
    keysOnly?: boolean;
    full?: boolean;
    sort?: boolean;
    outputKeys?: string[];
    excludeKeys?: string[];
    keepUnchangedValues?: boolean;
    outputNewOnly?: boolean;
    maxElisions?: number;
    precision?: number;
}

export interface DiffStringOptions extends DiffOptions {
    color?: boolean;
}

export function diff(obj1: unknown, obj2: unknown, options?: DiffOptions): any;
export function diffString(obj1: unknown, obj2: unknown, options?: DiffStringOptions): string;

export { colorize, colorizeToCallback } from "./lib/colorize";
