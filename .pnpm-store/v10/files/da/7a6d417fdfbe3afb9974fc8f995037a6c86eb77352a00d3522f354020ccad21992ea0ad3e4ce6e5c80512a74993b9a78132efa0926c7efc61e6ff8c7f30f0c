import { SimpleGit } from '../../../typings';
export interface GitGrepQuery extends Iterable<string> {
    /** Adds one or more terms to be grouped as an "and" to any other terms */
    and(...and: string[]): this;
    /** Adds one or more search terms - git.grep will "or" this to other terms */
    param(...param: string[]): this;
}
/**
 * Creates a new builder for a `git.grep` query with optional params
 */
export declare function grepQueryBuilder(...params: string[]): GitGrepQuery;
export default function (): Pick<SimpleGit, 'grep'>;
