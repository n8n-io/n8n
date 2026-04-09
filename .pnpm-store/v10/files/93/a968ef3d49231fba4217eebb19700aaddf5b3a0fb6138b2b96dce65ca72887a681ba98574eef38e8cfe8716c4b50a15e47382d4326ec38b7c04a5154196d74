import type { Faker } from '../..';
/**
 * Module to generate git related entries.
 */
export declare class GitModule {
    private readonly faker;
    constructor(faker: Faker);
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
     * Generates a random commit entry.
     *
     * @param options Options for the commit entry.
     * @param options.merge Set to `true` to generate a merge message line.
     * @param options.eol Choose the end of line character to use. Defaults to 'CRLF'.
     * 'LF' = '\n',
     * 'CRLF' = '\r\n'
     *
     * @example
     * faker.git.commitEntry()
     * // commit fe8c38a965d13d9794eb36918cb24cebe49a45c2
     * // Author: Mable Harvey <Cynthia_Quigley@yahoo.com>
     * // Date: Sat Feb 05 2022 15:09:18 GMT+0100 (Mitteleuropäische Normalzeit)
     * //
     * //     copy primary system
     *
     * @since 5.0.0
     */
    commitEntry(options?: {
        merge?: boolean;
        eol?: 'LF' | 'CRLF';
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
     * Generates a random commit sha (full).
     *
     * @example
     * faker.git.commitSha() // '2c6e3880fd94ddb7ef72d34e683cdc0c47bec6e6'
     *
     * @since 5.0.0
     */
    commitSha(): string;
    /**
     * Generates a random commit sha (short).
     *
     * @example
     * faker.git.shortSha() // '6155732'
     *
     * @since 5.0.0
     */
    shortSha(): string;
}
