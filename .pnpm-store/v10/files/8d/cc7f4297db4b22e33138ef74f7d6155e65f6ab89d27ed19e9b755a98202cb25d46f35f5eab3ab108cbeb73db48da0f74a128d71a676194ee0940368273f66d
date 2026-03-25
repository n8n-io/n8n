import type { BaseError } from '@intlify/shared';
import { CompileError } from '@intlify/message-compiler';
import { CompileErrorCodes } from '@intlify/message-compiler';
import type { CompileOptions } from '@intlify/message-compiler';
import { createCompileError } from '@intlify/message-compiler';
import type { IntlifyDevToolsEmitter } from '@intlify/devtools-types';
import type { IntlifyDevToolsHookPayloads } from '@intlify/devtools-types';
import type { IntlifyDevToolsHooks } from '@intlify/devtools-types';
import { ResourceNode } from '@intlify/message-compiler';
import type { VueDevToolsEmitter } from '@intlify/devtools-types';

declare type __ResourceFormatPath<T, Key extends keyof T> = Key extends string ? T[Key] extends Record<string, any> ? `${Key}` : never : never;

export declare type __ResourcePath<T, Key extends keyof T> = Key extends string ? T[Key] extends Record<string, any> ? `${Key}.${__ResourcePath<T[Key], Exclude<keyof T[Key], keyof any[]>> & string}` | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}` : never : never;

export declare const AST_NODE_PROPS_KEYS: string[];

export declare function clearCompileCache(): void;

/* Excluded from this release type: clearDateTimeFormat */

/* Excluded from this release type: clearNumberFormat */

export declare function compile<Message = string, MessageSource = string | ResourceNode>(message: MessageSource, context: MessageCompilerContext): MessageFunction<Message>;
export { CompileError }
export { CompileErrorCodes }

export declare const CORE_ERROR_CODES_EXTEND_POINT = 24;

export declare const CORE_WARN_CODES_EXTEND_POINT = 8;

export declare interface CoreCommonContext<Message = string, Locales = 'en-US'> {
    cid: number;
    version: string;
    locale: Locales;
    fallbackLocale: FallbackLocales<Exclude<Locales, LocaleDetector>>;
    missing: CoreMissingHandler<Message> | null;
    missingWarn: boolean | RegExp;
    fallbackWarn: boolean | RegExp;
    fallbackFormat: boolean;
    unresolving: boolean;
    localeFallbacker: LocaleFallbacker;
    onWarn(msg: string, err?: Error): void;
}

export declare type CoreContext<Message = string, Messages = {}, DateTimeFormats = {}, NumberFormats = {}, LocaleType = Locale, ResourceLocales = PickupLocales<NonNullable<Messages>> | PickupLocales<NonNullable<DateTimeFormats>> | PickupLocales<NonNullable<NumberFormats>>, Locales = IsNever<ResourceLocales> extends true ? LocaleType extends LocaleDetector | Locale ? LocaleType : Locale : ResourceLocales> = CoreCommonContext<Message, Locales> & CoreTranslationContext<NonNullable<Messages>, Message> & CoreDateTimeContext<NonNullable<DateTimeFormats>> & CoreNumberContext<NonNullable<NumberFormats>> & {
    fallbackContext?: CoreContext<Message, Messages, DateTimeFormats, NumberFormats, LocaleType, ResourceLocales, Locales>;
};

export declare interface CoreDateTimeContext<DateTimeFormats = {}> {
    datetimeFormats: {
        [K in keyof DateTimeFormats]: DateTimeFormats[K];
    };
}

export declare interface CoreError extends BaseError {
}

export declare const CoreErrorCodes: {
    readonly INVALID_ARGUMENT: 17;
    readonly INVALID_DATE_ARGUMENT: 18;
    readonly INVALID_ISO_DATE_ARGUMENT: 19;
    readonly NOT_SUPPORT_NON_STRING_MESSAGE: 20;
    readonly NOT_SUPPORT_LOCALE_PROMISE_VALUE: 21;
    readonly NOT_SUPPORT_LOCALE_ASYNC_FUNCTION: 22;
    readonly NOT_SUPPORT_LOCALE_TYPE: 23;
};

export declare type CoreErrorCodes = (typeof CoreErrorCodes)[keyof typeof CoreErrorCodes];

export declare interface CoreInternalContext {
    __datetimeFormatters: Map<string, Intl.DateTimeFormat>;
    __numberFormatters: Map<string, Intl.NumberFormat>;
    __localeChainCache?: Map<Locale, Locale[]>;
    __v_emitter?: VueDevToolsEmitter;
    __meta: MetaInfo;
}

export declare interface CoreInternalOptions {
    __datetimeFormatters?: Map<string, Intl.DateTimeFormat>;
    __numberFormatters?: Map<string, Intl.NumberFormat>;
    __v_emitter?: VueDevToolsEmitter;
    __meta?: MetaInfo;
}

export declare type CoreMissingHandler<Message = string> = (context: CoreContext<Message>, locale: Locale, key: Path, type: CoreMissingType, ...values: unknown[]) => string | void;

export declare type CoreMissingType = 'translate' | 'datetime format' | 'number format' | 'translate exists';

export declare interface CoreNumberContext<NumberFormats = {}> {
    numberFormats: {
        [K in keyof NumberFormats]: NumberFormats[K];
    };
}

export declare interface CoreOptions<Message = string, Schema extends {
    message?: unknown;
    datetime?: unknown;
    number?: unknown;
} = {
    message: DefaultCoreLocaleMessageSchema;
    datetime: DateTimeFormat;
    number: NumberFormat;
}, Locales extends {
    messages: unknown;
    datetimeFormats: unknown;
    numberFormats: unknown;
} | string = Locale, MessagesLocales = Locales extends {
    messages: infer M;
} ? M : Locales extends string ? Locales : Locale, DateTimeFormatsLocales = Locales extends {
    datetimeFormats: infer D;
} ? D : Locales extends string ? Locales : Locale, NumberFormatsLocales = Locales extends {
    numberFormats: infer N;
} ? N : Locales extends string ? Locales : Locale, MessageSchema = Schema extends {
    message: infer M;
} ? M : DefaultCoreLocaleMessageSchema, DateTimeSchema = Schema extends {
    datetime: infer D;
} ? D : DateTimeFormat, NumberSchema = Schema extends {
    number: infer N;
} ? N : NumberFormat, _Messages extends LocaleMessages<MessageSchema, MessagesLocales, Message> = LocaleMessages<MessageSchema, MessagesLocales, Message>, _DateTimeFormats extends DateTimeFormats<DateTimeSchema, DateTimeFormatsLocales> = DateTimeFormats<DateTimeSchema, DateTimeFormatsLocales>, _NumberFormats extends NumberFormats<NumberSchema, NumberFormatsLocales> = NumberFormats<NumberSchema, NumberFormatsLocales>> {
    version?: string;
    locale?: Locale | LocaleDetector;
    fallbackLocale?: FallbackLocale;
    messages?: {
        [K in keyof _Messages]: MessageSchema;
    };
    datetimeFormats?: {
        [K in keyof _DateTimeFormats]: DateTimeSchema;
    };
    numberFormats?: {
        [K in keyof _NumberFormats]: NumberSchema;
    };
    modifiers?: LinkedModifiers<Message>;
    pluralRules?: PluralizationRules;
    missing?: CoreMissingHandler<Message>;
    missingWarn?: boolean | RegExp;
    fallbackWarn?: boolean | RegExp;
    fallbackFormat?: boolean;
    unresolving?: boolean;
    postTranslation?: PostTranslationHandler<Message>;
    processor?: MessageProcessor<Message>;
    warnHtmlMessage?: boolean;
    escapeParameter?: boolean;
    messageCompiler?: MessageCompiler<Message, string | ResourceNode>;
    messageResolver?: MessageResolver;
    localeFallbacker?: LocaleFallbacker;
    fallbackContext?: CoreContext<Message, MessagesLocales, DateTimeFormatsLocales, NumberFormatsLocales>;
    onWarn?: (msg: string, err?: Error) => void;
}

export declare interface CoreTranslationContext<Messages = {}, Message = string> {
    messages: {
        [K in keyof Messages]: Messages[K];
    };
    modifiers: LinkedModifiers<Message>;
    pluralRules?: PluralizationRules;
    postTranslation: PostTranslationHandler<Message> | null;
    processor: MessageProcessor<Message> | null;
    warnHtmlMessage: boolean;
    escapeParameter: boolean;
    messageCompiler: MessageCompiler<Message, string | ResourceNode> | null;
    messageResolver: MessageResolver;
}

export declare const CoreWarnCodes: {
    readonly NOT_FOUND_KEY: 1;
    readonly FALLBACK_TO_TRANSLATE: 2;
    readonly CANNOT_FORMAT_NUMBER: 3;
    readonly FALLBACK_TO_NUMBER_FORMAT: 4;
    readonly CANNOT_FORMAT_DATE: 5;
    readonly FALLBACK_TO_DATE_FORMAT: 6;
    readonly EXPERIMENTAL_CUSTOM_MESSAGE_COMPILER: 7;
};

export declare type CoreWarnCodes = (typeof CoreWarnCodes)[keyof typeof CoreWarnCodes];
export { createCompileError }

export declare function createCoreContext<Message = string, Options extends CoreOptions<Message> = CoreOptions<Message>, Messages extends Record<string, any> = Options['messages'] extends Record<string, any> ? Options['messages'] : {}, DateTimeFormats extends Record<string, any> = Options['datetimeFormats'] extends Record<string, any> ? Options['datetimeFormats'] : {}, NumberFormats extends Record<string, any> = Options['numberFormats'] extends Record<string, any> ? Options['numberFormats'] : {}, LocaleType = Locale | LocaleDetector>(options: Options): CoreContext<Message, Messages, DateTimeFormats, NumberFormats, LocaleType>;

export declare function createCoreContext<Schema = LocaleMessage, Locales = 'en-US', Message = string, Options extends CoreOptions<Message, SchemaParams<Schema, Message>, LocaleParams<Locales>> = CoreOptions<Message, SchemaParams<Schema, Message>, LocaleParams<Locales>>, Messages extends Record<string, any> = NonNullable<Options['messages']> extends Record<string, any> ? NonNullable<Options['messages']> : {}, DateTimeFormats extends Record<string, any> = NonNullable<Options['datetimeFormats']> extends Record<string, any> ? NonNullable<Options['datetimeFormats']> : {}, NumberFormats extends Record<string, any> = NonNullable<Options['numberFormats']> extends Record<string, any> ? NonNullable<Options['numberFormats']> : {}, LocaleType = Locale | LocaleDetector>(options: Options): CoreContext<Message, Messages, DateTimeFormats, NumberFormats, LocaleType>;

export declare function createCoreError(code: CoreErrorCodes): CoreError;

export declare function createMessageContext<T = string, N = {}>(options?: MessageContextOptions<T, N>): MessageContext<T>;

/**
 *  number
 */
export declare type CurrencyDisplay = 'symbol' | 'code' | 'name';

export declare interface CurrencyNumberFormatOptions extends Intl.NumberFormatOptions {
    style: 'currency';
    currency: string;
    currencyDisplay?: CurrencyDisplay;
    localeMatcher?: LocaleMatcher;
    formatMatcher?: FormatMatcher;
}

/**
 * `datetime` function overloads
 */
export declare function datetime<Context extends CoreContext<Message, {}, {}, {}>, Message = string>(context: Context, value: number | string | Date): string | number | Intl.DateTimeFormatPart[];

export declare function datetime<Context extends CoreContext<Message, {}, {}, {}>, Value extends number | string | Date = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['datetimeFormats']> = PickupFormatKeys<Context['datetimeFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Context['locale']>): string | number | Intl.DateTimeFormatPart[];

export declare function datetime<Context extends CoreContext<Message, {}, {}, {}>, Value extends number | string | Date = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['datetimeFormats']> = PickupFormatKeys<Context['datetimeFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Context['locale']>, locale: Context['locale']): string | number | Intl.DateTimeFormatPart[];

export declare function datetime<Context extends CoreContext<Message, {}, {}, {}>, Value extends number | string | Date = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['datetimeFormats']> = PickupFormatKeys<Context['datetimeFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Context['locale']>, override: Intl.DateTimeFormatOptions): string | number | Intl.DateTimeFormatPart[];

export declare function datetime<Context extends CoreContext<Message, {}, {}, {}>, Value extends number | string | Date = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['datetimeFormats']> = PickupFormatKeys<Context['datetimeFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Context['locale']>, locale: Context['locale'], override: Intl.DateTimeFormatOptions): string | number | Intl.DateTimeFormatPart[];

/* Excluded from this release type: DATETIME_FORMAT_OPTIONS_KEYS */

export declare type DateTimeDigital = 'numeric' | '2-digit';

export declare type DateTimeFormat = {
    [key: string]: DateTimeFormatOptions;
};

export declare type DateTimeFormatOptions = Intl.DateTimeFormatOptions | SpecificDateTimeFormatOptions;

export declare type DateTimeFormats<Schema = DateTimeFormat, Locales = Locale> = LocaleRecord<UnionToTuple<Locales>, Schema>;

/**
 *  datetime
 */
export declare type DateTimeHumanReadable = 'long' | 'short' | 'narrow';

/**
 *  # datetime
 *
 *  ## usages:
 *    // for example `context.datetimeFormats` below
 *    'en-US': {
 *      short: {
 *        year: 'numeric', month: '2-digit', day: '2-digit',
 *        hour: '2-digit', minute: '2-digit'
 *      }
 *    },
 *    'ja-JP': { ... }
 *
 *    // datetimeable value only
 *    datetime(context, value)
 *
 *    // key argument
 *    datetime(context, value, 'short')
 *
 *    // key & locale argument
 *    datetime(context, value, 'short', 'ja-JP')
 *
 *    // object sytle argument
 *    datetime(context, value, { key: 'short', locale: 'ja-JP' })
 *
 *    // suppress localize miss warning option, override context.missingWarn
 *    datetime(context, value, { key: 'short', locale: 'ja-JP', missingWarn: false })
 *
 *    // suppress localize fallback warning option, override context.fallbackWarn
 *    datetime(context, value, { key: 'short', locale: 'ja-JP', fallbackWarn: false })
 *
 *    // if you specify `part` options, you can get an array of objects containing the formatted datetime in parts
 *    datetime(context, value, { key: 'short', part: true })
 *
 *    // orverride context.datetimeFormats[locale] options with functino options
 *    datetime(cnotext, value, 'short', { year: '2-digit' })
 *    datetime(cnotext, value, 'short', 'ja-JP', { year: '2-digit' })
 *    datetime(context, value, { key: 'short', part: true, year: '2-digit' })
 */
/**
 * DateTime options
 *
 * @remarks
 * Options for Datetime formatting API
 *
 * @VueI18nGeneral
 */
export declare interface DateTimeOptions<Key = string, Locales = Locale> extends Intl.DateTimeFormatOptions, LocaleOptions<Locales> {
    /**
     * @remarks
     * The target format key
     */
    key?: Key;
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails
     */
    missingWarn?: boolean;
    /**
     * @remarks
     * Whether do resolve on format keys when your language lacks a formatting for a key
     */
    fallbackWarn?: boolean;
    /**
     * @remarks
     * Whether to use [Intel.DateTimeFormat#formatToParts](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts)
     */
    part?: boolean;
}

export declare const DEFAULT_LOCALE = "en-US";

export declare const DEFAULT_MESSAGE_DATA_TYPE = "text";

export declare type DefaultCoreLocaleMessageSchema<Schema = RemoveIndexSignature<{
    [K in keyof DefineCoreLocaleMessage]: DefineCoreLocaleMessage[K];
}>> = IsEmptyObject<Schema> extends true ? LocaleMessage<string> : Schema;

/**
 * The type definition of Locale Message for `@intlify/core-base` package
 *
 * @remarks
 * The typealias is used to strictly define the type of the Locale message.
 *
 * @example
 * ```ts
 * // type.d.ts (`.d.ts` file at your app)
 * import { DefineCoreLocaleMessage } from '@intlify/core-base'
 *
 * declare module '@intlify/core-base' {
 *   export interface DefineCoreLocaleMessage {
 *     title: string
 *     menu: {
 *       login: string
 *     }
 *   }
 * }
 * ```
 *
 * @VueI18nGeneral
 */
export declare interface DefineCoreLocaleMessage extends LocaleMessage<string> {
}

export declare type EmptyObject = {
    [emptyObjectSymbol]?: never;
};

declare const emptyObjectSymbol: unique symbol;

export declare type ExtractToStringKey<T> = Extract<keyof T, 'toString'>;

/** @VueI18nGeneral */
export declare type FallbackLocale = Locale | Locale[] | {
    [locale in string]: Locale[];
} | false;

export declare type FallbackLocales<Locales = 'en-US'> = Locales | Array<Locales> | {
    [locale in string]: Array<PickupFallbackLocales<UnionToTuple<Locales>>>;
} | false;

/**
 * Fallback with locale chain
 *
 * @remarks
 * A fallback locale function implemented with a fallback chain algorithm. It's used in VueI18n as default.
 *
 * @param ctx - A {@link CoreContext | context}
 * @param fallback - A {@link FallbackLocale | fallback locale}
 * @param start - A starting {@link Locale | locale}
 *
 * @returns Fallback locales
 *
 * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
 *
 * @VueI18nGeneral
 */
export declare function fallbackWithLocaleChain<Message = string>(ctx: CoreContext<Message>, fallback: FallbackLocale, start: Locale): Locale[];

/**
 * Fallback with simple implemenation
 *
 * @remarks
 * A fallback locale function implemented with a simple fallback algorithm.
 *
 * Basically, it returns the value as specified in the `fallbackLocale` props, and is processed with the fallback inside intlify.
 *
 * @param ctx - A {@link CoreContext | context}
 * @param fallback - A {@link FallbackLocale | fallback locale}
 * @param start - A starting {@link Locale | locale}
 *
 * @returns Fallback locales
 *
 * @VueI18nGeneral
 */
export declare function fallbackWithSimple<Message = string>(ctx: CoreContext<Message>, fallback: FallbackLocale, start: Locale): Locale[];

export declare type First<T extends readonly any[]> = T[0];

export declare type FormatMatcher = 'basic' | 'best fit';

export declare type FormattedNumberPart = {
    type: FormattedNumberPartType;
    value: string;
};

export declare type FormattedNumberPartType = 'currency' | 'decimal' | 'fraction' | 'group' | 'infinity' | 'integer' | 'literal' | 'minusSign' | 'nan' | 'plusSign' | 'percentSign';

/**
 * Generated locale which resolves to `never` if left unset
 */
export declare type GeneratedLocale = GeneratedTypeConfig extends Record<'locale', infer CustomLocale> ? CustomLocale : never;

/**
 *
 * The interface used for narrowing types using generated types.
 *
 * @remarks
 *
 * The type generated by 3rd party (e.g. nuxt/i18n)
 *
 * @example
 * ```ts
 * // generated-i18n-types.d.ts (`.d.ts` file at your app)
 *
 * declare module '@intlify/core-base' {
 *   interface GeneratedTypeConfig {
 *     locale: "en" | "ja"
 *   }
 * }
 * ```
 */
export declare interface GeneratedTypeConfig {
}

export declare const getAdditionalMeta: () => MetaInfo | null;

export declare function getDevToolsHook(): IntlifyDevToolsEmitter | null;

export declare const getFallbackContext: () => CoreContext | null;

/* Excluded from this release type: getLocale */

export declare function getWarnMessage(code: CoreWarnCodes, ...args: unknown[]): string;

/* Excluded from this release type: handleMissing */

export declare function initI18nDevTools(i18n: unknown, version: string, meta?: Record<string, unknown>): void;

/* Excluded from this release type: isAlmostSameLocale */

export declare type IsEmptyObject<T> = T extends {
    [emptyObjectSymbol]?: never;
} ? true : false;

/* Excluded from this release type: isImplicitFallback */

export declare function isMessageAST(val: unknown): val is ResourceNode;

export declare const isMessageFunction: <T>(val: unknown) => val is MessageFunction<T>;

export declare type IsNever<T> = [T] extends [never] ? true : false;

export declare type IsObject<T> = IsTuple<T> extends true ? false : [T] extends [object] ? true : false;

export declare type IsRecord<T> = IsTuple<T> extends true ? false : [T] extends [Record<string, any>] ? true : false;

/* Excluded from this release type: isTranslateFallbackWarn */

/* Excluded from this release type: isTranslateMissingWarn */

export declare type IsTuple<T> = IsNever<T> extends true ? false : T extends readonly any[] ? number extends T['length'] ? false : true : false;

export declare type IsUnion<T, B = T> = T extends B ? [B] extends [T] ? false : true : never;

export declare type JsonPaths<T, Key extends keyof T = keyof T> = Key extends string ? T[Key] extends Record<string, any> ? `${Key}.${JsonPaths<T[Key]>}` : `${Key}` : never;

export declare type LastInUnion<U> = UnionToIntersection<U extends unknown ? (x: U) => 0 : never> extends (x: infer L) => 0 ? L : never;

/** @VueI18nGeneral */
export declare type LinkedModifiers<T = string> = {
    [key: string]: LinkedModify<T>;
};

export declare type LinkedModify<T = string> = (value: T, type: string) => MessageType<T>;

export declare interface LinkedOptions {
    /**
     * The message type of linked message
     */
    type?: string;
    /**
     * The modifier of linked message
     */
    modifier?: string;
}

/** @VueI18nGeneral */
export declare type Locale = IsNever<GeneratedLocale> extends true ? string : GeneratedLocale;

/** @VueI18nGeneral */
export declare interface LocaleDetector<Args extends any[] = any[]> {
    (...args: Args): Locale | Promise<Locale>;
    resolvedOnce?: boolean;
}

/**
 * The locale fallbacker
 *
 * @VueI18nGeneral
 */
export declare type LocaleFallbacker = <Message = string>(ctx: CoreContext<Message>, fallback: FallbackLocale, start: Locale) => Locale[];

export declare type LocaleMatcher = 'lookup' | 'best fit';

/** @VueI18nGeneral */
export declare type LocaleMessage<Message = string> = Record<string, LocaleMessageValue<Message>>;

/** @VueI18nGeneral */
export declare type LocaleMessageDictionary<T, Message = string> = {
    [K in keyof T]: LocaleMessageType<T[K], Message>;
};

/** @VueI18nGeneral */
export declare type LocaleMessages<Schema, Locales = Locale, Message = string> = LocaleRecord<UnionToTuple<Locales>, Schema>;

/** @VueI18nGeneral */
export declare type LocaleMessageType<T, Message = string> = T extends string ? string : T extends () => Promise<infer P> ? LocaleMessageDictionary<P, Message> : T extends (...args: infer Arguments) => any ? (...args: Arguments) => ReturnType<T> : T extends Record<string, unknown> ? LocaleMessageDictionary<T, Message> : T extends Array<T> ? {
    [K in keyof T]: T[K];
} : T;

/** @VueI18nGeneral */
export declare type LocaleMessageValue<Message = string> = LocaleMessageDictionary<any, Message> | string;

/** @VueI18nGeneral */
export declare interface LocaleOptions<Locales = Locale> {
    /**
     * @remarks
     * The locale of localization
     */
    locale?: Locales | LocaleDetector;
}

export declare type LocaleParams<T, Default = 'en-US'> = T extends IsUnion<T> ? {
    messages: T;
    datetimeFormats: T;
    numberFormats: T;
} : T extends {
    messages?: infer M;
    datetimeFormats?: infer D;
    numberFormats?: infer N;
} ? {
    messages: LocaleParamsType<M, Default>;
    datetimeFormats: LocaleParamsType<D, Default>;
    numberFormats: LocaleParamsType<N, Default>;
} : T extends string ? {
    messages: T;
    datetimeFormats: T;
    numberFormats: T;
} : {
    messages: Default;
    datetimeFormats: Default;
    numberFormats: Default;
};

declare type LocaleParamsType<T, R> = T extends IsUnion<T> ? T : T extends string ? T : R;

export declare type LocaleRecord<T extends any[], R> = {
    [K in T[number]]: R;
};

/**
 * The message compiler
 *
 * @param message - A resolved message that ususally will be passed the string. if you can transform to it with bundler, will be passed the AST.
 * @param context - A message context {@link MessageCompilerContext}
 *
 * @returns A {@link MessageFunction}
 *
 * @VueI18nGeneral
 */
export declare type MessageCompiler<Message = string, MessageSource = string | ResourceNode> = (message: MessageSource, context: MessageCompilerContext) => MessageFunction<Message>;

/**
 * The context that will pass the message compiler.
 *
 * @VueI18nGeneral
 */
export declare type MessageCompilerContext = Pick<CompileOptions, 'onError' | 'onCacheKey'> & {
    /**
     * Whether to allow the use locale messages of HTML formatting.
     */
    warnHtmlMessage?: boolean;
    /**
     * The resolved locale message key
     */
    key: string;
    /**
     * The locale
     */
    locale: Locale;
};

/**
 * The message context.
 *
 * @VueI18nGeneral
 */
export declare interface MessageContext<T = string> {
    /**
     * Resolve message value from list.
     *
     * @param index - An index of message values.
     *
     * @returns A resolved message value.
     *
     * @example
     * ```js
     * const messages = {
     *   en: {
     *     greeting: ({ list }) => `hello, ${list(0)}!`
     *   }
     * }
     * ```
     */
    list(index: number): unknown;
    /**
     * Resolve message value from named.
     *
     * @param key - A key of message value.
     *
     * @returns A resolved message value.
     *
     * @example
     * ```js
     * const messages = {
     *   en: {
     *     greeting: ({ named }) => `hello, ${named('name')}!`
     *   }
     * }
     * ```
     */
    named(key: string): unknown;
    /**
     * Resolve message with plural index.
     *
     * @remarks
     * That's resolved with plural index with translation function.
     *
     * @param messages - the messages, that is resolved with plural index with translation function.
     *
     * @returns A resolved message.
     *
     * @example
     * ```js
     * const messages = {
     *   en: {
     *     car: ({ plural }) => plural(['car', 'cars']),
     *     apple: ({ plural, named }) =>
     *       plural([
     *         'no apples',
     *         'one apple',
     *         `${named('count')} apples`
     *       ])
     *   }
     * }
     * ```
     */
    plural(messages: T[]): T;
    /**
     * Resolve linked message.
     *
     * @param key - A message key
     * @param modifier - A modifier
     *
     * @returns A resolve message.
     */
    linked(key: Path, modifier?: string): MessageType<T>;
    /**
     * Overloaded `linked`
     *
     * @param key - A message key
     * @param modifier - A modifier
     * @param type - A message type
     *
     * @returns A resolve message.
     */
    linked(key: Path, modifier?: string, type?: string): MessageType<T>;
    /**
     * Overloaded `linked`
     *
     * @param key - A message key
     * @param optoins - An {@link LinkedOptions | linked options}
     *
     * @returns A resolve message.
     */
    linked(key: Path, optoins?: LinkedOptions): MessageType<T>;
    /* Excluded from this release type: message */
    /**
     * The message type to be handled by the message function.
     *
     * @remarks
     * Usually `text`, you need to return **string** in message function.
     */
    type: string;
    /* Excluded from this release type: interpolate */
    /* Excluded from this release type: normalize */
    /**
     * The message values.
     *
     * @remarks
     * The message values are the argument values passed from translation function, such as `$t`, `t`, or `translate`.
     *
     * @example
     * vue-i18n `$t` (or `t`) case:
     * ```html
     * <p>{{ $t('greeting', { name: 'DIO' }) }}</p> <!-- `{ name: 'DIO' }` is message values -->
     * ```
     *
     * `@intlify/core` (`@intlify/core-base`) `translate` case:
     * ```js
     * translate(context, 'foo.bar', ['dio']) // `['dio']` is message values
     * ```
     */
    values: Record<string, unknown>;
}

export declare interface MessageContextOptions<T = string, N = {}> {
    parent?: MessageContext<T>;
    locale?: string;
    list?: unknown[];
    named?: NamedValue<N>;
    modifiers?: LinkedModifiers<T>;
    pluralIndex?: number;
    pluralRules?: PluralizationRules;
    messages?: MessageFunctions<T> | MessageResolveFunction<T>;
    processor?: MessageProcessor<T>;
}

/**
 * The Message Function.
 *
 * @param ctx - A {@link MessageContext}
 *
 * @return A resolved format message, that is string type basically.
 *
 * @VueI18nGeneral
 */
export declare type MessageFunction<T = string> = MessageFunctionCallable | MessageFunctionInternal<T>;

export declare type MessageFunctionCallable = <T = string>(ctx: MessageContext<T>) => MessageFunctionReturn<T>;

export declare type MessageFunctionInternal<T = string> = {
    (ctx: MessageContext<T>): MessageFunctionReturn<T>;
    key?: string;
    locale?: string;
    source?: string;
};

/** @VueI18nGeneral */
export declare type MessageFunctionReturn<T = string> = T extends string ? MessageType<T> : MessageType<T>[];

export declare type MessageFunctions<T = string> = Record<string, MessageFunction<T>>;

export declare type MessageInterpolate<T = string> = (val: unknown) => MessageType<T>;

export declare type MessageNormalize<T = string> = (values: MessageType<T>[]) => MessageFunctionReturn<T>;

export declare interface MessageProcessor<T = string> {
    type?: string;
    interpolate?: MessageInterpolate<T>;
    normalize?: MessageNormalize<T>;
}

export declare type MessageResolveFunction<T = string> = (key: string, useLinked: boolean) => MessageFunction<T>;

/** @VueI18nGeneral */
export declare type MessageResolver = (obj: unknown, path: Path) => PathValue;

export declare type MessageType<T = string> = T extends string ? string : StringConvertable<T>;

export declare interface MetaInfo {
    [field: string]: unknown;
}

export declare const MISSING_RESOLVE_VALUE = "";

/** @VueI18nGeneral */
export declare type NamedValue<T = {}> = T & Record<string, unknown>;

export declare const NOT_REOSLVED = -1;

/**
 * `number` function overloads
 */
export declare function number<Context extends CoreContext<Message, {}, {}, {}>, Message = string>(context: Context, value: number): string | number | Intl.NumberFormatPart[];

export declare function number<Context extends CoreContext<Message, {}, {}, {}>, Value extends number = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['numberFormats']> = PickupFormatKeys<Context['numberFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Context['locale']>): string | number | Intl.NumberFormatPart[];

export declare function number<Context extends CoreContext<Message, {}, {}, {}>, Value extends number = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['numberFormats']> = PickupFormatKeys<Context['numberFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Context['locale']>, locale: Context['locale']): string | number | Intl.NumberFormatPart[];

export declare function number<Context extends CoreContext<Message, {}, {}, {}>, Value extends number = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['numberFormats']> = PickupFormatKeys<Context['numberFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Context['locale']>, override: Intl.NumberFormatOptions): string | number | Intl.NumberFormatPart[];

export declare function number<Context extends CoreContext<Message, {}, {}, {}>, Value extends number = number, Key extends string = string, ResourceKeys extends PickupFormatKeys<Context['numberFormats']> = PickupFormatKeys<Context['numberFormats']>, Message = string>(context: Context, value: Value, keyOrOptions: Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Context['locale']>, locale: Context['locale'], override: Intl.NumberFormatOptions): string | number | Intl.NumberFormatPart[];

/* Excluded from this release type: NUMBER_FORMAT_OPTIONS_KEYS */

export declare type NumberFormat = {
    [key: string]: NumberFormatOptions;
};

export declare type NumberFormatOptions = Intl.NumberFormatOptions | SpecificNumberFormatOptions | CurrencyNumberFormatOptions;

export declare type NumberFormats<Schema = NumberFormat, Locales = Locale> = LocaleRecord<UnionToTuple<Locales>, Schema>;

export declare type NumberFormatToPartsResult = {
    [index: number]: FormattedNumberPart;
};

/**
 *  # number
 *
 *  ## usages
 *    // for example `context.numberFormats` below
 *    'en-US': {
 *      'currency': {
 *        style: 'currency', currency: 'USD', currencyDisplay: 'symbol'
 *      }
 *    },
 *    'ja-JP: { ... }
 *
 *    // value only
 *    number(context, value)
 *
 *    // key argument
 *    number(context, value, 'currency')
 *
 *    // key & locale argument
 *    number(context, value, 'currency', 'ja-JP')
 *
 *    // object sytle argument
 *    number(context, value, { key: 'currency', locale: 'ja-JP' })
 *
 *    // suppress localize miss warning option, override context.missingWarn
 *    number(context, value, { key: 'currency', locale: 'ja-JP', missingWarn: false })
 *
 *    // suppress localize fallback warning option, override context.fallbackWarn
 *    number(context, value, { key: 'currency', locale: 'ja-JP', fallbackWarn: false })
 *
 *    // if you specify `part` options, you can get an array of objects containing the formatted number in parts
 *    number(context, value, { key: 'currenty', part: true })
 *
 *    // orverride context.numberFormats[locale] options with functino options
 *    number(cnotext, value, 'currency', { year: '2-digit' })
 *    number(cnotext, value, 'currency', 'ja-JP', { year: '2-digit' })
 *    number(context, value, { key: 'currenty', locale: 'ja-JP', part: true, year: '2-digit'})
 */
/**
 * Number Options
 *
 * @remarks
 * Options for Number formatting API
 *
 * @VueI18nGeneral
 */
export declare interface NumberOptions<Key = string, Locales = Locale> extends Intl.NumberFormatOptions, LocaleOptions<Locales> {
    /**
     * @remarks
     * The target format key
     */
    key?: Key;
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails
     */
    missingWarn?: boolean;
    /**
     * @remarks
     * Whether do resolve on format keys when your language lacks a formatting for a key
     */
    fallbackWarn?: boolean;
    /**
     * @remarks
     * Whether to use [Intel.NumberFormat#formatToParts](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts)
     */
    part?: boolean;
}

/**
 * Parse a string path into an array of segments
 */
export declare function parse(path: Path): string[] | undefined;

/* Excluded from this release type: parseDateTimeArgs */

/* Excluded from this release type: parseNumberArgs */

/* Excluded from this release type: parseTranslateArgs */

/** @VueI18nGeneral */
export declare type Path = string;

/** @VueI18nGeneral */
export declare type PathValue = string | number | boolean | Function | null | {
    [key: string]: PathValue;
} | PathValue[];

export declare type PickupFallbackLocales<T extends any[]> = T[number] | `${T[number]}!`;

export declare type PickupFormatKeys<T extends Record<string, any>, K = keyof T> = K extends string ? ResourceFormatPath<T[K]> : never;

export declare type PickupFormatPathKeys<T extends object> = ResourceFormatPath<T>;

export declare type PickupKeys<T extends Record<string, any>, K = keyof T> = K extends string ? ResourcePath<T[K]> : never;

export declare type PickupLocales<T extends Record<string, any>, K = keyof T> = K extends string ? K : never;

export declare type PickupPaths<T extends object> = ResourcePath<T>;

export declare type PluralizationProps = {
    n?: number;
    count?: number;
};

export declare type PluralizationRule = (choice: number, choicesLength: number, orgRule?: PluralizationRule) => number;

/** @VueI18nGeneral */
export declare type PluralizationRules = {
    [locale: string]: PluralizationRule;
};

/** @VueI18nGeneral */
export declare type PostTranslationHandler<Message = string> = (translated: MessageFunctionReturn<Message>, key: string) => MessageFunctionReturn<Message>;

/**
 * Register the locale fallbacker
 *
 * @param fallbacker - A {@link LocaleFallbacker} function
 *
 * @VueI18nGeneral
 */
export declare function registerLocaleFallbacker(fallbacker: LocaleFallbacker): void;

export declare function registerMessageCompiler<Message>(compiler: MessageCompiler<Message, string | ResourceNode>): void;

/**
 * Register the message resolver
 *
 * @param resolver - A {@link MessageResolver} function
 *
 * @VueI18nGeneral
 */
export declare function registerMessageResolver(resolver: MessageResolver): void;

export declare type RemovedIndexResources<T> = RemoveIndexSignature<{
    [K in keyof T]: T[K];
}>;

export declare type RemoveIndexSignature<T> = {
    [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/* Excluded from this release type: resolveLocale */

/**
 * message resolver
 *
 * @remarks
 * Resolves messages. messages with a hierarchical structure such as objects can be resolved. This resolver is used in VueI18n as default.
 *
 * @param obj - A target object to be resolved with path
 * @param path - A {@link Path | path} to resolve the value of message
 *
 * @returns A resolved {@link PathValue | path value}
 *
 * @VueI18nGeneral
 */
export declare function resolveValue(obj: unknown, path: Path): PathValue;

/**
 * key-value message resolver
 *
 * @remarks
 * Resolves messages with the key-value structure. Note that messages with a hierarchical structure such as objects cannot be resolved
 *
 * @param obj - A target object to be resolved with path
 * @param path - A {@link Path | path} to resolve the value of message
 *
 * @returns A resolved {@link PathValue | path value}
 *
 * @VueI18nGeneral
 */
export declare function resolveWithKeyValue(obj: unknown, path: Path): PathValue;

export declare type ResourceFormatPath<T> = _ResourceFormatPath<T> extends string | keyof T ? _ResourceFormatPath<T> : keyof T;

declare type _ResourceFormatPath<T> = __ResourceFormatPath<T, keyof T> | keyof T;
export { ResourceNode }

export declare type ResourcePath<T> = _ResourcePath<T> extends string | keyof T ? _ResourcePath<T> : keyof T;

export declare type _ResourcePath<T> = __ResourcePath<T, keyof T> | keyof T;

export declare type ResourceValue<T, P extends ResourcePath<T>> = P extends `${infer Key}.${infer Rest}` ? Key extends keyof T ? Rest extends ResourcePath<T[Key]> ? ResourceValue<T[Key], Rest> : never : never : P extends keyof T ? T[P] : never;

export declare type SchemaParams<T, Message = string> = T extends readonly any[] ? {
    message: First<T>;
    datetime: DateTimeFormat;
    number: NumberFormat;
} : T extends {
    message?: infer M;
    datetime?: infer D;
    number?: infer N;
} ? {
    message: M extends LocaleMessage<Message> ? M : LocaleMessage<Message>;
    datetime: D extends DateTimeFormat ? D : DateTimeFormat;
    number: N extends NumberFormat ? N : NumberFormat;
} : {
    message: LocaleMessage<Message>;
    datetime: DateTimeFormat;
    number: NumberFormat;
};

export declare const setAdditionalMeta: (meta: MetaInfo | null) => void;

export declare function setDevToolsHook(hook: IntlifyDevToolsEmitter | null): void;

export declare const setFallbackContext: (context: CoreContext | null) => void;

export declare interface SpecificDateTimeFormatOptions extends Intl.DateTimeFormatOptions {
    year?: DateTimeDigital;
    month?: DateTimeDigital | DateTimeHumanReadable;
    day?: DateTimeDigital;
    hour?: DateTimeDigital;
    minute?: DateTimeDigital;
    second?: DateTimeDigital;
    weekday?: DateTimeHumanReadable;
    era?: DateTimeHumanReadable;
    timeZoneName?: 'long' | 'short';
    localeMatcher?: LocaleMatcher;
    formatMatcher?: FormatMatcher;
}

export declare interface SpecificNumberFormatOptions extends Intl.NumberFormatOptions {
    style?: 'decimal' | 'percent';
    currency?: string;
    currencyDisplay?: CurrencyDisplay;
    localeMatcher?: LocaleMatcher;
    formatMatcher?: FormatMatcher;
}

/**
 * weather the type `T` is able to convert to string with `toString` method
 */
export declare type StringConvertable<T, Extracted = ExtractToStringKey<T>> = IsNever<Extracted> extends true ? T extends boolean ? T : T extends Function ? T : IsObject<T> extends true ? T : unknown : T;

/**
 * TODO:
 *  this type should be used (refactored) at `translate` type definition
 *  (Unfortunately, using this type will result in key completion failure due to type mismatch...)
 */
/**
 * `translate` function overloads
 */
export declare function translate<Context extends CoreContext<Message>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, plural: number): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, plural: number): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, plural: number, options: TranslateOptions<Context['locale']>): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, defaultMsg: string): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, defaultMsg: string, options: TranslateOptions<Context['locale']>): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, list: unknown[]): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, list: unknown[], plural: number): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, list: unknown[], defaultMsg: string): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, list: unknown[], options: TranslateOptions<Context['locale']>): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, named: NamedValue): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, named: NamedValue, plural: number): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, named: NamedValue, defaultMsg: string): MessageFunctionReturn<Message> | number;

export declare function translate<Context extends CoreContext<Message, {}, {}, {}>, Key extends string = string, DefinedLocaleMessage extends RemovedIndexResources<DefineCoreLocaleMessage> = RemovedIndexResources<DefineCoreLocaleMessage>, CoreMessages = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, ContextMessages = IsEmptyObject<Context['messages']> extends false ? PickupKeys<Context['messages']> : never, ResourceKeys extends CoreMessages | ContextMessages = IsNever<CoreMessages> extends false ? IsNever<ContextMessages> extends false ? CoreMessages | ContextMessages : CoreMessages : IsNever<ContextMessages> extends false ? ContextMessages : never, Message = string>(context: Context, key: Key | ResourceKeys | number | MessageFunction<Message>, named: NamedValue, options: TranslateOptions<Context['locale']>): MessageFunctionReturn<Message> | number;

export declare const translateDevTools: (payloads: IntlifyDevToolsHookPayloads[IntlifyDevToolsHooks]) => void | null;

/**
 *  # translate
 *
 *  ## usages:
 *    // for example, locale messages key
 *    { 'foo.bar': 'hi {0} !' or 'hi {name} !' }
 *
 *    // no argument, context & path only
 *    translate(context, 'foo.bar')
 *
 *    // list argument
 *    translate(context, 'foo.bar', ['kazupon'])
 *
 *    // named argument
 *    translate(context, 'foo.bar', { name: 'kazupon' })
 *
 *    // plural choice number
 *    translate(context, 'foo.bar', 2)
 *
 *    // plural choice number with name argument
 *    translate(context, 'foo.bar', { name: 'kazupon' }, 2)
 *
 *    // default message argument
 *    translate(context, 'foo.bar', 'this is default message')
 *
 *    // default message with named argument
 *    translate(context, 'foo.bar', { name: 'kazupon' }, 'Hello {name} !')
 *
 *    // use key as default message
 *    translate(context, 'hi {0} !', ['kazupon'], { default: true })
 *
 *    // locale option, override context.locale
 *    translate(context, 'foo.bar', { name: 'kazupon' }, { locale: 'ja' })
 *
 *    // suppress localize miss warning option, override context.missingWarn
 *    translate(context, 'foo.bar', { name: 'kazupon' }, { missingWarn: false })
 *
 *    // suppress localize fallback warning option, override context.fallbackWarn
 *    translate(context, 'foo.bar', { name: 'kazupon' }, { fallbackWarn: false })
 *
 *    // escape parameter option, override context.escapeParameter
 *    translate(context, 'foo.bar', { name: 'kazupon' }, { escapeParameter: true })
 */
/**
 * Translate Options
 *
 * @remarks
 * Options for Translation API
 *
 * @VueI18nGeneral
 */
export declare interface TranslateOptions<Locales = Locale> extends LocaleOptions<Locales> {
    /**
     * @remarks
     * List interpolation
     */
    list?: unknown[];
    /**
     * @remarks
     * Named interpolation
     */
    named?: NamedValue;
    /**
     * @remarks
     * Plulralzation choice number
     */
    plural?: number;
    /**
     * @remarks
     * Default message when is occurred translation missing
     */
    default?: string | boolean;
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails
     */
    missingWarn?: boolean;
    /**
     * @remarks
     * Whether do template interpolation on translation keys when your language lacks a translation for a key
     */
    fallbackWarn?: boolean;
    /**
     * @remarks
     * Whether to escape parameters for list or named interpolation values.
     * When enabled, this option:
     * - Escapes HTML special characters (`<`, `>`, `"`, `'`, `&`, `/`, `=`) in interpolation parameters
     * - Sanitizes the final translated HTML to prevent XSS attacks by:
     *   - Escaping dangerous characters in HTML attribute values
     *   - Neutralizing event handler attributes (onclick, onerror, etc.)
     *   - Disabling javascript: URLs in href, src, action, formaction, and style attributes
     *
     * @defaultValue false
     * @see [HTML Message - Using the escapeParameter option](https://vue-i18n.intlify.dev/guide/essentials/syntax.html#using-the-escapeparameter-option)
     */
    escapeParameter?: boolean;
    /**
     * @remarks
     * Whether the message has been resolved
     */
    resolvedMessage?: boolean;
}

export declare type TranslationsPaths<T extends object, K extends keyof T = keyof T> = K extends string ? JsonPaths<T[K]> : never;

export declare type UnionToIntersection<U> = (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void ? I : never;

export declare type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never] ? [] : [...UnionToTuple<Exclude<U, Last>>, Last];

/* Excluded from this release type: updateFallbackLocale */

/* Excluded from this release type: VERSION */

export { }
