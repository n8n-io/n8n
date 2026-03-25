import type { Hono } from '../../hono';
import type { Env, Schema } from '../../types';
export declare const DEFAULT_OUTPUT_DIR = "./static";
/**
 * @experimental
 * `FileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export interface FileSystemModule {
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    mkdir(path: string, options: {
        recursive: boolean;
    }): Promise<void | string>;
}
/**
 * @experimental
 * `ToSSGResult` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGResult {
    success: boolean;
    files: string[];
    error?: Error;
}
export declare const defaultExtensionMap: Record<string, string>;
export type BeforeRequestHook = (req: Request) => Request | false | Promise<Request | false>;
export type AfterResponseHook = (res: Response) => Response | false | Promise<Response | false>;
export type AfterGenerateHook = (result: ToSSGResult, fsModule: FileSystemModule, options?: ToSSGOptions) => void | Promise<void>;
export declare const combineBeforeRequestHooks: (hooks: BeforeRequestHook | BeforeRequestHook[]) => BeforeRequestHook;
export declare const combineAfterResponseHooks: (hooks: AfterResponseHook | AfterResponseHook[]) => AfterResponseHook;
export declare const combineAfterGenerateHooks: (hooks: AfterGenerateHook | AfterGenerateHook[], fsModule: FileSystemModule, options?: ToSSGOptions) => AfterGenerateHook;
export interface SSGPlugin {
    beforeRequestHook?: BeforeRequestHook | BeforeRequestHook[];
    afterResponseHook?: AfterResponseHook | AfterResponseHook[];
    afterGenerateHook?: AfterGenerateHook | AfterGenerateHook[];
}
export interface ToSSGOptions {
    dir?: string;
    /**
     * @deprecated Use plugins[].beforeRequestHook instead.
     */
    beforeRequestHook?: BeforeRequestHook | BeforeRequestHook[];
    /**
     * @deprecated Use plugins[].afterResponseHook instead.
     */
    afterResponseHook?: AfterResponseHook | AfterResponseHook[];
    /**
     * @deprecated Use plugins[].afterGenerateHook instead.
     */
    afterGenerateHook?: AfterGenerateHook | AfterGenerateHook[];
    concurrency?: number;
    extensionMap?: Record<string, string>;
    plugins?: SSGPlugin[];
}
/**
 * @experimental
 * `fetchRoutesContent` is an experimental feature.
 * The API might be changed.
 */
export declare const fetchRoutesContent: <E extends Env = Env, S extends Schema = {}, BasePath extends string = "/">(app: Hono<E, S, BasePath>, beforeRequestHook?: BeforeRequestHook, afterResponseHook?: AfterResponseHook, concurrency?: number) => Generator<Promise<Generator<Promise<{
    routePath: string;
    mimeType: string;
    content: string | ArrayBuffer;
} | undefined>> | undefined>>;
export declare const saveContentToFile: (data: Promise<{
    routePath: string;
    content: string | ArrayBuffer;
    mimeType: string;
} | undefined>, fsModule: FileSystemModule, outDir: string, extensionMap?: Record<string, string>) => Promise<string | undefined>;
/**
 * @experimental
 * `ToSSGInterface` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGInterface {
    (app: Hono<any, any, any>, fsModule: FileSystemModule, options?: ToSSGOptions): Promise<ToSSGResult>;
}
/**
 * @experimental
 * `ToSSGAdaptorInterface` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGAdaptorInterface<E extends Env = Env, S extends Schema = {}, BasePath extends string = '/'> {
    (app: Hono<E, S, BasePath>, options?: ToSSGOptions): Promise<ToSSGResult>;
}
/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
export declare const toSSG: ToSSGInterface;
