import type { HookCollection } from "before-after-hook";
import { request } from "@octokit/request";
import { graphql } from "@octokit/graphql";
import type { Constructor, Hooks, OctokitOptions, OctokitPlugin, ReturnTypeOf, UnionToIntersection } from "./types.js";
export type { OctokitOptions } from "./types.js";
export declare class Octokit {
    static VERSION: string;
    static defaults<S extends Constructor<any>>(this: S, defaults: OctokitOptions | Function): S;
    static plugins: OctokitPlugin[];
    /**
     * Attach a plugin (or many) to your Octokit instance.
     *
     * @example
     * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
     */
    static plugin<S extends Constructor<any> & {
        plugins: any[];
    }, T extends OctokitPlugin[]>(this: S, ...newPlugins: T): S & Constructor<UnionToIntersection<ReturnTypeOf<T>>>;
    constructor(options?: OctokitOptions);
    request: typeof request;
    graphql: typeof graphql;
    log: {
        debug: (message: string, additionalInfo?: object) => any;
        info: (message: string, additionalInfo?: object) => any;
        warn: (message: string, additionalInfo?: object) => any;
        error: (message: string, additionalInfo?: object) => any;
        [key: string]: any;
    };
    hook: HookCollection<Hooks>;
    auth: (...args: unknown[]) => Promise<unknown>;
}
