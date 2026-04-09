import type { Faker } from '../..';
export declare type EmojiType = 'smiley' | 'body' | 'person' | 'nature' | 'food' | 'travel' | 'activity' | 'object' | 'symbol' | 'flag';
export declare type HTTPStatusCodeType = 'informational' | 'success' | 'clientError' | 'serverError' | 'redirection';
/**
 * Module to generate internet related entries.
 */
export declare class InternetModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Returns a random avatar url.
     *
     * @example
     * faker.internet.avatar()
     * // 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/315.jpg'
     *
     * @since 2.0.1
     */
    avatar(): string;
    /**
     * Generates an email address using the given person's name as base.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param provider The mail provider domain to use. If not specified, a random free mail provider will be chosen.
     * @param options The options to use. Defaults to `{ allowSpecialCharacters: false }`.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.email() // 'Kassandra4@hotmail.com'
     * faker.internet.email('Jeanne', 'Doe') // 'Jeanne63@yahoo.com'
     * faker.internet.email('Jeanne', 'Doe', 'example.fakerjs.dev') // 'Jeanne_Doe88@example.fakerjs.dev'
     * faker.internet.email('Jeanne', 'Doe', 'example.fakerjs.dev', { allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.fakerjs.dev'
     *
     * @since 2.0.1
     */
    email(firstName?: string, lastName?: string, provider?: string, options?: {
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates an email address using an example mail provider using the given person's name as base.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param options The options to use. Defaults to `{ allowSpecialCharacters: false }`.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.exampleEmail() // 'Helmer.Graham23@example.com'
     * faker.internet.exampleEmail('Jeanne', 'Doe') // 'Jeanne96@example.net'
     * faker.internet.exampleEmail('Jeanne', 'Doe', { allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.com'
     *
     * @since 3.1.0
     */
    exampleEmail(firstName?: string, lastName?: string, options?: {
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates a username using the given person's name as base.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @example
     * faker.internet.userName() // 'Nettie_Zboncak40'
     * faker.internet.userName('Jeanne', 'Doe') // 'Jeanne98'
     *
     * @since 2.0.1
     */
    userName(firstName?: string, lastName?: string): string;
    /**
     * Returns a random web protocol. Either `http` or `https`.
     *
     * @example
     * faker.internet.protocol() // 'http'
     * faker.internet.protocol() // 'https'
     *
     * @since 2.1.5
     */
    protocol(): 'http' | 'https';
    /**
     * Returns a random http method.
     *
     * Can be either of the following:
     *
     * - `GET`
     * - `POST`
     * - `PUT`
     * - `DELETE`
     * - `PATCH`
     *
     * @example
     * faker.internet.httpMethod() // 'PATCH'
     *
     * @since 5.4.0
     */
    httpMethod(): 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /**
     * Generates a random HTTP status code.
     *
     * @param options Options object.
     * @param options.types A list of the HTTP status code types that should be used.
     *
     * @example
     * faker.internet.httpStatusCode() // 200
     * faker.internet.httpStatusCode({ types: ['success', 'serverError'] }) // 500
     *
     * @since 7.0.0
     */
    httpStatusCode(options?: {
        types?: ReadonlyArray<HTTPStatusCodeType>;
    }): number;
    /**
     * Generates a random url.
     *
     * @example
     * faker.internet.url() // 'https://remarkable-hackwork.info'
     *
     * @since 2.1.5
     */
    url(): string;
    /**
     * Generates a random domain name.
     *
     * @example
     * faker.internet.domainName() // 'slow-timer.info'
     *
     * @since 2.0.1
     */
    domainName(): string;
    /**
     * Returns a random domain suffix.
     *
     * @example
     * faker.internet.domainSuffix() // 'com'
     * faker.internet.domainSuffix() // 'name'
     *
     * @since 2.0.1
     */
    domainSuffix(): string;
    /**
     * Generates a random domain word.
     *
     * @example
     * faker.internet.domainWord() // 'close-reality'
     * faker.internet.domainWord() // 'weird-cytoplasm'
     *
     * @since 2.0.1
     */
    domainWord(): string;
    /**
     * Generates a random IPv4 address.
     *
     * @example
     * faker.internet.ip() // '245.108.222.0'
     *
     * @since 2.0.1
     */
    ip(): string;
    /**
     * Generates a random IPv4 address.
     *
     * @example
     * faker.internet.ipv4() // '245.108.222.0'
     *
     * @since 6.1.1
     */
    ipv4(): string;
    /**
     * Generates a random IPv6 address.
     *
     * @example
     * faker.internet.ipv6() // '269f:1230:73e3:318d:842b:daab:326d:897b'
     *
     * @since 4.0.0
     */
    ipv6(): string;
    /**
     * Generates a random port number.
     *
     * @example
     * faker.internet.port() // '9414'
     *
     * @since 5.4.0
     */
    port(): number;
    /**
     * Generates a random user agent string.
     *
     * @example
     * faker.internet.userAgent()
     * // 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_8_8)  AppleWebKit/536.0.2 (KHTML, like Gecko) Chrome/27.0.849.0 Safari/536.0.2'
     *
     * @since 2.0.1
     */
    userAgent(): string;
    /**
     * Generates a random css hex color code in aesthetically pleasing color palette.
     *
     * Based on
     * http://stackoverflow.com/questions/43044/algorithm-to-randomly-generate-an-aesthetically-pleasing-color-palette
     *
     * @param redBase The optional base red in range between `0` and `255`. Defaults to `0`.
     * @param greenBase The optional base green in range between `0` and `255`. Defaults to `0`.
     * @param blueBase The optional base blue in range between `0` and `255`. Defaults to `0`.
     *
     * @example
     * faker.internet.color() // '#30686e'
     * faker.internet.color(100, 100, 100) // '#4e5f8b'
     *
     * @since 2.0.1
     */
    color(redBase?: number, greenBase?: number, blueBase?: number): string;
    /**
     * Generates a random mac address.
     *
     * @param sep The optional separator to use. Can be either `':'`, `'-'` or `''`. Defaults to `':'`.
     *
     * @example
     * faker.internet.mac() // '32:8e:2e:09:c6:05'
     *
     * @since 3.0.0
     */
    mac(sep?: string): string;
    /**
     * Generates a random password.
     *
     * @param len The length of the password to generate. Defaults to `15`.
     * @param memorable Whether the generated password should be memorable. Defaults to `false`.
     * @param pattern The pattern that all chars should match should match.
     * This option will be ignored, if `memorable` is `true`. Defaults to `/\w/`.
     * @param prefix The prefix to use. Defaults to `''`.
     *
     * @example
     * faker.internet.password() // '89G1wJuBLbGziIs'
     * faker.internet.password(20) // 'aF55c_8O9kZaPOrysFB_'
     * faker.internet.password(20, true) // 'lawetimufozujosodedi'
     * faker.internet.password(20, true, /[A-Z]/) // 'HMAQDFFYLDDUTBKVNFVS'
     * faker.internet.password(20, true, /[A-Z]/, 'Hello ') // 'Hello IREOXTDWPERQSB'
     *
     * @since 2.0.1
     */
    password(len?: number, memorable?: boolean, pattern?: RegExp, prefix?: string): string;
    /**
     * Generates a random emoji.
     *
     * @param options Options object.
     * @param options.types A list of the emoji types that should be used.
     *
     * @example
     * faker.internet.emoji() // '🥰'
     * faker.internet.emoji({ types: ['food', 'nature'] }) // '🥐'
     *
     * @since 6.2.0
     */
    emoji(options?: {
        types?: ReadonlyArray<EmojiType>;
    }): string;
}
