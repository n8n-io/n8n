import { ModuleBase } from '../../internal/module-base';
export type EmojiType = 'smiley' | 'body' | 'person' | 'nature' | 'food' | 'travel' | 'activity' | 'object' | 'symbol' | 'flag';
export type HTTPStatusCodeType = 'informational' | 'success' | 'clientError' | 'serverError' | 'redirection';
export type HTTPProtocolType = 'http' | 'https';
/**
 * Module to generate internet related entries.
 *
 * ### Overview
 *
 * For user accounts, you may need an [`email()`](https://fakerjs.dev/api/internet.html#email) and a [`password()`](https://fakerjs.dev/api/internet.html#password), as well as a ASCII [`userName()`](https://fakerjs.dev/api/internet.html#username) or Unicode [`displayName()`](https://fakerjs.dev/api/internet.html#displayname), and an image [`avatar()`](https://fakerjs.dev/api/internet.html#avatar). Since the emails generated could coincidentally be real email addresses, you should not use these for sending real email addresses. If this is a concern, use [`exampleEmail()`](https://fakerjs.dev/api/internet.html#exampleemail) instead.
 *
 * For websites, you can generate a [`domainName()`](https://fakerjs.dev/api/internet.html#domainname) or a full [`url()`](https://fakerjs.dev/api/internet.html#url).
 *
 * To make your data more 🔥, you can use [`emoji()`](https://fakerjs.dev/api/internet.html#emoji).
 *
 * You also have access to a number of the more technical elements of web requests, such as [`httpMethod`](https://fakerjs.dev/api/internet.html#httpmethod), [`httpStatusCode`](https://fakerjs.dev/api/internet.html#httpstatuscode), [`ip`](https://fakerjs.dev/api/internet.html#ip), [`mac`](https://fakerjs.dev/api/internet.html#mac), [`userAgent`](https://fakerjs.dev/api/internet.html#useragent), and [`port`](https://fakerjs.dev/api/internet.html#port).
 */
