import * as Context from './context';
import { Octokit } from '@octokit/core';
import { OctokitOptions } from '@octokit/core/dist-types/types';
export declare const context: Context.Context;
export declare const defaults: OctokitOptions;
export declare const GitHub: typeof Octokit & import("@octokit/core/dist-types/types").Constructor<import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
}>;
/**
 * Convience function to correctly format Octokit Options to pass into the constructor.
 *
 * @param     token    the repo PAT or GITHUB_TOKEN
 * @param     options  other options to set
 */
export declare function getOctokitOptions(token: string, options?: OctokitOptions): OctokitOptions;
