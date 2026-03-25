import { ModuleBase } from '../../internal/module-base';
/**
 * Module to generate git related entries.
 *
 * ### Overview
 *
 * [`commitEntry()`](https://fakerjs.dev/api/git.html#commitentry) generates a random commit entry as printed by `git log`. This includes a commit hash [`commitSha()`](https://fakerjs.dev/api/git.html#commitsha), author, date [`commitDate()`](https://fakerjs.dev/api/git.html#commitdate), and commit message [`commitMessage()`](https://fakerjs.dev/api/git.html#commitmessage). You can also generate a random branch name with [`branch()`](https://fakerjs.dev/api/git.html#branch).
 */
export declare class GitModule extends ModuleBase {
    /**
     * Generates a random branch name.
     *
     * @example
     * faker.git.branch() // 'feed-parse'
     *
     * @since 5.0.0
     */
    branch(): string;
    /**
     * Generates a random commit entry as printed by `git log`.
     *
     * @param options Options for the commit entry.
     * @param options.merge Set to `true` to generate a merge message line.
     * @param options.eol Choose the end of line character to use. Defaults to 'CRLF'.
     * 'LF' = '\n',
     * 'CRLF' = '\r\n'
     * @param options.refDate The date to use as reference point for the commit. Defaults to `new Date()`.
     *
     * @example
     * faker.git.commitEntry()
     * // commit fe8c38a965d13d9794eb36918cb24cebe49a45c2
     * // Author: Marion Becker <Marion_Becker49@gmail.com>
     * // Date: Mon Nov 7 05:38:37 2022 -0600
     * //
     * //     generate open-source system
     *
     * @since 5.0.0
     */
    commitEntry(options?: {
        /**
         * Set to `true` to generate a merge message line.
         *
         * @default faker.datatype.boolean({ probability: 0.2 })
         */
        merge?: boolean;
        /**
         * Choose the end of line character to use.
         *
         * - 'LF' = '\n',
         * - 'CRLF' = '\r\n'
         *
         * @default 'CRLF'
         */
        eol?: 'LF' | 'CRLF';
        /**
         * The date to use as reference point for the commit.
         *
         * @default new Date()
         */
        refDate?: string | Date | number;
    }): string;
    /**
     * Generates a random commit message.
     *
     * @example
     * faker.git.commitMessage() // 'reboot cross-platform driver'
     *
     * @since 5.0.0
     */
    commitMessage(): string;
    /**
     * Generates a date string for a git commit using the same format as `git log`.
     *
     * @param options The optional options object.
     * @param options.refDate The date to use as reference point for the commit. Defaults to `faker.defaultRefDate()`.
     *
     * @example
     * faker.git.commitDate() // 'Mon Nov 7 14:40:58 2022 +0600'
     * faker.git.commitDate({ refDate: '2020-01-01' }) // 'Tue Dec 31 05:40:59 2019 -0400'
     *
     * @since 8.0.0
     */
    commitDate(options?: {
        /**
         * The date to use as reference point for the commit.
         *
         * @default faker.defaultRefDate()
         */
        refDate?: string | Date | number;
    }): string;
    /**
     * Generates a random commit sha.
     *
     * By default, the length of the commit sha is 40 characters.
     *
     * For a shorter commit sha, use the `length` option.
     *
     * Usual short commit sha length is:
     * - 7 for GitHub
     * - 8 for GitLab
     *
     * @param options Options for the commit sha.
     * @param options.length The length of the commit sha. Defaults to 40.
     *
     * @example
     * faker.git.commitSha() // '2c6e3880fd94ddb7ef72d34e683cdc0c47bec6e6'
     *
     * @since 5.0.0
     */
    commitSha(options?: {
        /**
         * The length of the commit sha.
         *
         * @default 40
         */
        length?: number;
    }): string;
    /**
     * Generates a random commit sha (short).
     *
     * @example
     * faker.git.shortSha() // '6155732'
     *
     * @since 5.0.0
     *
     * @deprecated Use `faker.git.commitSha({ length: 7 })` instead.
     */
    shortSha(): string;
}
