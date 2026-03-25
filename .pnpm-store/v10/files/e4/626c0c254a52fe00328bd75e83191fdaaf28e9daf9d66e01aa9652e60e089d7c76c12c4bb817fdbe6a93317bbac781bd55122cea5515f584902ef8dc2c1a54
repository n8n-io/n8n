/// <reference types="node" />
import * as fsWalk from '@nodelib/fs.walk';
export declare type ErrnoException = NodeJS.ErrnoException;
export declare type Entry = fsWalk.Entry;
export declare type EntryItem = string | Entry;
export declare type Pattern = string;
export declare type PatternRe = RegExp;
export declare type PatternsGroup = Record<string, Pattern[]>;
export declare type ReaderOptions = fsWalk.Options & {
    transform(entry: Entry): EntryItem;
    deepFilter: DeepFilterFunction;
    entryFilter: EntryFilterFunction;
    errorFilter: ErrorFilterFunction;
    fs: FileSystemAdapter;
    stats: boolean;
};
export declare type ErrorFilterFunction = fsWalk.ErrorFilterFunction;
export declare type EntryFilterFunction = fsWalk.EntryFilterFunction;
export declare type DeepFilterFunction = fsWalk.DeepFilterFunction;
export declare type EntryTransformerFunction = (entry: Entry) => EntryItem;
export declare type MicromatchOptions = {
    dot?: boolean;
    matchBase?: boolean;
    nobrace?: boolean;
    nocase?: boolean;
    noext?: boolean;
    noglobstar?: boolean;
    posix?: boolean;
    strictSlashes?: boolean;
};
export declare type FileSystemAdapter = fsWalk.FileSystemAdapter;
