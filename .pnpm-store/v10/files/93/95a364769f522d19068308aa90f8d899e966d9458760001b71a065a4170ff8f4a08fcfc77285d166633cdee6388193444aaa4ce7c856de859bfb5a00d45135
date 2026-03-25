/// <reference types="node" />
/// <reference types="node" />
import { MakeDirectoryOptions, Stats } from 'fs';
export interface FsProvider {
    stat?: (path: string, callback: (err: NodeJS.ErrnoException | null, stats: Stats) => any) => any;
    mkdir?: (path: string, opts: MakeDirectoryOptions & {
        recursive?: boolean;
    }, callback: (err: NodeJS.ErrnoException | null, made?: string) => any) => any;
    statSync?: (path: string) => Stats;
    mkdirSync?: (path: string, opts: MakeDirectoryOptions & {
        recursive?: boolean;
    }) => string | undefined;
}
interface Options extends FsProvider {
    mode?: number | string;
    fs?: FsProvider;
    mkdirAsync?: (path: string, opts: MakeDirectoryOptions & {
        recursive?: boolean;
    }) => Promise<string | undefined>;
    statAsync?: (path: string) => Promise<Stats>;
}
export type MkdirpOptions = Options | number | string;
export interface MkdirpOptionsResolved {
    mode: number;
    fs: FsProvider;
    mkdirAsync: (path: string, opts: MakeDirectoryOptions & {
        recursive?: boolean;
    }) => Promise<string | undefined>;
    statAsync: (path: string) => Promise<Stats>;
    stat: (path: string, callback: (err: NodeJS.ErrnoException | null, stats: Stats) => any) => any;
    mkdir: (path: string, opts: MakeDirectoryOptions & {
        recursive?: boolean;
    }, callback: (err: NodeJS.ErrnoException | null, made?: string) => any) => any;
    statSync: (path: string) => Stats;
    mkdirSync: (path: string, opts: MakeDirectoryOptions & {
        recursive?: boolean;
    }) => string | undefined;
    recursive?: boolean;
}
export declare const optsArg: (opts?: MkdirpOptions) => MkdirpOptionsResolved;
export {};
