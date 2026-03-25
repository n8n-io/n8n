import * as Context from './context';
import { GitHub } from './utils';
import { OctokitOptions, OctokitPlugin } from '@octokit/core/dist-types/types';
export declare const context: Context.Context;
/**
 * Returns a hydrated octokit ready to use for GitHub Actions
 *
 * @param     token    the repo PAT or GITHUB_TOKEN
 * @param     options  other options to set
 */
export declare function getOctokit(token: string, options?: OctokitOptions, ...additionalPlugins: OctokitPlugin[]): InstanceType<typeof GitHub>;
