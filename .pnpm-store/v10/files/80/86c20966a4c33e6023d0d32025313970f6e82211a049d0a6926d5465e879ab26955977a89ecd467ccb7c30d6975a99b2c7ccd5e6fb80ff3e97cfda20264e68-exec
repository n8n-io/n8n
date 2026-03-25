// Type definitions for glob 8.0
// Project: https://github.com/isaacs/node-glob
// Definitions by: vvakame <https://github.com/vvakame>
//                 voy <https://github.com/voy>
//                 Klaus Meinhardt <https://github.com/ajafff>
//                 Piotr Błażejewicz <https://github.com/peterblazejewicz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

import events = require("events");
import minimatch = require("minimatch");
import fs = require("fs");

declare function G(pattern: string, cb: (err: Error | null, matches: string[]) => void): G.IGlob;
declare function G(pattern: string, options: G.IOptions, cb: (err: Error | null, matches: string[]) => void): G.IGlob;

declare namespace G {
    function __promisify__(pattern: string, options?: IOptions): Promise<string[]>;

    function sync(pattern: string, options?: IOptions): string[];

    function hasMagic(pattern: string, options?: IOptions): boolean;

    let glob: typeof G;
    let Glob: IGlobStatic;
    let GlobSync: IGlobSyncStatic;

    interface IOptions extends minimatch.IOptions {
        cwd?: string | undefined;
        root?: string | undefined;
        dot?: boolean | undefined;
        nomount?: boolean | undefined;
        mark?: boolean | undefined;
        nosort?: boolean | undefined;
        stat?: boolean | undefined;
        silent?: boolean | undefined;
        strict?: boolean | undefined;
        cache?: { [path: string]: boolean | 'DIR' | 'FILE' | ReadonlyArray<string> } | undefined;
        statCache?: { [path: string]: false | { isDirectory(): boolean} | undefined } | undefined;
        symlinks?: { [path: string]: boolean | undefined } | undefined;
        realpathCache?: { [path: string]: string } | undefined;
        sync?: boolean | undefined;
        nounique?: boolean | undefined;
        nonull?: boolean | undefined;
        debug?: boolean | undefined;
        nobrace?: boolean | undefined;
        noglobstar?: boolean | undefined;
        noext?: boolean | undefined;
        nocase?: boolean | undefined;
        matchBase?: any;
        nodir?: boolean | undefined;
        ignore?: string | ReadonlyArray<string> | undefined;
        follow?: boolean | undefined;
        realpath?: boolean | undefined;
        nonegate?: boolean | undefined;
        nocomment?: boolean | undefined;
        absolute?: boolean | undefined;
        fs?: typeof fs;
    }

    interface IGlobStatic extends events.EventEmitter {
        new (pattern: string, cb?: (err: Error | null, matches: string[]) => void): IGlob;
        new (pattern: string, options: IOptions, cb?: (err: Error | null, matches: string[]) => void): IGlob;
        prototype: IGlob;
    }

    interface IGlobSyncStatic {
        new (pattern: string, options?: IOptions): IGlobBase;
        prototype: IGlobBase;
    }

    interface IGlobBase {
        minimatch: minimatch.IMinimatch;
        options: IOptions;
        aborted: boolean;
        cache: { [path: string]: boolean | 'DIR' | 'FILE' | ReadonlyArray<string> };
        statCache: { [path: string]: false | { isDirectory(): boolean; } | undefined };
        symlinks: { [path: string]: boolean | undefined };
        realpathCache: { [path: string]: string };
        found: string[];
    }

    interface IGlob extends IGlobBase, events.EventEmitter {
        pause(): void;
        resume(): void;
        abort(): void;
    }
}

export = G;
