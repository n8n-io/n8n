// Type definitions for source-map-support 0.5
// Project: https://github.com/evanw/node-source-map-support
// Definitions by: Bart van der Schoor <https://github.com/Bartvds>
//                 Jason Cheatham <https://github.com/jason0x43>
//                 Alcedo Nathaniel De Guzman Jr <https://github.com/natealcedo>
//                 Griffin Yourick <https://github.com/tough-griff>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export interface RawSourceMap {
    version: 3;
    sources: string[];
    names: string[];
    sourceRoot?: string;
    sourcesContent?: string[];
    mappings: string;
    file: string;
}

/**
 * Output of retrieveSourceMap().
 * From source-map-support:
 *   The map field may be either a string or the parsed JSON object (i.e.,
 *   it must be a valid argument to the SourceMapConsumer constructor).
 */
export interface UrlAndMap {
    url: string;
    map: string | RawSourceMap;
}

/**
 * Options to install().
 */
export interface Options {
    handleUncaughtExceptions?: boolean | undefined;
    hookRequire?: boolean | undefined;
    emptyCacheBetweenOperations?: boolean | undefined;
    environment?: 'auto' | 'browser' | 'node' | undefined;
    overrideRetrieveFile?: boolean | undefined;
    overrideRetrieveSourceMap?: boolean | undefined;
    retrieveFile?(path: string): string;
    retrieveSourceMap?(source: string): UrlAndMap | null;
    /**
     * Set false to disable redirection of require / import `source-map-support` to `@cspotcode/source-map-support`
     */
    redirectConflictingLibrary?: boolean;
    /**
     * Callback will be called every time we redirect due to `redirectConflictingLibrary`
     * This allows consumers to log helpful warnings if they choose.
     * @param parent NodeJS.Module which made the require() or require.resolve() call
     * @param options options object internally passed to node's `_resolveFilename` hook
     */
    onConflictingLibraryRedirect?: (request: string, parent: any, isMain: boolean, options: any, redirectedRequest: string) => void;
}

export interface Position {
    source: string;
    line: number;
    column: number;
}

export function wrapCallSite(frame: any /* StackFrame */): any /* StackFrame */;
export function getErrorSource(error: Error): string | null;
export function mapSourcePosition(position: Position): Position;
export function retrieveSourceMap(source: string): UrlAndMap | null;
export function resetRetrieveHandlers(): void;

/**
 * Install SourceMap support.
 * @param options Can be used to e.g. disable uncaughtException handler.
 */
export function install(options?: Options): void;

/**
 * Uninstall SourceMap support.
 */
export function uninstall(): void;