export declare class InternetModule extends ModuleBase {
    /**
     * Returns a random avatar url.
     *
     * @see faker.image.avatarLegacy(): For the replacement method.
     * @see faker.image.avatar(): For the replacement method with a wider variety of avatars.
     *
     * @example
     * faker.internet.avatar()
     * // 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/315.jpg'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.image.avatar()` instead.
     */
    avatar(): string;
    /**
     * Generates an email address using the given person's name as base.
     *
     * @param options The options to use.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param options.provider The mail provider domain to use. If not specified, a random free mail provider will be chosen.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.email() // 'Kassandra4@hotmail.com'
     * faker.internet.email({ firstName: 'Jeanne'}) // 'Jeanne63@yahoo.com'
     * faker.internet.email({ firstName: 'Jeanne'}) // 'Jeanne_Smith63@yahoo.com'
     * faker.internet.email({ firstName: 'Jeanne', lastName: 'Doe' }) // 'Jeanne.Doe63@yahoo.com'
     * faker.internet.email({ firstName: 'Jeanne', lastName: 'Doe', provider: 'example.fakerjs.dev' }) // 'Jeanne_Doe88@example.fakerjs.dev'
     * faker.internet.email({ firstName: 'Jeanne', lastName: 'Doe', provider: 'example.fakerjs.dev', allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.fakerjs.dev'
     *
     * @since 2.0.1
     */
    email(options?: {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
        /**
         * The mail provider domain to use. If not specified, a random free mail provider will be chosen.
         */
        provider?: string;
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates an email address using the given person's name as base.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param provider The mail provider domain to use. If not specified, a random free mail provider will be chosen.
     * @param options The options to use.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.email() // 'Kassandra4@hotmail.com'
     * faker.internet.email('Jeanne') // 'Jeanne63@yahoo.com'
     * faker.internet.email('Jeanne') // 'Jeanne.Smith63@yahoo.com'
     * faker.internet.email('Jeanne', 'Doe') // 'Jeanne_Doe63@yahoo.com'
     * faker.internet.email('Jeanne', 'Doe', 'example.fakerjs.dev') // 'Jeanne_Doe88@example.fakerjs.dev'
     * faker.internet.email('Jeanne', 'Doe', 'example.fakerjs.dev', { allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.fakerjs.dev'
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.internet.email({ firstName, lastName, provider, ... })` instead.
     */
    email(firstName?: string, lastName?: string, provider?: string, options?: {
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates an email address using the given person's name as base.
     *
     * @param options The options to use.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param options.provider The mail provider domain to use. If not specified, a random free mail provider will be chosen.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     * @param legacyLastName The optional last name to use. If not specified, a random one will be chosen.
     * @param legacyProvider The mail provider domain to use. If not specified, a random free mail provider will be chosen.
     * @param legacyOptions The options to use.
     * @param legacyOptions.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.email() // 'Kassandra4@hotmail.com'
     * faker.internet.email({ firstName: 'Jeanne' }) // 'Jeanne63@yahoo.com'
     * faker.internet.email({ firstName: 'Jeanne' }) // 'Jeanne.Smith63@yahoo.com'
     * faker.internet.email({ firstName: 'Jeanne', lastName: 'Doe' }) // 'Jeanne_Doe63@yahoo.com'
     * faker.internet.email({ firstName: 'Jeanne', lastName: 'Doe', provider: 'example.fakerjs.dev' }) // 'Jeanne_Doe88@example.fakerjs.dev'
     * faker.internet.email({ firstName: 'Jeanne', lastName: 'Doe', provider: 'example.fakerjs.dev', allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.fakerjs.dev'
     *
     * @since 2.0.1
     */
    email(options?: string | {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
        /**
         * The mail provider domain to use. If not specified, a random free mail provider will be chosen.
         */
        provider?: string;
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }, legacyLastName?: string, legacyProvider?: string, legacyOptions?: {
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates an email address using an example mail provider using the given person's name as base.
     *
     * @param options An options object.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.exampleEmail() // 'Helmer.Graham23@example.com'
     * faker.internet.exampleEmail({ firstName: 'Jeanne' }) // 'Jeanne96@example.net'
     * faker.internet.exampleEmail({ firstName: 'Jeanne' }) // 'Jeanne.Smith96@example.net'
     * faker.internet.exampleEmail({ firstName: 'Jeanne', lastName: 'Doe' }) // 'Jeanne_Doe96@example.net'
     * faker.internet.exampleEmail({ firstName: 'Jeanne', lastName: 'Doe', allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.com'
     *
     * @since 3.1.0
     */
    exampleEmail(options?: {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates an email address using an example mail provider using the given person's name as base.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param options The options to use.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.exampleEmail() // 'Helmer.Graham23@example.com'
     * faker.internet.exampleEmail('Jeanne') // 'Jeanne96@example.net'
     * faker.internet.exampleEmail('Jeanne') // 'Jeanne.Smith96@example.net'
     * faker.internet.exampleEmail('Jeanne', 'Doe') // 'Jeanne_Doe96@example.net'
     * faker.internet.exampleEmail('Jeanne', 'Doe', { allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.com'
     *
     * @since 3.1.0
     *
     * @deprecated Use `faker.internet.exampleEmail({ firstName, lastName, ... })` instead.
     */
    exampleEmail(firstName?: string, lastName?: string, options?: {
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates an email address using an example mail provider using the given person's name as base.
     *
     * @param options An options object.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param options.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     * @param legacyLastName The optional last name to use. If not specified, a random one will be chosen.
     * @param legacyOptions The options to use.
     * @param legacyOptions.allowSpecialCharacters Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included
     * in the email address. Defaults to `false`.
     *
     * @example
     * faker.internet.exampleEmail() // 'Helmer.Graham23@example.com'
     * faker.internet.exampleEmail({ firstName: 'Jeanne' }) // 'Jeanne96@example.net'
     * faker.internet.exampleEmail({ firstName: 'Jeanne' }) // 'Jeanne.Smith96@example.net'
     * faker.internet.exampleEmail({ firstName: 'Jeanne', lastName: 'Doe' }) // 'Jeanne_Doe96@example.net'
     * faker.internet.exampleEmail({ firstName: 'Jeanne', lastName: 'Doe', allowSpecialCharacters: true }) // 'Jeanne%Doe88@example.com'
     *
     * @since 3.1.0
     */
    exampleEmail(options?: string | {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }, legacyLastName?: string, legacyOptions?: {
        /**
         * Whether special characters such as ``.!#$%&'*+-/=?^_`{|}~`` should be included in the email address.
         *
         * @default false
         */
        allowSpecialCharacters?: boolean;
    }): string;
    /**
     * Generates a username using the given person's name as base.
     * The resulting username may use neither, one or both of the names provided.
     * This will always return a plain ASCII string.
     * Some basic stripping of accents and transliteration of characters will be done.
     *
     * @param options An options object.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @see faker.internet.displayName(): For generating an Unicode display name.
     *
     * @example
     * faker.internet.userName() // 'Nettie_Zboncak40'
     * faker.internet.userName({ firstName: 'Jeanne' }) // 'Jeanne98'
     * faker.internet.userName({ firstName: 'Jeanne' }) // 'Jeanne.Smith98'
     * faker.internet.userName({ firstName: 'Jeanne', lastName: 'Doe'}) // 'Jeanne_Doe98'
     * faker.internet.userName({ firstName: 'John', lastName: 'Doe' }) // 'John.Doe'
     * faker.internet.userName({ firstName: 'Hélene', lastName: 'Müller' }) // 'Helene_Muller11'
     * faker.internet.userName({ firstName: 'Фёдор', lastName: 'Достоевский' }) // 'Fedor.Dostoevskii50'
     * faker.internet.userName({ firstName: '大羽', lastName: '陳' }) // 'hlzp8d.tpv45' - note neither name is used
     *
     * @since 2.0.1
     */
    userName(options?: {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
    }): string;
    /**
     * Generates a username using the given person's name as base.
     * The resulting username may use neither, one or both of the names provided.
     * This will always return a plain ASCII string.
     * Some basic stripping of accents and transliteration of characters will be done.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @see faker.internet.displayName(): For generating an Unicode display name.
     *
     * @example
     * faker.internet.userName() // 'Nettie_Zboncak40'
     * faker.internet.userName('Jeanne') // 'Jeanne98'
     * faker.internet.userName('Jeanne') // 'Jeanne.Smith98'
     * faker.internet.userName('Jeanne', 'Doe') // 'Jeanne_Doe98'
     * faker.internet.userName('John', 'Doe') // 'John.Doe'
     * faker.internet.userName('Hélene', 'Müller') // 'Helene_Muller11'
     * faker.internet.userName('Фёдор', 'Достоевский') // 'Fedor.Dostoevskii50'
     * faker.internet.userName('大羽', '陳') // 'hlzp8d.tpv45' - note neither name is used
     *
     * @since 2.0.1
     *
     * @deprecated Use `faker.internet.userName({ firstName, lastName })` instead.
     */
    userName(firstName?: string, lastName?: string): string;
    /**
     * Generates a username using the given person's name as base.
     * The resulting username may use neither, one or both of the names provided.
     * This will always return a plain ASCII string.
     * Some basic stripping of accents and transliteration of characters will be done.
     *
     * @param options An options object.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param legacyLastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @see faker.internet.displayName(): For generating an Unicode display name.
     *
     * @example
     * faker.internet.userName() // 'Nettie_Zboncak40'
     * faker.internet.userName({ firstName: 'Jeanne'}) // 'Jeanne98'
     * faker.internet.userName({ firstName: 'Jeanne'}) // 'Jeanne.Smith98'
     * faker.internet.userName({ firstName: 'Jeanne', lastName: 'Doe'}) // 'Jeanne_Doe98'
     * faker.internet.userName({ firstName: 'John', lastName: 'Doe' }) // 'John.Doe'
     * faker.internet.userName({ firstName: 'Hélene', lastName: 'Müller' }) // 'Helene_Muller11'
     * faker.internet.userName({ firstName: 'Фёдор', lastName: 'Достоевский' }) // 'Fedor.Dostoevskii50'
     * faker.internet.userName({ firstName: '大羽', lastName: '陳' }) // 'hlzp8d.tpv45' - note neither name is used
     *
     * @since 2.0.1
     */
    userName(options?: string | {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
    }, legacyLastName?: string): string;
    /**
     * Generates a display name using the given person's name as base.
     * The resulting display name may use one or both of the provided names.
     * If the input names include Unicode characters, the resulting display name will contain Unicode characters.
     * It will not contain spaces.
     *
     * @param options An options object.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @see faker.internet.userName(): For generating a plain ASCII username.
     *
     * @example
     * faker.internet.displayName() // 'Nettie_Zboncak40'
     * faker.internet.displayName({ firstname 'Jeanne', lastName: 'Doe' }) // 'Jeanne98' - note surname not used.
     * faker.internet.displayName({ firstname 'John', lastName: 'Doe' }) // 'John.Doe'
     * faker.internet.displayName({ firstname 'Hélene', lastName: 'Müller' }) // 'Hélene_Müller11'
     * faker.internet.displayName({ firstname 'Фёдор', lastName: 'Достоевский' }) // 'Фёдор.Достоевский50'
     * faker.internet.displayName({ firstname '大羽', lastName: '陳' }) // '大羽.陳'
     *
     * @since 8.0.0
     */
    displayName(options?: {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
    }): string;
    /**
     * Generates a display name using the given person's name as base.
     * The resulting display name may use one or both of the provided names.
     * If the input names include Unicode characters, the resulting display name will contain Unicode characters.
     * It will not contain spaces.
     *
     * @param firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param lastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @see faker.internet.userName(): For generating a plain ASCII username.
     *
     * @example
     * faker.internet.displayName() // 'Nettie_Zboncak40'
     * faker.internet.displayName('Jeanne', 'Doe') // 'Jeanne98' - note surname is not used
     * faker.internet.displayName('John', 'Doe') // 'John.Doe'
     * faker.internet.displayName('Hélene', 'Müller') // 'Hélene_Müller11'
     * faker.internet.displayName('Фёдор', 'Достоевский') // 'Фёдор.Достоевский50'
     * faker.internet.displayName('大羽', '陳') // '大羽.陳'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.internet.displayName({ firstName, lastName })` instead.
     */
    displayName(firstName?: string, lastName?: string): string;
    /**
     * Generates a display name using the given person's name as base.
     * The resulting display name may use one or both of the provided names.
     * If the input names include Unicode characters, the resulting display name will contain Unicode characters.
     * It will not contain spaces.
     *
     * @param options An options object.
     * @param options.firstName The optional first name to use. If not specified, a random one will be chosen.
     * @param options.lastName The optional last name to use. If not specified, a random one will be chosen.
     * @param legacyLastName The optional last name to use. If not specified, a random one will be chosen.
     *
     * @see faker.internet.userName(): For generating a plain ASCII username.
     *
     * @example
     * faker.internet.displayName() // 'Nettie_Zboncak40'
     * faker.internet.displayName({ firstName: 'Jeanne', lastName: 'Doe'}) // 'Jeanne98' - note surname is not used
     * faker.internet.displayName({ firstName: 'John', lastName: 'Doe' }) // 'John.Doe'
     * faker.internet.displayName({ firstName: 'Hélene', lastName: 'Müller' }) // 'Hélene_Müller11'
     * faker.internet.displayName({ firstName: 'Фёдор', lastName: 'Достоевский' }) // 'Фёдор.Достоевский50'
     * faker.internet.displayName({ firstName: '大羽', lastName: '陳' }) // '大羽.陳'
     *
     * @since 8.0.0
     */
    displayName(options?: string | {
        /**
         * The optional first name to use.
         *
         * @default faker.person.firstName()
         */
        firstName?: string;
        /**
         * The optional last name to use.
         *
         * @default faker.person.lastName()
         */
        lastName?: string;
    }, legacyLastName?: string): string;
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
        /**
         * A list of the HTTP status code types that should be used.
         *
         * @default Object.keys(faker.definitions.internet.http_status_code)
         */
        types?: ReadonlyArray<HTTPStatusCodeType>;
    }): number;
    /**
     * Generates a random http(s) url.
     *
     * @param options Optional options object.
     * @param options.appendSlash Whether to append a slash to the end of the url (path). Defaults to a random boolean value.
     * @param options.protocol The protocol to use. Defaults to `'https'`.
     *
     * @example
     * faker.internet.url() // 'https://remarkable-hackwork.info'
     * faker.internet.url({ appendSlash: true }) // 'https://slow-timer.info/'
     * faker.internet.url({ protocol: 'http', appendSlash: false }) // 'http://www.terrible-idea.com'
     *
     * @since 2.1.5
     */
    url(options?: {
        /**
         * Whether to append a slash to the end of the url (path).
         *
         * @default faker.datatype.boolean()
         */
        appendSlash?: boolean;
        /**
         * The protocol to use.
         *
         * @default 'https'
         */
        protocol?: HTTPProtocolType;
    }): string;
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
     * Generates a random IPv4 or IPv6 address.
     *
     * @example
     * faker.internet.ip() // '245.108.222.0'
     * faker.internet.ip() // '4e5:f9c5:4337:abfd:9caf:1135:41ad:d8d3'
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
     * @param options An options object.
     * @param options.redBase The optional base red in range between `0` and `255`. Defaults to `0`.
     * @param options.greenBase The optional base green in range between `0` and `255`. Defaults to `0`.
     * @param options.blueBase The optional base blue in range between `0` and `255`. Defaults to `0`.
     *
     * @example
     * faker.internet.color() // '#30686e'
     * faker.internet.color({ redBase: 100, greenBase: 100, blueBase: 100 }) // '#4e5f8b'
     *
     * @since 2.0.1
     */
    color(options?: {
        /**
         * The optional base red in range between `0` and `255`.
         *
         * @default 0
         */
        redBase?: number;
        /**
         * The optional base green in range between `0` and `255`.
         *
         * @default 0
         */
        greenBase?: number;
        /**
         * The optional base blue in range between `0` and `255`.
         *
         * @default 0
         */
        blueBase?: number;
    }): string;
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
     *
     * @deprecated Use `faker.internet.color({ redBase, greenBase, blueBase })` instead.
     */
    color(redBase?: number, greenBase?: number, blueBase?: number): string;
    /**
     * Generates a random css hex color code in aesthetically pleasing color palette.
     *
     * Based on
     * http://stackoverflow.com/questions/43044/algorithm-to-randomly-generate-an-aesthetically-pleasing-color-palette
     *
     * @param options An options object.
     * @param options.redBase The optional base red in range between `0` and `255`. Defaults to `0`.
     * @param options.greenBase The optional base green in range between `0` and `255`. Defaults to `0`.
     * @param options.blueBase The optional base blue in range between `0` and `255`. Defaults to `0`.
     * @param legacyGreenBase The optional base green in range between `0` and `255`. Defaults to `0`.
     * @param legacyBlueBase The optional base blue in range between `0` and `255`. Defaults to `0`.
     *
     * @example
     * faker.internet.color() // '#30686e'
     * faker.internet.color({ redBase: 100, greenBase: 100, blueBase: 100 }) // '#4e5f8b'
     *
     * @since 2.0.1
     */
    color(options?: number | {
        /**
         * The optional base red in range between `0` and `255`.
         *
         * @default 0
         */
        redBase?: number;
        /**
         * The optional base green in range between `0` and `255`.
         *
         * @default 0
         */
        greenBase?: number;
        /**
         * The optional base blue in range between `0` and `255`.
         *
         * @default 0
         */
        blueBase?: number;
    }, legacyGreenBase?: number, legacyBlueBase?: number): string;
    /**
     * Generates a random mac address.
     *
     * @param options An options object.
     * @param separator The optional separator to use. Can be either `':'`, `'-'` or `''`. Defaults to `':'`.
     *
     * @example
     * faker.internet.mac() // '32:8e:2e:09:c6:05'
     *
     * @since 3.0.0
     */
    mac(options?: {
        /**
         * The optional separator to use. Can be either `':'`, `'-'` or `''`.
         *
         * @default ':'
         */
        separator?: string;
    }): string;
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
     * Generates a random mac address.
     *
     * @param options The optional separator or an options object.
     * @param separator The optional separator to use. Can be either `':'`, `'-'` or `''`. Defaults to `':'`.
     *
     * @example
     * faker.internet.mac() // '32:8e:2e:09:c6:05'
     *
     * @since 3.0.0
     */
    mac(options?: string | {
        /**
         * The optional separator to use. Can be either `':'`, `'-'` or `''`.
         *
         * @default ':'
         */
        separator?: string;
    }): string;
    /**
     * Generates a random password-like string. Do not use this method for generating actual passwords for users.
     * Since the source of the randomness is not cryptographically secure, neither is this generator.
     *
     * @param options An options object.
     * @param options.length The length of the password to generate. Defaults to `15`.
     * @param options.memorable Whether the generated password should be memorable. Defaults to `false`.
     * @param options.pattern The pattern that all chars should match.
     * This option will be ignored, if `memorable` is `true`. Defaults to `/\w/`.
     * @param options.prefix The prefix to use. Defaults to `''`.
     *
     * @example
     * faker.internet.password() // '89G1wJuBLbGziIs'
     * faker.internet.password({ length: 20 }) // 'aF55c_8O9kZaPOrysFB_'
     * faker.internet.password({ length: 20, memorable: true }) // 'lawetimufozujosodedi'
     * faker.internet.password({ length: 20, memorable: true, pattern: /[A-Z]/ }) // 'HMAQDFFYLDDUTBKVNFVS'
     * faker.internet.password({ length: 20, memorable: true, pattern: /[A-Z]/, prefix: 'Hello ' }) // 'Hello IREOXTDWPERQSB'
     *
     * @since 2.0.1
     */
    password(options?: {
        /**
         * The length of the password to generate.
         *
         * @default 15
         */
        length?: number;
        /**
         * Whether the generated password should be memorable.
         *
         * @default false
         */
        memorable?: boolean;
        /**
         * The pattern that all chars should match.
         * This option will be ignored, if `memorable` is `true`.
         *
         * @default /\w/
         */
        pattern?: RegExp;
        /**
         * The prefix to use.
         *
         * @default ''
         */
        prefix?: string;
    }): string;
    /**
     * Generates a random password.
     *
     * @param len The length of the password to generate. Defaults to `15`.
     * @param memorable Whether the generated password should be memorable. Defaults to `false`.
     * @param pattern The pattern that all chars should match.
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
     *
     * @deprecated Use `faker.internet.password({ length, memorable, pattern, prefix })` instead.
     */
    password(len?: number, memorable?: boolean, pattern?: RegExp, prefix?: string): string;
    /**
     * Generates a random password.
     *
     * @param options The length of the password or an options object.
     * @param options.length The length of the password to generate. Defaults to `15`.
     * @param options.memorable Whether the generated password should be memorable. Defaults to `false`.
     * @param options.pattern The pattern that all chars should match.
     * This option will be ignored, if `memorable` is `true`. Defaults to `/\w/`.
     * @param options.prefix The prefix to use. Defaults to `''`.
     * @param legacyMemorable Whether the generated password should be memorable. Defaults to `false`.
     * @param legacyPattern The pattern that all chars should match.
     * This option will be ignored, if `memorable` is `true`. Defaults to `/\w/`.
     * @param legacyPrefix The prefix to use. Defaults to `''`.
     *
     * @example
     * faker.internet.password() // '89G1wJuBLbGziIs'
     * faker.internet.password({ length: 20 }) // 'aF55c_8O9kZaPOrysFB_'
     * faker.internet.password({ length: 20, memorable: true }) // 'lawetimufozujosodedi'
     * faker.internet.password({ length: 20, memorable: true, pattern: /[A-Z]/ }) // 'HMAQDFFYLDDUTBKVNFVS'
     * faker.internet.password({ length: 20, memorable: true, pattern: /[A-Z]/, prefix: 'Hello ' }) // 'Hello IREOXTDWPERQSB'
     *
     * @since 2.0.1
     */
    password(options?: number | {
        /**
         * The length of the password to generate.
         *
         * @default 15
         */
        length?: number;
        /**
         * Whether the generated password should be memorable.
         *
         * @default false
         */
        memorable?: boolean;
        /**
         * The pattern that all chars should match.
         * This option will be ignored, if `memorable` is `true`.
         *
         * @default /\w/
         */
        pattern?: RegExp;
        /**
         * The prefix to use.
         *
         * @default ''
         */
        prefix?: string;
    }, legacyMemorable?: boolean, legacyPattern?: RegExp, legacyPrefix?: string): string;
    /**
     * Generates a random emoji.
     *
     * @param options Options object.
     * @param options.types A list of the emoji types that should be included. Possible values are `'smiley'`, `'body'`, `'person'`, `'nature'`, `'food'`, `'travel'`, `'activity'`, `'object'`, `'symbol'`, `'flag'`. By default, emojis from any type will be included.
     *
     * @example
     * faker.internet.emoji() // '🥰'
     * faker.internet.emoji({ types: ['food', 'nature'] }) // '🥐'
     *
     * @since 6.2.0
     */
    emoji(options?: {
        /**
         * A list of the emoji types that should be used.
         *
         * @default Object.keys(faker.definitions.internet.emoji)
         */
        types?: ReadonlyArray<EmojiType>;
    }): string;
}
