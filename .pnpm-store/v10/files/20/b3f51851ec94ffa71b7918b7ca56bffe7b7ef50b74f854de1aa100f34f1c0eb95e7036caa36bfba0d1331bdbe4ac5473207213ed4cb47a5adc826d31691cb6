import type { App } from 'vue';
import { CompileError } from '@intlify/core-base';
import type { ComponentInternalInstance } from 'vue';
import type { ComputedRef } from 'vue';
import { DateTimeOptions } from '@intlify/core-base';
import { FallbackLocale } from '@intlify/core-base';
import type { FallbackLocales } from '@intlify/core-base';
import type { GeneratedLocale } from '@intlify/core-base';
import { GeneratedTypeConfig } from '@intlify/core-base';
import { InjectionKey } from 'vue';
import { DateTimeFormat as IntlDateTimeFormat } from '@intlify/core-base';
import { DateTimeFormats as IntlDateTimeFormats } from '@intlify/core-base';
import { FormatMatcher as IntlFormatMatcher } from '@intlify/core-base';
import { LocaleMatcher as IntlLocaleMatcher } from '@intlify/core-base';
import { NumberFormat as IntlNumberFormat } from '@intlify/core-base';
import { NumberFormats as IntlNumberFormats } from '@intlify/core-base';
import { IsEmptyObject } from '@intlify/core-base';
import { IsNever } from '@intlify/core-base';
import type { JsonPaths } from '@intlify/core-base';
import { LinkedModifiers } from '@intlify/core-base';
import { Locale } from '@intlify/core-base';
import type { LocaleMessage } from '@intlify/core-base';
import { LocaleMessageDictionary } from '@intlify/core-base';
import { LocaleMessages } from '@intlify/core-base';
import { LocaleMessageType } from '@intlify/core-base';
import { LocaleMessageValue } from '@intlify/core-base';
import type { LocaleParams } from '@intlify/core-base';
import { MessageCompiler } from '@intlify/core-base';
import { MessageCompilerContext } from '@intlify/core-base';
import { MessageContext } from '@intlify/core-base';
import { MessageFunction } from '@intlify/core-base';
import { MessageFunctions } from '@intlify/core-base';
import { MessageResolver } from '@intlify/core-base';
import { NamedValue } from '@intlify/core-base';
import { NumberOptions } from '@intlify/core-base';
import type { ObjectDirective } from 'vue';
import { Path } from '@intlify/core-base';
import { PathValue } from '@intlify/core-base';
import type { PickupFormatKeys } from '@intlify/core-base';
import { PickupFormatPathKeys } from '@intlify/core-base';
import { PickupKeys } from '@intlify/core-base';
import type { PickupLocales } from '@intlify/core-base';
import { PickupPaths } from '@intlify/core-base';
import { PluralizationRule } from '@intlify/core-base';
import type { PluralizationRules } from '@intlify/core-base';
import { PostTranslationHandler } from '@intlify/core-base';
import { RemovedIndexResources } from '@intlify/core-base';
import type { RemoveIndexSignature } from '@intlify/core-base';
import type { ResourceNode } from '@intlify/core-base';
import type { ResourcePath } from '@intlify/core-base';
import type { ResourceValue } from '@intlify/core-base';
import type { SchemaParams } from '@intlify/core-base';
import { TranslateOptions } from '@intlify/core-base';
import type { TranslationsPaths } from '@intlify/core-base';
import type { VNode } from 'vue';
import type { VNodeProps } from 'vue';
import type { WritableComputedRef } from 'vue';

/**
 * BaseFormat Props for Components that is offered Vue I18n
 *
 * @remarks
 * The interface definitions of the underlying props of components such as Translation, DatetimeFormat, and NumberFormat.
 *
 * @VueI18nComponent
 */
export declare interface BaseFormatProps {
    /**
     * @remarks
     * Used to wrap the content that is distribute in the slot. If omitted, the slot content is treated as Fragments.
     *
     * You can specify a string-based tag name, such as `p`, or the object for which the component is defined.
     */
    tag?: string | object;
    /**
     * @remarks
     * Specifies the locale to be used for the component.
     *
     * If specified, the global scope or the locale of the parent scope of the target component will not be overridden and the specified locale will be used.
     */
    locale?: Locale;
    /**
     * @remarks
     * Specifies the scope to be used in the target component.
     *
     * You can specify either `global` or `parent`.
     *
     * If `global` is specified, global scope is used, else then `parent` is specified, the scope of the parent of the target component is used.
     *
     * If the parent is a global scope, the global scope is used, if it's a local scope, the local scope is used.
     */
    scope?: ComponentI18nScope;
    /**
     * @remarks
     * A composer instance with an existing scope.
     *
     * This option takes precedence over the `scope` option.
     */
    i18n?: Composer;
}

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type Choice = number;
export { CompileError }

export declare type ComponentI18nScope = Exclude<I18nScope, 'local'>;

/**
 * Composer interfaces
 *
 * @remarks
 * This is the interface for being used for Vue 3 Composition API.
 *
 * @VueI18nComposition
 */
export declare interface Composer<Messages extends Record<string, any> = {}, DateTimeFormats extends Record<string, any> = {}, NumberFormats extends Record<string, any> = {}, OptionLocale = Locale, ResourceLocales = PickupLocales<NonNullable<Messages>> | PickupLocales<NonNullable<DateTimeFormats>> | PickupLocales<NonNullable<NumberFormats>>, Locales = Locale extends GeneratedLocale ? GeneratedLocale : OptionLocale extends Locale ? IsNever<ResourceLocales> extends true ? Locale : ResourceLocales : OptionLocale | ResourceLocales> extends ComposerCustom {
    /**
     * @remarks
     * Instance ID.
     */
    id: number;
    /**
     * @remarks
     * The current locale this Composer instance is using.
     *
     * If the locale contains a territory and a dialect, this locale contains an implicit fallback.
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     */
    locale: WritableComputedRef<Locales>;
    /**
     * @remarks
     * The current fallback locales this Composer instance is using.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    fallbackLocale: WritableComputedRef<FallbackLocales<Locales>>;
    /**
     * @remarks
     * Whether inherit the root level locale to the component localization locale.
     *
     * @VueI18nSee [Local Scope](../guide/essentials/scope#local-scope-2)
     */
    inheritLocale: boolean;
    /**
     * @remarks
     * The list of available locales in `messages` in lexical order.
     */
    readonly availableLocales: Locales[];
    /**
     * @remarks
     * The locale messages of localization.
     *
     * @VueI18nSee [Getting Started](../guide/essentials/started)
     */
    readonly messages: ComputedRef<{
        [K in keyof Messages]: Messages[K];
    }>;
    /**
     * @remarks
     * The datetime formats of localization.
     *
     * @VueI18nSee [Datetime Formatting](../guide/essentials/datetime)
     */
    readonly datetimeFormats: ComputedRef<{
        [K in keyof DateTimeFormats]: DateTimeFormats[K];
    }>;
    /**
     * @remarks
     * The number formats of localization.
     *
     * @VueI18nSee [Number Formatting](../guide/essentials/number)
     */
    readonly numberFormats: ComputedRef<{
        [K in keyof NumberFormats]: NumberFormats[K];
    }>;
    /**
     * @remarks
     * Custom Modifiers for linked messages.
     *
     * @VueI18nSee [Custom Modifiers](../guide/essentials/syntax#custom-modifiers)
     */
    readonly modifiers: LinkedModifiers<VueMessageType>;
    /**
     * @remarks
     * A set of rules for word pluralization
     *
     * @VueI18nSee [Custom Pluralization](../guide/essentials/pluralization#custom-pluralization)
     */
    readonly pluralRules: PluralizationRules;
    /**
     * @remarks
     * Whether this composer instance is global or not
     */
    readonly isGlobal: boolean;
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    missingWarn: boolean | RegExp;
    /**
     * @remarks
     * Whether suppress fall back warnings when localization fails.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    fallbackWarn: boolean | RegExp;
    /**
     * @remarks
     * Whether to fall back to root level (global scope) localization when localization fails.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    fallbackRoot: boolean;
    /**
     * @remarks
     * Whether suppress warnings when falling back to either `fallbackLocale` or root.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    fallbackFormat: boolean;
    /**
     * @remarks
     * Whether to allow the use locale messages of HTML formatting.
     *
     * If you set `false`, will check the locale messages on the Composer instance.
     *
     * If you are specified `true`, a warning will be output at console.
     *
     * @VueI18nSee [HTML Message](../guide/essentials/syntax#html-message)
     * @VueI18nSee [Change `warnHtmlInMessage` option default value](../guide/migration/breaking#change-warnhtmlinmessage-option-default-value)
     */
    warnHtmlMessage: boolean;
    /**
     * @remarks
     * Whether interpolation parameters are escaped before the message is translated.
     *
     * @VueI18nSee [HTML Message](../guide/essentials/syntax#html-message)
     */
    escapeParameter: boolean;
    /**
     * Locale message translation
     *
     * @remarks
     * About details functions, See the {@link ComposerTranslation}
     */
    t: ComposerTranslation<Messages, Locales, RemoveIndexSignature<{
        [K in keyof DefineLocaleMessage]: DefineLocaleMessage[K];
    }>>;
    /**
     * Resolve locale message translation
     *
     * @remarks
     * About details functions, See the {@link ComposerResolveLocaleMessageTranslation}
     */
    rt: ComposerResolveLocaleMessageTranslation<Locales>;
    /**
     * Datetime formatting
     *
     * @remarks
     * About details functions, See the {@link ComposerDateTimeFormatting}
     */
    d: ComposerDateTimeFormatting<DateTimeFormats, Locales, RemoveIndexSignature<{
        [K in keyof DefineDateTimeFormat]: DefineDateTimeFormat[K];
    }>>;
    /**
     * Number Formatting
     *
     * @remarks
     * About details functions, See the {@link ComposerNumberFormatting}
     */
    n: ComposerNumberFormatting<NumberFormats, Locales, RemoveIndexSignature<{
        [K in keyof DefineNumberFormat]: DefineNumberFormat[K];
    }>>;
    /**
     * Translation locale message exist
     *
     * @remarks
     * whether do exist locale message on Composer instance [messages](composition#messages).
     *
     * If you specified `locale`, check the locale messages of `locale`.
     *
     * @param key - A target locale message key
     * @param locale - A locale, it will be used over than global scope or local scope
     *
     * @returns If found locale message, `true`, else `false`, Note that `false` is returned even if the value present in the key is not translatable, yet if `translateExistCompatible` is set to `true`, it will return `true` if the key is available, even if the value is not translatable.
     */
    te<Str extends string, Key extends PickupKeys<Messages> = PickupKeys<Messages>>(key: Str | Key, locale?: Locales): boolean;
    /**
     * Locale messages getter
     *
     * @remarks
     * If [UseI18nScope](general#usei18nscope) `'local'` or Some [UseI18nOptions](composition#usei18noptions) are specified at `useI18n`, it’s translated in preferentially local scope locale messages than global scope locale messages.
     *
     * Based on the current `locale`, locale messages will be returned from Composer instance messages.
     *
     * If you change the `locale`, the locale messages returned will also correspond to the locale.
     *
     * If there are no locale messages for the given `key` in the composer instance messages, they will be returned with [fallbacking](../guide/essentials/fallback).
     *
     * @VueI18nWarning
     * You need to use `rt` for the locale message returned by `tm`. see the [rt](composition#rt-message) details.
     *
     * @example
     * template block:
     * ```html
     * <div class="container">
     *   <template v-for="content in tm('contents')">
     *     <h2>{{ rt(content.title) }}</h2>
     *     <p v-for="paragraph in content.paragraphs">
     *      {{ rt(paragraph) }}
     *     </p>
     *   </template>
     * </div>
     * ```
     * script block:
     * ```js
     * import { defineComponent } from 'vue
     * import { useI18n } from 'vue-i18n'
     *
     * export default defineComponent({
     *   setup() {
     *     const { rt, tm } = useI18n({
     *       messages: {
     *         en: {
     *           contents: [
     *             {
     *               title: 'Title1',
     *               // ...
     *               paragraphs: [
     *                 // ...
     *               ]
     *             }
     *           ]
     *         }
     *       }
     *       // ...
     *     })
     *     // ...
     *     return { ... , rt, tm }
     *   }
     * })
     * ```
     *
     * @param key - A target locale message key
     *
     * @return Locale messages
     */
    tm<Key extends string, ResourceKeys extends PickupKeys<Messages> = PickupKeys<Messages>, Locale extends PickupLocales<NonNullable<Messages>> = PickupLocales<NonNullable<Messages>>, Target = IsEmptyObject<Messages> extends false ? NonNullable<Messages>[Locale] : RemoveIndexSignature<{
        [K in keyof DefineLocaleMessage]: DefineLocaleMessage[K];
    }>, Return = ResourceKeys extends ResourcePath<Target> ? ResourceValue<Target, ResourceKeys> : Record<string, any>>(key: Key | ResourceKeys): Return;
    /**
     * Get locale message
     *
     * @remarks
     * get locale message from Composer instance [messages](composition#messages).
     *
     * @param locale - A target locale
     *
     * @typeParam MessageSchema - The locale message schema, default `never`
     *
     * @returns Locale messages
     */
    getLocaleMessage<MessageSchema extends LocaleMessage<VueMessageType> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<Messages>> = PickupLocales<NonNullable<Messages>>, Return = IsNever<MessageSchema> extends true ? IsEmptyObject<Messages> extends true ? RemoveIndexSignature<{
        [K in keyof DefineLocaleMessage]: DefineLocaleMessage[K];
    }> : NonNullable<Messages>[Locale] : MessageSchema>(locale: LocaleSchema | Locale): Return;
    /**
     * Set locale message
     *
     * @remarks
     * Set locale message to Composer instance [messages](composition#messages).
     *
     * @param locale - A target locale
     * @param message - A message
     *
     * @typeParam MessageSchema - The locale message schema, default `never`
     */
    setLocaleMessage<MessageSchema extends LocaleMessage<VueMessageType> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<Messages>> = PickupLocales<NonNullable<Messages>>, MessageType = IsNever<MessageSchema> extends true ? IsEmptyObject<Messages> extends true ? RemoveIndexSignature<{
        [K in keyof DefineLocaleMessage]: DefineLocaleMessage[K];
    }> : NonNullable<Messages>[Locale] : MessageSchema, Message extends MessageType = MessageType>(locale: LocaleSchema | Locale, message: Message): void;
    /**
     * Merge locale message
     *
     * @remarks
     * Merge locale message to Composer instance [messages](composition#messages).
     *
     * @param locale - A target locale
     * @param message - A message
     *
     * @typeParam MessageSchema - The locale message schema, default `never`
     */
    mergeLocaleMessage<MessageSchema extends LocaleMessage<VueMessageType> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<Messages>> = PickupLocales<NonNullable<Messages>>, Message = IsNever<MessageSchema> extends true ? Record<string, any> : MessageSchema>(locale: LocaleSchema | Locale, message: Message): void;
    /**
     * Get datetime format
     *
     * @remarks
     * get datetime format from Composer instance [datetimeFormats](composition#datetimeformats).
     *
     * @param locale - A target locale
     *
     * @typeParam DateTimeSchema - The datetime format schema, default `never`
     *
     * @returns Datetime format
     */
    getDateTimeFormat<DateTimeSchema extends Record<string, any> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<DateTimeFormats>> = PickupLocales<NonNullable<DateTimeFormats>>, Return = IsNever<DateTimeSchema> extends true ? IsEmptyObject<DateTimeFormats> extends true ? RemoveIndexSignature<{
        [K in keyof DefineDateTimeFormat]: DefineDateTimeFormat[K];
    }> : NonNullable<DateTimeFormats>[Locale] : DateTimeSchema>(locale: LocaleSchema | Locale): Return;
    /**
     * Set datetime format
     *
     * @remarks
     * Set datetime format to Composer instance [datetimeFormats](composition#datetimeformats).
     *
     * @param locale - A target locale
     * @param format - A target datetime format
     *
     * @typeParam DateTimeSchema - The datetime format schema, default `never`
     */
    setDateTimeFormat<DateTimeSchema extends Record<string, any> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<DateTimeFormats>> = PickupLocales<NonNullable<DateTimeFormats>>, FormatsType = IsNever<DateTimeSchema> extends true ? IsEmptyObject<DateTimeFormats> extends true ? RemoveIndexSignature<{
        [K in keyof DefineDateTimeFormat]: DefineDateTimeFormat[K];
    }> : NonNullable<DateTimeFormats>[Locale] : DateTimeSchema, Formats extends FormatsType = FormatsType>(locale: LocaleSchema | Locale, format: Formats): void;
    /**
     * Merge datetime format
     *
     * @remarks
     * Merge datetime format to Composer instance [datetimeFormats](composition#datetimeformats).
     *
     * @param locale - A target locale
     * @param format - A target datetime format
     *
     * @typeParam DateTimeSchema - The datetime format schema, default `never`
     */
    mergeDateTimeFormat<DateTimeSchema extends Record<string, any> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<DateTimeFormats>> = PickupLocales<NonNullable<DateTimeFormats>>, Formats = IsNever<DateTimeSchema> extends true ? Record<string, any> : DateTimeSchema>(locale: LocaleSchema | Locale, format: Formats): void;
    /**
     * Get number format
     *
     * @remarks
     * get number format from Composer instance [numberFormats](composition#numberFormats).
     *
     * @param locale - A target locale
     *
     * @typeParam NumberSchema - The number format schema, default `never`
     *
     * @returns Number format
     */
    getNumberFormat<NumberSchema extends Record<string, any> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<NumberFormats>> = PickupLocales<NonNullable<NumberFormats>>, Return = IsNever<NumberSchema> extends true ? IsEmptyObject<NumberFormats> extends true ? RemoveIndexSignature<{
        [K in keyof DefineNumberFormat]: DefineNumberFormat[K];
    }> : NonNullable<NumberFormats>[Locale] : NumberSchema>(locale: LocaleSchema | Locale): Return;
    /**
     * Set number format
     *
     * @remarks
     * Set number format to Composer instance [numberFormats](composition#numberFormats).
     *
     * @param locale - A target locale
     * @param format - A target number format
     *
     * @typeParam NumberSchema - The number format schema, default `never`
     */
    setNumberFormat<NumberSchema extends Record<string, any> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<NumberFormats>> = PickupLocales<NonNullable<NumberFormats>>, FormatsType = IsNever<NumberSchema> extends true ? IsEmptyObject<NumberFormats> extends true ? RemoveIndexSignature<{
        [K in keyof DefineNumberFormat]: DefineNumberFormat[K];
    }> : NonNullable<NumberFormats>[Locale] : NumberSchema, Formats extends FormatsType = FormatsType>(locale: LocaleSchema | Locale, format: Formats): void;
    /**
     * Merge number format
     *
     * @remarks
     * Merge number format to Composer instance [numberFormats](composition#numberFormats).
     *
     * @param locale - A target locale
     * @param format - A target number format
     *
     * @typeParam NumberSchema - The number format schema, default `never`
     */
    mergeNumberFormat<NumberSchema extends Record<string, any> = never, LocaleSchema extends string = string, Locale extends PickupLocales<NonNullable<NumberFormats>> = PickupLocales<NonNullable<NumberFormats>>, Formats = IsNever<NumberSchema> extends true ? Record<string, any> : NumberSchema>(locale: LocaleSchema | Locale, format: Formats): void;
    /**
     * Get post translation handler
     *
     * @returns {@link PostTranslationHandler}
     *
     * @VueI18nSee [missing](composition#posttranslation)
     */
    getPostTranslationHandler(): PostTranslationHandler<VueMessageType> | null;
    /**
     * Set post translation handler
     *
     * @param handler - A {@link PostTranslationHandler}
     *
     * @VueI18nSee [missing](composition#posttranslation)
     */
    setPostTranslationHandler(handler: PostTranslationHandler<VueMessageType> | null): void;
    /**
     * Get missing handler
     *
     * @returns {@link MissingHandler}
     *
     * @VueI18nSee [missing](composition#missing)
     */
    getMissingHandler(): MissingHandler | null;
    /**
     * Set missing handler
     *
     * @param handler - A {@link MissingHandler}
     *
     * @VueI18nSee [missing](composition#missing)
     */
    setMissingHandler(handler: MissingHandler | null): void;
}

/**
 * Composer additional options for `useI18n`
 *
 * @remarks
 * `ComposerAdditionalOptions` is extend for {@link ComposerOptions}, so you can specify these options.
 *
 * @VueI18nSee [useI18n](composition#usei18n)
 *
 * @VueI18nComposition
 */
export declare interface ComposerAdditionalOptions {
    useScope?: I18nScope;
}

/**
 * The type custom definition of Composer
 *
 * @remarks
 *
 * The interface that can extend Composer.
 *
 * The type defined by 3rd party (e.g. nuxt/i18n)
 *
 * @example
 * ```ts
 * // vue-i18n.d.ts (`.d.ts` file at your app)
 *
 * declare module 'vue-i18n' {
 *   interface ComposerCustom {
 *     localeCodes: string[]
 *   }
 * }
 * ```
 *
 * @VueI18nComposition
 */
export declare interface ComposerCustom {
}

/**
 * Datetime formatting functions
 *
 * @remarks
 * This is the interface for {@link Composer}
 *
 * @VueI18nComposition
 */
export declare interface ComposerDateTimeFormatting<DateTimeFormats extends Record<string, any> = {}, Locales = 'en-US', DefinedDateTimeFormat extends RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>, C = IsEmptyObject<DefinedDateTimeFormat> extends false ? PickupFormatPathKeys<{
    [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K];
}> : never, M = IsEmptyObject<DateTimeFormats> extends false ? PickupFormatKeys<DateTimeFormats> : never, ResourceKeys extends C | M = IsNever<C> extends false ? IsNever<M> extends false ? C | M : C : IsNever<M> extends false ? M : never> {
    /**
     * Datetime formatting
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [UseI18nScope](general#usei18nscope) `'local'` or Some [UseI18nOptions](composition#usei18noptions) are specified at `useI18n`, it’s translated in preferentially local scope datetime formats than global scope datetime formats.
     *
     * If not, then it’s formatted with global scope datetime formats.
     *
     * @param value - A value, timestamp number or `Date` instance or ISO 8601 string
     *
     * @returns Formatted value
     *
     * @VueI18nSee [Datetime formatting](../guide/essentials/datetime)
     */
    (value: number | Date | string): string;
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `d`. About details, see the [call signature](composition#value-number-date-string-string) details.
     *
     * In this overloaded `d`, format in datetime format for a key registered in datetime formats.
     *
     * @param value - A value, timestamp number or `Date` instance or ISO 8601 string
     * @param keyOrOptions - A key of datetime formats, or additional {@link DateTimeOptions | options} for datetime formatting
     *
     * @returns Formatted value
     */
    <Value extends number | Date | string = number, Key extends string = string, OptionsType extends Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Locales> = Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Locales>>(value: Value, keyOrOptions: OptionsType): IsPart<OptionsType> extends true ? Intl.DateTimeFormatPart[] : string;
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `d`. About details, see the [call signature](composition#value-number-date-string-string) details.
     *
     * In this overloaded `d`, format in datetime format for a key registered in datetime formats at target locale
     *
     * @param value - A value, timestamp number or `Date` instance or ISO 8601 string
     * @param keyOrOptions - A key of datetime formats, or additional {@link DateTimeOptions | options} for datetime formatting
     * @param locale - A locale, it will be used over than global scope or local scope.
     *
     * @returns Formatted value
     */
    <Value extends number | Date | string = number, Key extends string = string, OptionsType extends Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Locales> = Key | ResourceKeys | DateTimeOptions<Key | ResourceKeys, Locales>>(value: Value, keyOrOptions: OptionsType, locale: Locales): IsPart<OptionsType> extends true ? Intl.DateTimeFormatPart[] : string;
}

export declare type ComposerExtender = (composer: Composer) => Disposer | undefined;

/**
 * Number formatting functions
 *
 * @remarks
 * This is the interface for {@link Composer}
 *
 * @VueI18nComposition
 */
export declare interface ComposerNumberFormatting<NumberFormats extends Record<string, any> = {}, Locales = 'en-US', DefinedNumberFormat extends RemovedIndexResources<DefineNumberFormat> = RemovedIndexResources<DefineNumberFormat>, C = IsEmptyObject<DefinedNumberFormat> extends false ? PickupFormatPathKeys<{
    [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K];
}> : never, M = IsEmptyObject<NumberFormats> extends false ? PickupFormatKeys<NumberFormats> : never, ResourceKeys extends C | M = IsNever<C> extends false ? IsNever<M> extends false ? C | M : C : IsNever<M> extends false ? M : never> {
    /**
     * Number Formatting
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [UseI18nScope](general#usei18nscope) `'local'` or Some [UseI18nOptions](composition#usei18noptions) are specified at `useI18n`, it’s translated in preferentially local scope datetime formats than global scope datetime formats.
     *
     * If not, then it’s formatted with global scope number formats.
     *
     * @param value - A number value
     *
     * @returns Formatted value
     *
     * @VueI18nSee [Number formatting](../guide/essentials/number)
     */
    (value: number): string;
    /**
     * Number Formatting
     *
     * @remarks
     * Overloaded `n`. About details, see the [call signature](composition#value-number-string) details.
     *
     * In this overloaded `n`, format in number format for a key registered in number formats.
     *
     * @param value - A number value
     * @param keyOrOptions - A key of number formats, or additional {@link NumberOptions | options} for number formatting
     *
     * @returns Formatted value
     */
    <Key extends string = string, OptionsType extends Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Locales> = Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Locales>>(value: number, keyOrOptions: OptionsType): IsPart<OptionsType> extends true ? Intl.NumberFormatPart[] : string;
    /**
     * Number Formatting
     *
     * @remarks
     * Overloaded `n`. About details, see the [call signature](composition#value-number-string) details.
     *
     * In this overloaded `n`, format in number format for a key registered in number formats at target locale.
     *
     * @param value - A number value
     * @param keyOrOptions - A key of number formats, or additional {@link NumberOptions | options} for number formatting
     * @param locale - A locale, it will be used over than global scope or local scope.
     *
     * @returns Formatted value
     */
    <Key extends string = string, OptionsType extends Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Locales> = Key | ResourceKeys | NumberOptions<Key | ResourceKeys, Locales>>(value: number, keyOrOptions: OptionsType, locale: Locales): IsPart<OptionsType> extends true ? Intl.NumberFormatPart[] : string;
}

/**
 * Composer Options
 *
 * @remarks
 * This is options to create composer.
 *
 * @VueI18nComposition
 */
export declare interface ComposerOptions<Schema extends {
    message?: unknown;
    datetime?: unknown;
    number?: unknown;
} = {
    message: DefaultLocaleMessageSchema;
    datetime: DefaultDateTimeFormatSchema;
    number: DefaultNumberFormatSchema;
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
} ? M : DefaultLocaleMessageSchema, DateTimeSchema = Schema extends {
    datetime: infer D;
} ? D : DefaultDateTimeFormatSchema, NumberSchema = Schema extends {
    number: infer N;
} ? N : DefaultNumberFormatSchema, _Messages extends LocaleMessages<MessageSchema, MessagesLocales, VueMessageType> = LocaleMessages<MessageSchema, MessagesLocales, VueMessageType>, _DateTimeFormats extends IntlDateTimeFormats<DateTimeSchema, DateTimeFormatsLocales> = IntlDateTimeFormats<DateTimeSchema, DateTimeFormatsLocales>, _NumberFormats extends IntlNumberFormats<NumberSchema, NumberFormatsLocales> = IntlNumberFormats<NumberSchema, NumberFormatsLocales>> {
    /**
     * @remarks
     * The locale of localization.
     *
     * If the locale contains a territory and a dialect, this locale contains an implicit fallback.
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     *
     * @defaultValue `'en-US'`
     */
    locale?: Locale;
    /**
     * @remarks
     * The locale of fallback localization.
     *
     * For more complex fallback definitions see fallback.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue The default `'en-US'` for the `locale` if it's not specified, or it's `locale` value
     */
    fallbackLocale?: FallbackLocale;
    /**
     * @remarks
     * Whether inheritance the root level locale to the component localization locale.
     *
     * If `false`, regardless of the root level locale, localize for each component locale.
     *
     * @VueI18nSee [Local Scope](../guide/essentials/scope#local-scope-2)
     *
     * @defaultValue `true`
     */
    inheritLocale?: boolean;
    /**
     * @remarks
     * The locale messages of localization.
     *
     * @VueI18nSee [Getting Started](../guide/essentials/started)
     *
     * @defaultValue `{}`
     */
    messages?: {
        [K in keyof _Messages]: MessageSchema;
    };
    /**
     * @remarks
     * Allow use flat json messages or not
     *
     * @defaultValue `false`
     */
    flatJson?: boolean;
    /**
     * @remarks
     * The datetime formats of localization.
     *
     * @VueI18nSee [Datetime Formatting](../guide/essentials/datetime)
     *
     * @defaultValue `{}`
     */
    datetimeFormats?: {
        [K in keyof _DateTimeFormats]: DateTimeSchema;
    };
    /**
     * @remarks
     * The number formats of localization.
     *
     * @VueI18nSee [Number Formatting](../guide/essentials/number)
     *
     * @defaultValue `{}`
     */
    numberFormats?: {
        [K in keyof _NumberFormats]: NumberSchema;
    };
    /**
     * @remarks
     * Custom Modifiers for linked messages.
     *
     * @VueI18nSee [Custom Modifiers](../guide/essentials/syntax#custom-modifiers)
     */
    modifiers?: LinkedModifiers<VueMessageType>;
    /**
     * @remarks
     * A set of rules for word pluralization
     *
     * @VueI18nSee [Custom Pluralization](../guide/essentials/pluralization#custom-pluralization)
     *
     * @defaultValue `{}`
     */
    pluralRules?: PluralizationRules;
    /**
     * @remarks
     * A handler for localization missing.
     *
     * The handler gets called with the localization target locale, localization path key, the Vue instance and values.
     *
     * If missing handler is assigned, and occurred localization missing, it's not warned.
     *
     * @defaultValue `null`
     */
    missing?: MissingHandler;
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails.
     *
     * If `false`, suppress localization fail warnings.
     *
     * If you use regular expression, you can suppress localization fail warnings that it match with translation key (e.g. `t`).
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `true`
     */
    missingWarn?: boolean | RegExp;
    /**
     * @remarks
     * Whether suppress warnings when falling back to either `fallbackLocale` or root.
     *
     * If `false`, suppress fall back warnings.
     *
     * If you use regular expression, you can suppress fallback warnings that it match with translation key (e.g. `t`).
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `true`
     */
    fallbackWarn?: boolean | RegExp;
    /**
     * @remarks
     * In the component localization, whether to fallback to root level (global scope) localization when localization fails.
     *
     * If `false`, it's not fallback to root.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `true`
     */
    fallbackRoot?: boolean;
    /**
     * @remarks
     * Whether do template interpolation on translation keys when your language lacks a translation for a key.
     *
     * If `true`, skip writing templates for your "base" language; the keys are your templates.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `false`
     */
    fallbackFormat?: boolean;
    /**
     * @remarks
     * A handler for post processing of translation.
     *
     * The handler gets after being called with the `t`.
     *
     * This handler is useful if you want to filter on translated text such as space trimming.
     *
     * @defaultValue `null`
     */
    postTranslation?: PostTranslationHandler<VueMessageType>;
    /**
     * @remarks
     * Whether to allow the use locale messages of HTML formatting.
     *
     * See the warnHtmlMessage property.
     *
     * @VueI18nSee [HTML Message](../guide/essentials/syntax#html-message)
     * @VueI18nSee [Change `warnHtmlInMessage` option default value](../guide/migration/breaking#change-warnhtmlinmessage-option-default-value)
     *
     * @defaultValue `'off'`
     */
    warnHtmlMessage?: boolean;
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
     * This is useful when translation output is used in `v-html` and the translation resource contains html markup (e.g. <b> around a user provided value).
     *
     * This usage pattern mostly occurs when passing precomputed text strings into UI components.
     *
     * Setting `escapeParameter` as true should not break existing functionality but provides a safeguard against a subtle type of XSS attack vectors.
     *
     * @VueI18nSee [HTML Message - Using the escapeParameter option](../guide/essentials/syntax#using-the-escapeparameter-option)
     *
     * @defaultValue `false`
     */
    escapeParameter?: boolean;
    /**
     * @remarks
     * A message resolver to resolve [`messages`](composition#messages).
     *
     * If not specified, the vue-i18n internal message resolver will be used by default.
     *
     * You need to implement a message resolver yourself that supports the following requirements:
     *
     * - Resolve the message using the locale message of [`locale`](composition#locale) passed as the first argument of the message resolver, and the path passed as the second argument.
     *
     * - If the message could not be resolved, you need to return `null`.
     *
     * - If you will be returned `null`, the message resolver will also be called on fallback if [`fallbackLocale`](composition#fallbacklocale-2) is enabled, so the message will need to be resolved as well.
     *
     * The message resolver is called indirectly by the following APIs:
     *
     * - [`t`](composition#t-key)
     *
     * - [`te`](composition#te-key-locale)
     *
     * - [`tm`](composition#tm-key)
     *
     * - [Translation component](component#translation)
     *
     * @example
     * Here is an example of how to set it up using your `createI18n`:
     * ```js
     * import { createI18n } from 'vue-i18n'
     *
     * // your message resolver
     * function messageResolver(obj, path) {
     *   // simple message resolving!
     *   const msg = obj[path]
     *   return msg != null ? msg : null
     * }
     *
     * // call with I18n option
     * const i18n = createI18n({
     *   legacy: false,
     *   locale: 'ja',
     *   messageResolver, // set your message resolver
     *   messages: {
     *     en: { ... },
     *     ja: { ... }
     *   }
     * })
     *
     * // the below your something to do ...
     * // ...
     * ```
     *
     * @VueI18nTip
     * :new: v9.2+
     *
     * @VueI18nWarning
     * If you use the message resolver, the [`flatJson`](composition#flatjson) setting will be ignored. That is, you need to resolve the flat JSON by yourself.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `undefined`
     */
    messageResolver?: MessageResolver;
    /**
     * @remarks
     * A compiler for custom message format.
     *
     * If not specified, the vue-i18n default message compiler will be used.
     *
     * You will need to implement your own message compiler that returns Message Functions
     *
     * @example
     * Here is an example of how to custom message compiler with `intl-messageformat`
     *
     * ```js
     * import { createI18n } from 'vue-i18n'
     * import IntlMessageFormat from 'intl-messageformat'
     *
     * function messageCompiler(message, { locale, key, onError }) {
     *   if (typeof message === 'string') {
     *     // You can tune your message compiler performance more with your cache strategy or also memoization at here
     *     const formatter = new IntlMessageFormat(message, locale)
     *     return ctx => formatter.format(ctx.values)
     *   } else {
     *     // If you would like to support it for AST,
     *     // You need to transform locale mesages such as `json`, `yaml`, etc. with the bundle plugin.
     *     onError && onError(new Error('not support for AST'))
     *     return () => key // return default with `key`
     *   }
     * }
     *
     * // call with I18n option
     * const i18n = createI18n({
     *   legacy: false,
     *   locale: 'ja',
     *   messageCompiler, // set your message compiler
     *   messages: {
     *     en: {
     *       hello: 'hello world!',
     *       greeting: 'hi, {name}!',
     *       // ICU Message format
     *       photo: `You have {numPhotos, plural,
     *         =0 {no photos.}
     *         =1 {one photo.}
     *         other {# photos.}
     *       }`
     *     },
     *   }
     * })
     *
     * // the below your something to do ...
     * // ...
     * ```
     *
     * @VueI18nTip
     * :new: v9.3+
     *
     * @VueI18nWarning
     * The Custom Message Format is an experimental feature. It may receive breaking changes or be removed in the future.
     *
     * @VueI18nSee [Custom Message Format](../guide/advanced/format)
     *
     * @defaultValue `undefined`
     */
    messageCompiler?: MessageCompiler;
}

/**
 * Resolve locale message translation functions
 *
 * @remarks
 * This is the interface for {@link Composer}
 *
 * @VueI18nComposition
 */
export declare interface ComposerResolveLocaleMessageTranslation<Locales = 'en-US'> {
    /**
     * Resolve locale message translation
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [UseI18nScope](general#usei18nscope) `'local'` or Some [UseI18nOptions](composition#usei18noptions) are specified at `useI18n`, it’s translated in preferentially local scope locale messages than global scope locale messages.
     *
     * If not, then it’s translated with global scope locale messages.
     *
     * @VueI18nTip
     * The use-case for `rt` is for programmatic locale messages translation with using `tm`, `v-for`, javascript `for` statement.
     *
     * @VueI18nWarning
     * `rt` differs from `t` in that it processes the locale message directly, not the key of the locale message. There is no internal fallback with `rt`. You need to understand and use the structure of the locale messge returned by `tm`.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `tm`.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     */
    (message: MessageFunction<VueMessageType> | VueMessageType): string;
    /**
     * Resolve locale message translation for plurals
     *
     * @remarks
     * Overloaded `rt`. About details, see the [call signature](composition#message-messagefunction-message-message-string) details.
     *
     * In this overloaded `rt`, return a pluralized translation message.
     *
     * @VueI18nTip
     * The use-case for `rt` is for programmatic locale messages translation with using `tm`, `v-for`, javascript `for` statement.
     *
     * @VueI18nWarning
     * `rt` differs from `t` in that it processes the locale message directly, not the key of the locale message. There is no internal fallback with `rt`. You need to understand and use the structure of the locale messge returned by `tm`.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `tm`.
     * @param plural - Which plural string to get. 1 returns the first one.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     */
    (message: MessageFunction<VueMessageType> | VueMessageType, plural: number, options?: TranslateOptions<Locales>): string;
    /**
     * Resolve locale message translation for list interpolations
     *
     * @remarks
     * Overloaded `rt`. About details, see the [call signature](composition#message-messagefunction-message-message-string) details.
     *
     * In this overloaded `rt`, return a pluralized translation message.
     *
     * @VueI18nTip
     * The use-case for `rt` is for programmatic locale messages translation with using `tm`, `v-for`, javascript `for` statement.
     *
     * @VueI18nWarning
     * `rt` differs from `t` in that it processes the locale message directly, not the key of the locale message. There is no internal fallback with `rt`. You need to understand and use the structure of the locale messge returned by `tm`.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `tm`.
     * @param list - A values of list interpolation.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    (message: MessageFunction<VueMessageType> | VueMessageType, list: unknown[], options?: TranslateOptions<Locales>): string;
    /**
     * Resolve locale message translation for named interpolations
     *
     * @remarks
     * Overloaded `rt`. About details, see the [call signature](composition#message-messagefunction-message-message-string) details.
     *
     * In this overloaded `rt`, for each placeholder x, the locale messages should contain a `{x}` token.
     *
     * @VueI18nTip
     * The use-case for `rt` is for programmatic locale messages translation with using `tm`, `v-for`, javascript `for` statement.
     *
     * @VueI18nWarning
     * `rt` differs from `t` in that it processes the locale message directly, not the key of the locale message. There is no internal fallback with `rt`. You need to understand and use the structure of the locale messge returned by `tm`.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `tm`.
     * @param named - A values of named interpolation.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    (message: MessageFunction<VueMessageType> | VueMessageType, named: NamedValue, options?: TranslateOptions<Locales>): string;
}

/**
 * Locale message translation functions
 *
 * @remarks
 * This is the interface for {@link Composer}
 *
 * @VueI18nComposition
 */
export declare interface ComposerTranslation<Messages extends Record<string, any> = {}, Locales = 'en-US', DefinedLocaleMessage extends RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>, C = IsEmptyObject<DefinedLocaleMessage> extends false ? JsonPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, M = IsEmptyObject<Messages> extends false ? TranslationsPaths<Messages> : never, ResourceKeys extends C | M = IsNever<C> extends false ? IsNever<M> extends false ? C | M : C : IsNever<M> extends false ? M : never> {
    /**
     * Locale message translation
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [UseI18nScope](general#usei18nscope) `'local'` or Some [UseI18nOptions](composition#usei18noptions) are specified at `useI18n`, it’s translated in preferentially local scope locale messages than global scope locale messages.
     *
     * If not, then it’s translated with global scope locale messages.
     *
     * @param key - A target locale message key
     *
     * @returns Translated message
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     */
    <Key extends string>(key: Key | ResourceKeys | number): string;
    /**
     * Locale message translation for plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, return a pluralized translation message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * @param key - A target locale message key
     * @param plural - Which plural string to get. 1 returns the first one.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     */
    <Key extends string>(key: Key | ResourceKeys | number, plural: number): string;
    /**
     * Locale message translation for plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, return a pluralized translation message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param plural - Which plural string to get. 1 returns the first one.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     */
    <Key extends string>(key: Key | ResourceKeys | number, plural: number, options: TranslateOptions<Locales>): string;
    /**
     * Locale message translation for missing default message
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, if no translation was found, return a default message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * @param key - A target locale message key
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns Translated message
     */
    <Key extends string>(key: Key | ResourceKeys | number, defaultMsg: string): string;
    /**
     * Locale message translation for missing default message
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, if no translation was found, return a default message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param defaultMsg - A default message to return if no translation was found
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     */
    <Key extends string>(key: Key | ResourceKeys | number, defaultMsg: string, options: TranslateOptions<Locales>): string;
    /**
     * Locale message translation for list interpolations
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, list: unknown[]): string;
    /**
     * Locale message translation for list interpolations and plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list, and return a pluralized translation message.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param plural - Which plural string to get. 1 returns the first one.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, list: unknown[], plural: number): string;
    /**
     * Locale message translation for list interpolations and missing default message
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list, and if no translation was found, return a default message.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, list: unknown[], defaultMsg: string): string;
    /**
     * Locale message translation for list interpolations
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, list: unknown[], options: TranslateOptions<Locales>): string;
    /**
     * Locale message translation for named interpolations
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, named: NamedValue): string;
    /**
     * Locale message translation for named interpolations and plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token, and return a pluralized translation message.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param plural - Which plural string to get. 1 returns the first one.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, named: NamedValue, plural: number): string;
    /**
     * Locale message translation for named interpolations and plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token, and if no translation was found, return a default message.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, named: NamedValue, defaultMsg: string): string;
    /**
     * Locale message translation for named interpolations
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](composition#key-key-resourcekeys-number-string) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys | number, named: NamedValue, options: TranslateOptions<Locales>): string;
}

export declare function createI18n<Legacy extends boolean = true, Options extends I18nOptions = I18nOptions, Messages extends Record<string, unknown> = Options['messages'] extends Record<string, unknown> ? Options['messages'] : {}, DateTimeFormats extends Record<string, unknown> = Options['datetimeFormats'] extends Record<string, unknown> ? Options['datetimeFormats'] : {}, NumberFormats extends Record<string, unknown> = Options['numberFormats'] extends Record<string, unknown> ? Options['numberFormats'] : {}, OptionLocale = Options['locale'] extends string ? Options['locale'] : Locale>(options: Options): (typeof options)['legacy'] extends true ? I18n<Messages, DateTimeFormats, NumberFormats, OptionLocale, true> : (typeof options)['legacy'] extends false ? I18n<Messages, DateTimeFormats, NumberFormats, OptionLocale, false> : I18n<Messages, DateTimeFormats, NumberFormats, OptionLocale, Legacy>;

/**
 * Vue I18n factory
 *
 * @param options - An options, see the {@link I18nOptions}
 *
 * @typeParam Schema - The i18n resources (messages, datetimeFormats, numberFormats) schema, default {@link LocaleMessage}
 * @typeParam Locales - The locales of i18n resource schema, default `en-US`
 * @typeParam Legacy - Whether legacy mode is enabled or disabled, default `true`
 *
 * @returns {@link I18n} instance
 *
 * @remarks
 * If you use Legacy API mode, you need to specify {@link VueI18nOptions} and `legacy: true` option.
 *
 * If you use composition API mode, you need to specify {@link ComposerOptions}.
 *
 * @VueI18nSee [Getting Started](../guide/essentials/started)
 * @VueI18nSee [Composition API](../guide/advanced/composition)
 *
 * @example
 * case: for Legacy API
 * ```js
 * import { createApp } from 'vue'
 * import { createI18n } from 'vue-i18n'
 *
 * // call with I18n option
 * const i18n = createI18n({
 *   locale: 'ja',
 *   messages: {
 *     en: { ... },
 *     ja: { ... }
 *   }
 * })
 *
 * const App = {
 *   // ...
 * }
 *
 * const app = createApp(App)
 *
 * // install!
 * app.use(i18n)
 * app.mount('#app')
 * ```
 *
 * @example
 * case: for composition API
 * ```js
 * import { createApp } from 'vue'
 * import { createI18n, useI18n } from 'vue-i18n'
 *
 * // call with I18n option
 * const i18n = createI18n({
 *   legacy: false, // you must specify 'legacy: false' option
 *   locale: 'ja',
 *   messages: {
 *     en: { ... },
 *     ja: { ... }
 *   }
 * })
 *
 * const App = {
 *   setup() {
 *     // ...
 *     const { t } = useI18n({ ... })
 *     return { ... , t }
 *   }
 * }
 *
 * const app = createApp(App)
 *
 * // install!
 * app.use(i18n)
 * app.mount('#app')
 * ```
 *
 * @VueI18nGeneral
 */
export declare function createI18n<Schema extends object = DefaultLocaleMessageSchema, Locales extends string | object = 'en-US', Legacy extends boolean = true, Options extends I18nOptions<SchemaParams<Schema, VueMessageType>, LocaleParams<Locales>> = I18nOptions<SchemaParams<Schema, VueMessageType>, LocaleParams<Locales>>, Messages extends Record<string, unknown> = NonNullable<Options['messages']> extends Record<string, unknown> ? NonNullable<Options['messages']> : {}, DateTimeFormats extends Record<string, unknown> = NonNullable<Options['datetimeFormats']> extends Record<string, unknown> ? NonNullable<Options['datetimeFormats']> : {}, NumberFormats extends Record<string, unknown> = NonNullable<Options['numberFormats']> extends Record<string, unknown> ? NonNullable<Options['numberFormats']> : {}, OptionLocale = Options['locale'] extends string ? Options['locale'] : Locale>(options: Options): (typeof options)['legacy'] extends true ? I18n<Messages, DateTimeFormats, NumberFormats, OptionLocale, true> : (typeof options)['legacy'] extends false ? I18n<Messages, DateTimeFormats, NumberFormats, OptionLocale, false> : I18n<Messages, DateTimeFormats, NumberFormats, OptionLocale, Legacy>;

export declare interface CustomBlock<Message = VueMessageType> {
    locale: Locale;
    resource: LocaleMessages<Message>;
}

export declare type CustomBlocks<Message = VueMessageType> = Array<CustomBlock<Message>>;

/**
 * Datetime Format Component
 *
 * @remarks
 * See the following items for property about details
 *
 * @VueI18nSee [FormattableProps](component#formattableprops)
 * @VueI18nSee [BaseFormatProps](component#baseformatprops)
 * @VueI18nSee [Custom Formatting](../guide/essentials/datetime#custom-formatting)
 *
 * @VueI18nDanger
 * Not supported IE, due to no support `Intl.DateTimeFormat#formatToParts` in [IE](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts)
 *
 * If you want to use it, you need to use [polyfill](https://github.com/formatjs/formatjs/tree/main/packages/intl-datetimeformat)
 *
 * @VueI18nComponent
 */
export declare const DatetimeFormat: {
    new (): {
        $props: VNodeProps & DatetimeFormatProps & BaseFormatProps;
    };
};

/**
 * DatetimeFormat Component Props
 *
 * @VueI18nComponent
 */
export declare type DatetimeFormatProps = FormattableProps<number | Date, Intl.DateTimeFormatOptions>;

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type DateTimeFormatResult = string;
export { DateTimeOptions }

export declare type DefaultDateTimeFormatSchema<Schema = RemoveIndexSignature<{
    [K in keyof DefineDateTimeFormat]: DefineDateTimeFormat[K];
}>> = IsEmptyObject<Schema> extends true ? IntlDateTimeFormat : Schema;

export declare type DefaultLocaleMessageSchema<Schema = RemoveIndexSignature<{
    [K in keyof DefineLocaleMessage]: DefineLocaleMessage[K];
}>> = IsEmptyObject<Schema> extends true ? LocaleMessage<VueMessageType> : Schema;

export declare type DefaultNumberFormatSchema<Schema = RemoveIndexSignature<{
    [K in keyof DefineNumberFormat]: DefineNumberFormat[K];
}>> = IsEmptyObject<Schema> extends true ? IntlNumberFormat : Schema;

/**
 * The type definition of datetime format
 *
 * @remarks
 * The typealias is used to strictly define the type of the Datetime format.
 *
 * The type defined by this can be used in the global scope.
 *
 * @example
 * ```ts
 * // type.d.ts (`.d.ts` file at your app)
 * import { DefineDateTimeFormat } from 'vue-i18n'
 *
 * declare module 'vue-i18n' {
 *   export interface DefineDateTimeFormat {
 *     short: {
 *       hour: 'numeric'
 *       timezone: string
 *     }
 *   }
 * }
 * ```
 *
 * @VueI18nGeneral
 */
export declare interface DefineDateTimeFormat extends IntlDateTimeFormat {
}

/**
 * The type definition of Locale Message
 *
 * @remarks
 * The typealias is used to strictly define the type of the Locale message.
 *
 * The type defined by this can be used in the global scope.
 *
 * @example
 * ```ts
 * // type.d.ts (`.d.ts` file at your app)
 * import { DefineLocaleMessage } from 'vue-i18n'
 *
 * declare module 'vue-i18n' {
 *   export interface DefineLocaleMessage {
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
export declare interface DefineLocaleMessage extends LocaleMessage<VueMessageType> {
}

/**
 * The type definition of number format
 *
 * @remarks
 * The typealias is used to strictly define the type of the Number format.
 *
 * The type defined by this can be used in the global scope.
 *
 * @example
 * ```ts
 * // type.d.ts (`.d.ts` file at your app)
 * import { DefineNumberFormat } from 'vue-i18n'
 *
 * declare module 'vue-i18n' {
 *   export interface DefineNumberFormat {
 *     currency: {
 *       style: 'currency'
 *       currencyDisplay: 'symbol'
 *       currency: string
 *     }
 *   }
 * }
 * ```
 *
 * @VueI18nGeneral
 */
export declare interface DefineNumberFormat extends IntlNumberFormat {
}

export declare type Disposer = () => void;

/**
 * Exported global composer instance
 *
 * @remarks
 * This interface is the [global composer](general#global) that is provided interface that is injected into each component with `app.config.globalProperties`.
 *
 * @VueI18nGeneral
 */
export declare interface ExportedGlobalComposer {
    /**
     * Locale
     *
     * @remarks
     * This property is proxy-like property for `Composer#locale`. About details, see the [Composer#locale](composition#locale)
     */
    locale: Locale;
    /**
     * Fallback locale
     *
     * @remarks
     * This property is proxy-like property for `Composer#fallbackLocale`. About details, see the [Composer#fallbackLocale](composition#fallbacklocale)
     */
    fallbackLocale: FallbackLocale;
    /**
     * Available locales
     *
     * @remarks
     * This property is proxy-like property for `Composer#availableLocales`. About details, see the [Composer#availableLocales](composition#availablelocales)
     */
    readonly availableLocales: Locale[];
}
export { FallbackLocale }

/**
 * Formattable Props
 *
 * @remarks
 * The props used in DatetimeFormat, or NumberFormat component
 *
 * @VueI18nComponent
 */
export declare interface FormattableProps<Value, Format> extends BaseFormatProps {
    /**
     * @remarks
     * The value specified for the target component
     */
    value: Value;
    /**
     * @remarks
     * The format to use in the target component.
     *
     * Specify the format key string or the format as defined by the Intl API in ECMA 402.
     */
    format?: string | Format;
}

/**
 * Narrowed i18n instance type based on `GeneratedTypeConfig['legacy']`
 *
 * - `never` (unset) resolves to `VueI18n | ExportedGlobalComposer`
 * - `true` resolves to `VueI18n`
 * - `false` resolves to `ExportedGlobalComposer`
 */
declare type GeneratedInstanceType = GeneratedTypeConfig extends Record<'legacy', infer Legacy> ? Legacy : never;
export { GeneratedTypeConfig }

/**
 * I18n instance
 *
 * @remarks
 * The instance required for installation as the Vue plugin
 *
 * @VueI18nGeneral
 */
export declare interface I18n<Messages extends Record<string, unknown> = {}, DateTimeFormats extends Record<string, unknown> = {}, NumberFormats extends Record<string, unknown> = {}, OptionLocale = Locale, Legacy = boolean> {
    /**
     * Vue I18n API mode
     *
     * @remarks
     * If you specified `legacy: true` option in `createI18n`, return `legacy`, else `composition`
     *
     * @deprecated will be removed at vue-i18n v12
     *
     * @defaultValue `'legacy'`
     */
    readonly mode: I18nMode;
    /**
     * The property accessible to the global Composer instance or VueI18n instance
     *
     * @remarks
     * If the [I18n#mode](general#mode) is `'legacy'`, then you can access to a global {@link VueI18n} instance, else then [I18n#mode](general#mode) is `'composition' `, you can access to the global {@link Composer} instance.
     *
     * An instance of this property is **global scope***.
     */
    readonly global: Legacy extends true ? VueI18n<Messages, DateTimeFormats, NumberFormats, OptionLocale> : Legacy extends false ? Composer<Messages, DateTimeFormats, NumberFormats, OptionLocale> : unknown;
    /**
     * Install entry point
     *
     * @param app - A target Vue app instance
     * @param options - An install options
     */
    install(app: App, ...options: unknown[]): void;
    /**
     * Release global scope resource
     */
    dispose(): void;
}

/**
 * I18n Additional Options
 *
 * @remarks
 * Specific options for {@link createI18n}
 *
 * @VueI18nGeneral
 */
export declare interface I18nAdditionalOptions {
    /**
     * Whether vue-i18n Legacy API mode use on your Vue App
     *
     * @remarks
     * The default is to use the Legacy API mode. If you want to use the Composition API mode, you need to set it to `false`.
     *
     * @deprecated will be removed at vue-i18n v12
     *
     * @VueI18nSee [Composition API](../guide/advanced/composition)
     *
     * @defaultValue `true`
     */
    legacy?: boolean;
    /**
     * Whether to inject global properties & functions into for each component.
     *
     * @remarks
     * If set to `true`, then properties and methods prefixed with `$` are injected into Vue Component.
     *
     * @VueI18nSee [Implicit with injected properties and functions](../guide/advanced/composition#implicit-with-injected-properties-and-functions)
     * @VueI18nSee [ComponentCustomProperties](injection#componentcustomproperties)
     *
     * @defaultValue `true`
     */
    globalInjection?: boolean;
}

export declare const I18nD: new () => {
    $props: VNodeProps & DatetimeFormatProps & BaseFormatProps;
};

/**
 * Injection key for {@link useI18n}
 *
 * @remarks
 * The global injection key for I18n instances with `useI18n`. this injection key is used in Web Components.
 * Specify the i18n instance created by {@link createI18n} together with `provide` function.
 *
 * @VueI18nGeneral
 */
export declare const I18nInjectionKey: InjectionKey<I18n> | string;

/**
 * Vue I18n API mode
 *
 * @deprecated will be removed at vue-i18n v12
 *
 * @VueI18nSee [I18n#mode](general#mode)
 *
 * @VueI18nGeneral
 */
export declare type I18nMode = 'legacy' | 'composition';

export declare const I18nN: new () => {
    $props: VNodeProps & NumberFormatProps & BaseFormatProps;
};

/**
 * I18n Options for `createI18n`
 *
 * @remarks
 * `I18nOptions` is inherited {@link I18nAdditionalOptions}, {@link ComposerOptions} and {@link VueI18nOptions},
 * so you can specify these options.
 *
 * @VueI18nGeneral
 */
export declare type I18nOptions<Schema extends {
    message?: unknown;
    datetime?: unknown;
    number?: unknown;
} = {
    message: DefaultLocaleMessageSchema;
    datetime: DefaultDateTimeFormatSchema;
    number: DefaultNumberFormatSchema;
}, Locales extends {
    messages: unknown;
    datetimeFormats: unknown;
    numberFormats: unknown;
} | string = Locale, Options extends ComposerOptions<Schema, Locales> | VueI18nOptions<Schema, Locales> = ComposerOptions<Schema, Locales> | VueI18nOptions<Schema, Locales>> = I18nAdditionalOptions & Options;

/**
 * Vue I18n plugin options
 *
 * @remarks
 * An options specified when installing Vue I18n as Vue plugin with using `app.use`.
 *
 * @VueI18nGeneral
 */
export declare interface I18nPluginOptions {
    /**
     * Whether to globally install the components that is offered by Vue I18n
     *
     * @remarks
     * If this option is enabled, the components will be installed globally at `app.use` time.
     *
     * If you want to install manually in the `import` syntax, you can set it to `false` to install when needed.
     *
     * @defaultValue `true`
     */
    globalInstall?: boolean;
}

/**
 * I18n Scope
 *
 * @VueI18nSee [ComposerAdditionalOptions#useScope](composition#usescope)
 * @VueI18nSee [useI18n](composition#usei18n)
 *
 * @VueI18nGeneral
 */
export declare type I18nScope = 'local' | 'parent' | 'global';

export declare const I18nT: new () => {
    $props: VNodeProps & TranslationProps;
};
export { IntlDateTimeFormat }
export { IntlDateTimeFormats }
export { IntlFormatMatcher }
export { IntlLocaleMatcher }
export { IntlNumberFormat }
export { IntlNumberFormats }
export { IsEmptyObject }
export { IsNever }

declare type IsPart<O> = O extends {
    part: infer P;
} ? P : false;
export { LinkedModifiers }
export { Locale }
export { LocaleMessageDictionary }

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type LocaleMessageObject<Message = string> = LocaleMessageDictionary<Message>;
export { LocaleMessages }
export { LocaleMessageType }
export { LocaleMessageValue }
export { MessageCompiler }
export { MessageCompilerContext }
export { MessageContext }
export { MessageFunction }
export { MessageFunctions }
export { MessageResolver }

/** @VueI18nComposition */
export declare type MissingHandler = (locale: Locale, key: Path, instance?: ComponentInternalInstance, type?: string) => string | void;
export { NamedValue }

/**
 * Number Format Component
 *
 * @remarks
 * See the following items for property about details
 *
 * @VueI18nSee [FormattableProps](component#formattableprops)
 * @VueI18nSee [BaseFormatProps](component#baseformatprops)
 * @VueI18nSee [Custom Formatting](../guide/essentials/number#custom-formatting)
 *
 * @VueI18nDanger
 * Not supported IE, due to no support `Intl.NumberFormat#formatToParts` in [IE](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts)
 *
 * If you want to use it, you need to use [polyfill](https://github.com/formatjs/formatjs/tree/main/packages/intl-numberformat)
 *
 * @VueI18nComponent
 */
export declare const NumberFormat: {
    new (): {
        $props: VNodeProps & NumberFormatProps & BaseFormatProps;
    };
};

/**
 * NumberFormat Component Props
 *
 * @VueI18nComponent
 */
export declare type NumberFormatProps = FormattableProps<number, Intl.NumberFormatOptions>;

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type NumberFormatResult = string;
export { NumberOptions }
export { Path }
export { PathValue }
export { PickupFormatPathKeys }
export { PickupKeys }
export { PickupPaths }
export { PluralizationRule }

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type PluralizationRulesMap = {
    [locale: string]: PluralizationRule;
};
export { PostTranslationHandler }
export { RemovedIndexResources }
export { TranslateOptions }

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type TranslateResult = string;

/**
 * Translation Component
 *
 * @remarks
 * See the following items for property about details
 *
 * @VueI18nSee [TranslationProps](component#translationprops)
 * @VueI18nSee [BaseFormatProps](component#baseformatprops)
 * @VueI18nSee [Component Interpolation](../guide/advanced/component)
 *
 * @example
 * ```html
 * <div id="app">
 *   <!-- ... -->
 *   <i18n keypath="term" tag="label" for="tos">
 *     <a :href="url" target="_blank">{{ $t('tos') }}</a>
 *   </i18n>
 *   <!-- ... -->
 * </div>
 * ```
 * ```js
 * import { createApp } from 'vue'
 * import { createI18n } from 'vue-i18n'
 *
 * const messages = {
 *   en: {
 *     tos: 'Term of Service',
 *     term: 'I accept xxx {0}.'
 *   },
 *   ja: {
 *     tos: '利用規約',
 *     term: '私は xxx の{0}に同意します。'
 *   }
 * }
 *
 * const i18n = createI18n({
 *   locale: 'en',
 *   messages
 * })
 *
 * const app = createApp({
 *   data: {
 *     url: '/term'
 *   }
 * }).use(i18n).mount('#app')
 * ```
 *
 * @VueI18nComponent
 */
export declare const Translation: {
    new (): {
        $props: VNodeProps & TranslationProps;
    };
};

/**
 * Translation Directive (`v-t`)
 *
 * @remarks
 * Update the element `textContent` that localized with locale messages.
 *
 * You can use string syntax or object syntax.
 *
 * String syntax can be specified as a keypath of locale messages.
 *
 * If you can be used object syntax, you need to specify as the object key the following params
 *
 * ```
 * - path: required, key of locale messages
 * - locale: optional, locale
 * - args: optional, for list or named formatting
 * ```
 *
 * @example
 * ```html
 * <!-- string syntax: literal -->
 * <p v-t="'foo.bar'"></p>
 *
 * <!-- string syntax: binding via data or computed props -->
 * <p v-t="msg"></p>
 *
 * <!-- object syntax: literal -->
 * <p v-t="{ path: 'hi', locale: 'ja', args: { name: 'kazupon' } }"></p>
 *
 * <!-- object syntax: binding via data or computed props -->
 * <p v-t="{ path: greeting, args: { name: fullName } }"></p>
 * ```
 *
 * @deprecated will be removed at vue-i18n v12
 *
 * @VueI18nDirective
 */
export declare type TranslationDirective<T = HTMLElement> = ObjectDirective<T>;

/**
 * Translation Component Props
 *
 * @VueI18nComponent
 */
export declare interface TranslationProps extends BaseFormatProps {
    /**
     * @remarks
     * The locale message key can be specified prop
     */
    keypath: string;
    /**
     * @remarks
     * The Plural Choosing the message number prop
     */
    plural?: number | string;
}

export declare function useI18n<Options extends UseI18nOptions = UseI18nOptions>(options?: Options): Composer<NonNullable<Options['messages']>, NonNullable<Options['datetimeFormats']>, NonNullable<Options['numberFormats']>, Options['locale'] extends unknown ? string : Options['locale']>;

/**
 * Use Composition API for Vue I18n
 *
 * @param options - An options, see {@link UseI18nOptions}
 *
 * @typeParam Schema - The i18n resources (messages, datetimeFormats, numberFormats) schema, default {@link LocaleMessage}
 * @typeParam Locales - The locales of i18n resource schema, default `en-US`
 *
 * @returns {@link Composer} instance
 *
 * @remarks
 * This function is mainly used by `setup`.
 *
 * If options are specified, Composer instance is created for each component and you can be localized on the component.
 *
 * If options are not specified, you can be localized using the global Composer.
 *
 * @example
 * case: Component resource base localization
 * ```html
 * <template>
 *   <form>
 *     <label>{{ t('language') }}</label>
 *     <select v-model="locale">
 *       <option value="en">en</option>
 *       <option value="ja">ja</option>
 *     </select>
 *   </form>
 *   <p>message: {{ t('hello') }}</p>
 * </template>
 *
 * <script>
 * import { useI18n } from 'vue-i18n'
 *
 * export default {
 *  setup() {
 *    const { t, locale } = useI18n({
 *      locale: 'ja',
 *      messages: {
 *        en: { ... },
 *        ja: { ... }
 *      }
 *    })
 *    // Something to do ...
 *
 *    return { ..., t, locale }
 *  }
 * }
 * </script>
 * ```
 *
 * @VueI18nComposition
 */
export declare function useI18n<Schema = DefaultLocaleMessageSchema, Locales = 'en-US', Options extends UseI18nOptions<SchemaParams<Schema, VueMessageType>, LocaleParams<Locales>> = UseI18nOptions<SchemaParams<Schema, VueMessageType>, LocaleParams<Locales>>>(options?: Options): Composer<NonNullable<Options['messages']>, NonNullable<Options['datetimeFormats']>, NonNullable<Options['numberFormats']>, NonNullable<Options['locale']>>;

/**
 * I18n Options for `useI18n`
 *
 * @remarks
 * `UseI18nOptions` is inherited {@link ComposerAdditionalOptions} and {@link ComposerOptions}, so you can specify these options.
 *
 * @VueI18nSee [useI18n](composition#usei18n)
 *
 * @VueI18nComposition
 */
export declare type UseI18nOptions<Schema extends {
    message?: unknown;
    datetime?: unknown;
    number?: unknown;
} = {
    message: DefaultLocaleMessageSchema;
    datetime: DefaultDateTimeFormatSchema;
    number: DefaultNumberFormatSchema;
}, Locales extends {
    messages: unknown;
    datetimeFormats: unknown;
    numberFormats: unknown;
} | string = Locale, Options extends ComposerOptions<Schema, Locales> = ComposerOptions<Schema, Locales>> = ComposerAdditionalOptions & Options;

/**
 * Vue I18n Version
 *
 * @remarks
 * Semver format. Same format as the package.json `version` field.
 *
 * @VueI18nGeneral
 */
export declare const VERSION: string;

/**
 * @deprecated will be removed at vue-i18n v12
 */
export declare function vTDirective(i18n: I18n): TranslationDirective<HTMLElement>;

export declare type VTDirectiveValue = {
    path: string;
    locale?: Locale;
    args?: NamedValue;
    choice?: number;
    plural?: number;
};

/**
 *  VueI18n legacy interfaces
 *
 *  @remarks
 *  This interface is compatible with interface of `VueI18n` class (offered with Vue I18n v8.x).
 *
 * @deprecated will be removed at vue-i18n v12
 *
 *  @VueI18nLegacy
 */
export declare interface VueI18n<Messages extends Record<string, any> = {}, DateTimeFormats extends Record<string, any> = {}, NumberFormats extends Record<string, any> = {}, OptionLocale = Locale, ResourceLocales = PickupLocales<NonNullable<Messages>> | PickupLocales<NonNullable<DateTimeFormats>> | PickupLocales<NonNullable<NumberFormats>>, Locales = Locale extends GeneratedLocale ? GeneratedLocale : OptionLocale extends string ? [ResourceLocales] extends [never] ? Locale : ResourceLocales : OptionLocale | ResourceLocales, Composition extends Composer<Messages, DateTimeFormats, NumberFormats, OptionLocale> = Composer<Messages, DateTimeFormats, NumberFormats, OptionLocale>> {
    /**
     * @remarks
     * Instance ID.
     */
    id: number;
    /**
     * @remarks
     * The current locale this VueI18n instance is using.
     *
     * If the locale contains a territory and a dialect, this locale contains an implicit fallback.
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     */
    locale: Locales;
    /**
     * @remarks
     * The current fallback locales this VueI18n instance is using.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    fallbackLocale: FallbackLocales<Locales>;
    /**
     * @remarks
     * The list of available locales in `messages` in lexical order.
     */
    readonly availableLocales: Composition['availableLocales'];
    /**
     * @remarks
     * The locale messages of localization.
     *
     * @VueI18nSee [Getting Started](../guide/essentials/started)
     */
    readonly messages: {
        [K in keyof Messages]: Messages[K];
    };
    /**
     * @remarks
     * The datetime formats of localization.
     *
     * @VueI18nSee [Datetime Formatting](../guide/essentials/datetime)
     */
    readonly datetimeFormats: {
        [K in keyof DateTimeFormats]: DateTimeFormats[K];
    };
    /**
     * @remarks
     * The number formats of localization.
     *
     * @VueI18nSee [Number Formatting](../guide/essentials/number)
     */
    readonly numberFormats: {
        [K in keyof NumberFormats]: NumberFormats[K];
    };
    /**
     * @remarks
     * Custom Modifiers for linked messages.
     *
     * @VueI18nSee [Custom Modifiers](../guide/essentials/syntax#custom-modifiers)
     */
    readonly modifiers: Composition['modifiers'];
    /**
     * @remarks
     * A handler for localization missing.
     */
    missing: MissingHandler | null;
    /**
     * @remarks
     * A handler for post processing of translation.
     */
    postTranslation: PostTranslationHandler<VueMessageType> | null;
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    silentTranslationWarn: Composition['missingWarn'];
    /**
     * @remarks
     * Whether suppress fallback warnings when localization fails.
     */
    silentFallbackWarn: Composition['fallbackWarn'];
    /**
     * @remarks
     * Whether suppress warnings when falling back to either `fallbackLocale` or root.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     */
    formatFallbackMessages: Composition['fallbackFormat'];
    /**
     * @remarks
     * Whether synchronize the root level locale to the component localization locale.
     *
     * @VueI18nSee [Local Scope](../guide/essentials/scope#local-scope-2)
     */
    sync: Composition['inheritLocale'];
    /**
     * @remarks
     * Whether to allow the use locale messages of HTML formatting.
     *
     * If you set `warn` or` error`, will check the locale messages on the VueI18n instance.
     *
     * If you are specified `warn`, a warning will be output at console.
     *
     * If you are specified `error` will occurred an Error.
     *
     * @VueI18nSee [HTML Message](../guide/essentials/syntax#html-message)
     * @VueI18nSee [Change `warnHtmlInMessage` option default value](../guide/migration/breaking#change-warnhtmlinmessage-option-default-value)
     */
    warnHtmlInMessage: WarnHtmlInMessageLevel;
    /**
     * @remarks
     * Whether interpolation parameters are escaped before the message is translated.
     *
     * @VueI18nSee [HTML Message](../guide/essentials/syntax#html-message)
     */
    escapeParameterHtml: Composition['escapeParameter'];
    /**
     * A set of rules for word pluralization
     *
     * @VueI18nSee [Custom Pluralization](../guide/essentials/pluralization#custom-pluralization)
     */
    pluralizationRules: Composition['pluralRules'];
    /**
     * Locale message translation
     *
     * @remarks
     * About details functions, See the {@link VueI18nTranslation}
     */
    t: VueI18nTranslation<Messages, Locales, RemoveIndexSignature<{
        [K in keyof DefineLocaleMessage]: DefineLocaleMessage[K];
    }>>;
    /**
     * Resolve locale message translation
     *
     * @remarks
     * About details functions, See the {@link VueI18nResolveLocaleMessageTranslation}
     */
    rt: VueI18nResolveLocaleMessageTranslation<Locales>;
    /**
     * Translation locale message exist
     *
     * @remarks
     * whether do exist locale message on VueI18n instance [messages](legacy#messages).
     *
     * If you specified `locale`, check the locale messages of `locale`.
     *
     * @param key - A target locale message key
     * @param locale - A target locale
     *
     * @returns If found locale message, `true`, else `false`
     */
    te<Str extends string, Key extends PickupKeys<Messages> = PickupKeys<Messages>>(key: Str | Key, locale?: Locales): boolean;
    /**
     * Locale messages getter
     *
     * @remarks
     * If [i18n component options](injection#i18n) is specified, it’s get in preferentially local scope locale messages than global scope locale messages.
     *
     * If [i18n component options](injection#i18n) isn't specified, it’s get with global scope locale messages.
     *
     * Based on the current `locale`, locale messages will be returned from Composer instance messages.
     *
     * If you change the `locale`, the locale messages returned will also correspond to the locale.
     *
     * If there are no locale messages for the given `key` in the composer instance messages, they will be returned with [fallbacking](../guide/essentials/fallback).
     *
     * @VueI18nWarning
     * You need to use `rt` for the locale message returned by `tm`. see the [rt](legacy#rt-message) details.
     *
     * @example
     * template:
     * ```html
     * <div class="container">
     *   <template v-for="content in $tm('contents')">
     *     <h2>{{ $rt(content.title) }}</h2>
     *     <p v-for="paragraph in content.paragraphs">
     *      {{ $rt(paragraph) }}
     *     </p>
     *   </template>
     * </div>
     * ```
     *
     * ```js
     * import { createI18n } from 'vue-i18n'
     *
     * const i18n = createI18n({
     *   messages: {
     *     en: {
     *       contents: [
     *         {
     *           title: 'Title1',
     *           // ...
     *           paragraphs: [
     *             // ...
     *           ]
     *         }
     *       ]
     *     }
     *   }
     *   // ...
     * })
     * ```
     * @param key - A target locale message key
     *
     * @return Locale messages
     */
    tm: Composition['tm'];
    /**
     * Get locale message
     *
     * @remarks
     * get locale message from VueI18n instance [messages](legacy#messages).
     *
     * @param locale - A target locale
     *
     * @returns Locale messages
     */
    getLocaleMessage: Composition['getLocaleMessage'];
    /**
     * Set locale message
     *
     * @remarks
     * Set locale message to VueI18n instance [messages](legacy#messages).
     *
     * @param locale - A target locale
     * @param message - A message
     */
    setLocaleMessage: Composition['setLocaleMessage'];
    /**
     * Merge locale message
     *
     * @remarks
     * Merge locale message to VueI18n instance [messages](legacy#messages).
     *
     * @param locale - A target locale
     * @param message - A message
     */
    mergeLocaleMessage: Composition['mergeLocaleMessage'];
    /**
     * Datetime formatting
     *
     * @remarks
     * About details functions, See the {@link VueI18nDateTimeFormatting}
     */
    d: VueI18nDateTimeFormatting<DateTimeFormats, Locales, RemoveIndexSignature<{
        [K in keyof DefineDateTimeFormat]: DefineDateTimeFormat[K];
    }>>;
    /**
     * Get datetime format
     *
     * @remarks
     * get datetime format from VueI18n instance [datetimeFormats](legacy#datetimeformats).
     *
     * @param locale - A target locale
     *
     * @returns Datetime format
     */
    getDateTimeFormat: Composition['getDateTimeFormat'];
    /**
     * Set datetime format
     *
     * @remarks
     * Set datetime format to VueI18n instance [datetimeFormats](legacy#datetimeformats).
     *
     * @param locale - A target locale
     * @param format - A target datetime format
     */
    setDateTimeFormat: Composition['setDateTimeFormat'];
    /**
     * Merge datetime format
     *
     * @remarks
     * Merge datetime format to VueI18n instance [datetimeFormats](legacy#datetimeformats).
     *
     * @param locale - A target locale
     * @param format - A target datetime format
     */
    mergeDateTimeFormat: Composition['mergeDateTimeFormat'];
    /**
     * Number Formatting
     *
     * @remarks
     * About details functions, See the {@link VueI18nNumberFormatting}
     */
    n: VueI18nNumberFormatting<NumberFormats, Locales, RemoveIndexSignature<{
        [K in keyof DefineNumberFormat]: DefineNumberFormat[K];
    }>>;
    /**
     * Get number format
     *
     * @remarks
     * get number format from VueI18n instance [numberFormats](legacy#numberFormats).
     *
     * @param locale - A target locale
     *
     * @returns Number format
     */
    getNumberFormat: Composition['getNumberFormat'];
    /**
     * Set number format
     *
     * @remarks
     * Set number format to VueI18n instance [numberFormats](legacy#numberFormats).
     *
     * @param locale - A target locale
     * @param format - A target number format
     */
    setNumberFormat: Composition['setNumberFormat'];
    /**
     * Merge number format
     *
     * @remarks
     * Merge number format to VueI18n instance [numberFormats](legacy#numberFormats).
     *
     * @param locale - A target locale
     * @param format - A target number format
     */
    mergeNumberFormat: Composition['mergeNumberFormat'];
}

/**
 * Datetime formatting functions for VueI18n legacy interfaces
 *
 * @remarks
 * This is the interface for {@link VueI18n}
 *
 * @deprecated will be removed at vue-i18n v12
 *
 * @VueI18nLegacy
 */
export declare interface VueI18nDateTimeFormatting<DateTimeFormats extends Record<string, any> = {}, Locales = 'en-US', DefinedDateTimeFormat extends RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>, C = IsEmptyObject<DefinedDateTimeFormat> extends false ? PickupFormatPathKeys<{
    [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K];
}> : never, M = IsEmptyObject<DateTimeFormats> extends false ? PickupFormatKeys<DateTimeFormats> : never, ResourceKeys extends C | M = IsNever<C> extends false ? IsNever<M> extends false ? C | M : C : IsNever<M> extends false ? M : never> {
    /**
     * Datetime formatting
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [i18n component options](injection#i18n) is specified, it’s formatted in preferentially local scope datetime formats than global scope locale messages.
     *
     * If [i18n component options](injection#i18n) isn't specified, it’s formatted with global scope datetime formats.
     *
     * @param value - A value, timestamp number or `Date` instance
     *
     * @returns Formatted value
     *
     * @VueI18nSee [Datetime formatting](../guide/essentials/datetime)
     */
    (value: number | Date): DateTimeFormatResult;
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `d`. About details, see the [call signature](legacy#value-number-date-datetimeformatresult) details.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param key - A key of datetime formats
     *
     * @returns Formatted value
     */
    <Value extends number | Date = number, Key extends string = string>(value: Value, key: Key | ResourceKeys): DateTimeFormatResult;
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `d`. About details, see the [call signature](legacy#value-number-date-datetimeformatresult) details.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param key - A key of datetime formats
     * @param locale - A locale, it will be used over than global scope or local scope.
     *
     * @returns Formatted value
     */
    <Value extends number | Date = number, Key extends string = string>(value: Value, key: Key | ResourceKeys, locale: Locales): DateTimeFormatResult;
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `d`. About details, see the [call signature](legacy#value-number-date-datetimeformatresult) details.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param args - An argument values
     *
     * @returns Formatted value
     */
    (value: number | Date, args: {
        [key: string]: string | boolean | number;
    }): DateTimeFormatResult;
}

/**
 * @deprecated will be removed at vue-i18n v12
 */
export declare type VueI18nExtender = (vueI18n: VueI18n) => Disposer | undefined;

/** @VueI18nGeneral */
export declare type VueI18nInstance = IsNever<GeneratedInstanceType> extends true ? VueI18n | ExportedGlobalComposer : GeneratedInstanceType extends true ? VueI18n : ExportedGlobalComposer;

/**
 * Number formatting functions for VueI18n legacy interfaces
 *
 * @remarks
 * This is the interface for {@link VueI18n}
 *
 * @deprecated will be removed at vue-i18n v12
 *
 * @VueI18nLegacy
 */
export declare interface VueI18nNumberFormatting<NumberFormats extends Record<string, any> = {}, Locales = 'en-US', DefinedNumberFormat extends RemovedIndexResources<DefineNumberFormat> = RemovedIndexResources<DefineNumberFormat>, C = IsEmptyObject<DefinedNumberFormat> extends false ? PickupFormatPathKeys<{
    [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K];
}> : never, M = IsEmptyObject<NumberFormats> extends false ? PickupFormatKeys<NumberFormats> : never, ResourceKeys extends C | M = IsNever<C> extends false ? IsNever<M> extends false ? C | M : C : IsNever<M> extends false ? M : never> {
    /**
     * Number formatting
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [i18n component options](injection#i18n) is specified, it’s formatted in preferentially local scope number formats than global scope locale messages.
     *
     * If [i18n component options](injection#i18n) isn't specified, it’s formatted with global scope number formats.
     *
     * @param value - A number value
     *
     * @returns Formatted value
     *
     * @VueI18nSee [Number formatting](../guide/essentials/number)
     */
    (value: number): NumberFormatResult;
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `n`. About details, see the [call signature](legacy#value-number-numberformatresult) details.
     *
     * @param value - A number value
     * @param key - A key of number formats
     *
     * @returns Formatted value
     */
    <Key extends string = string>(value: number, key: Key | ResourceKeys): NumberFormatResult;
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `n`. About details, see the [call signature](legacy#value-number-numberformatresult) details.
     *
     * @param value - A number value
     * @param key - A key of number formats
     * @param locale - A locale, it will be used over than global scope or local scope.
     *
     * @returns Formatted value
     */
    <Key extends string = string>(value: number, key: Key | ResourceKeys, locale: Locales): NumberFormatResult;
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `n`. About details, see the [call signature](legacy#value-number-numberformatresult) details.
     *
     * @param value - A number value
     * @param args - An argument values
     *
     * @returns Formatted value
     */
    (value: number, args: {
        [key: string]: string | boolean | number;
    }): NumberFormatResult;
}

/**
 *  VueI18n Options
 *
 *  @remarks
 *  This option is compatible with `VueI18n` class constructor options (offered with Vue I18n v8.x)
 *
 * @deprecated will be removed at vue-i18n v12
 *
 *  @VueI18nLegacy
 */
export declare interface VueI18nOptions<Schema extends {
    message?: unknown;
    datetime?: unknown;
    number?: unknown;
} = {
    message: DefaultLocaleMessageSchema;
    datetime: DefaultDateTimeFormatSchema;
    number: DefaultNumberFormatSchema;
}, Locales extends {
    messages: unknown;
    datetimeFormats: unknown;
    numberFormats: unknown;
} | string = Locale, Options extends ComposerOptions<Schema, Locales> = ComposerOptions<Schema, Locales>> {
    /**
     * @remarks
     * The locale of localization.
     *
     * If the locale contains a territory and a dialect, this locale contains an implicit fallback.
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     *
     * @defaultValue `'en-US'`
     */
    locale?: Options['locale'];
    /**
     * @remarks
     * The locale of fallback localization.
     *
     * For more complex fallback definitions see fallback.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue The default `'en-US'` for the `locale` if it's not specified, or it's `locale` value
     */
    fallbackLocale?: Options['fallbackLocale'];
    /**
     * @remarks
     * The locale messages of localization.
     *
     * @VueI18nSee [Getting Started](../guide/essentials/started)
     *
     * @defaultValue `{}`
     */
    messages?: Options['messages'];
    /**
     * @remarks
     * Allow use flat json messages or not
     *
     * @defaultValue `false`
     */
    flatJson?: Options['flatJson'];
    /**
     * @remarks
     * The datetime formats of localization.
     *
     * @VueI18nSee [Datetime Formatting](../guide/essentials/datetime)
     *
     * @defaultValue `{}`
     */
    datetimeFormats?: Options['datetimeFormats'];
    /**
     * @remarks
     * The number formats of localization.
     *
     * @VueI18nSee [Number Formatting](../guide/essentials/number)
     *
     * @defaultValue `{}`
     */
    numberFormats?: Options['numberFormats'];
    /**
     * @remarks
     * The list of available locales in messages in lexical order.
     *
     * @defaultValue `[]`
     */
    availableLocales?: Locale[];
    /**
     * @remarks
     * Custom Modifiers for linked messages.
     *
     * @VueI18nSee [Custom Modifiers](../guide/essentials/syntax#custom-modifiers)
     */
    modifiers?: Options['modifiers'];
    /**
     * @remarks
     * A handler for localization missing.
     *
     * The handler gets called with the localization target locale, localization path key, the Vue instance and values.
     *
     * If missing handler is assigned, and occurred localization missing, it's not warned.
     *
     * @defaultValue `null`
     */
    missing?: Options['missing'];
    /**
     * @remarks
     * In the component localization, whether to fall back to root level (global scope) localization when localization fails.
     *
     * If `false`, it's not fallback to root.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `true`
     */
    fallbackRoot?: Options['fallbackRoot'];
    /**
     * @remarks
     * Whether suppress warnings outputted when localization fails.
     *
     * If `true`, suppress localization fail warnings.
     *
     * If you use regular expression, you can suppress localization fail warnings that it match with translation key (e.g. `t`).
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `false`
     */
    silentTranslationWarn?: Options['missingWarn'];
    /**
     * @remarks
     * Whether do template interpolation on translation keys when your language lacks a translation for a key.
     *
     * If `true`, skip writing templates for your "base" language; the keys are your templates.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `false`
     */
    silentFallbackWarn?: Options['fallbackWarn'];
    /**
     * @remarks
     * Whether suppress warnings when falling back to either `fallbackLocale` or root.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `false`
     */
    formatFallbackMessages?: Options['fallbackFormat'];
    /**
     * @remarks
     * Whether to allow the use locale messages of HTML formatting.
     *
     * See the warnHtmlInMessage property.
     *
     * @VueI18nSee [HTML Message](../guide/essentials/syntax#html-message)
     * @VueI18nSee [Change `warnHtmlInMessage` option default value](../guide/migration/breaking#change-warnhtmlinmessage-option-default-value)
     *
     * @defaultValue `'off'`
     */
    warnHtmlInMessage?: WarnHtmlInMessageLevel;
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
     * This is useful when translation output is used in `v-html` and the translation resource contains html markup (e.g. <b> around a user provided value).
     *
     * This usage pattern mostly occurs when passing precomputed text strings into UI components.
     *
     * Setting `escapeParameterHtml` as true should not break existing functionality but provides a safeguard against a subtle type of XSS attack vectors.
     *
     * @VueI18nSee [HTML Message - Using the escapeParameter option](../guide/essentials/syntax#using-the-escapeparameter-option)
     *
     * @defaultValue `false`
     */
    escapeParameterHtml?: Options['escapeParameter'];
    /**
     * @remarks
     * The shared locale messages of localization for components. More detail see Component based localization.
     *
     * @VueI18nSee [Shared locale messages for components](../guide/essentials/local#shared-locale-messages-for-components)
     *
     * @defaultValue `undefined`
     */
    sharedMessages?: LocaleMessages<VueMessageType>;
    /**
     * @remarks
     * A set of rules for word pluralization
     *
     * @VueI18nSee [Custom Pluralization](../guide/essentials/pluralization#custom-pluralization)
     *
     * @defaultValue `{}`
     */
    pluralizationRules?: Options['pluralRules'];
    /**
     * @remarks
     * A handler for post processing of translation. The handler gets after being called with the `$t`, and `t`.
     *
     * This handler is useful if you want to filter on translated text such as space trimming.
     *
     * @defaultValue `null`
     */
    postTranslation?: Options['postTranslation'];
    /**
     * @remarks
     * Whether synchronize the root level locale to the component localization locale.
     *
     * If `false`, regardless of the root level locale, localize for each component locale.
     *
     * @VueI18nSee [Local Scope](../guide/essentials/scope#local-scope-2)
     *
     * @defaultValue `true`
     */
    sync?: boolean;
    /**
     * @remarks
     * A message resolver to resolve [`messages`](legacy#messages).
     *
     * If not specified, the vue-i18n internal message resolver will be used by default.
     *
     * You need to implement a message resolver yourself that supports the following requirements:
     *
     * - Resolve the message using the locale message of [`locale`](legacy#locale) passed as the first argument of the message resolver, and the path passed as the second argument.
     *
     * - If the message could not be resolved, you need to return `null`.
     *
     * - If you will be returned `null`, the message resolver will also be called on fallback if [`fallbackLocale`](legacy#fallbacklocale-2) is enabled, so the message will need to be resolved as well.
     *
     * The message resolver is called indirectly by the following APIs:
     *
     * - [`t`](legacy#t-key)
     *
     * - [`te`](legacy#te-key-locale)
     *
     * - [`tm`](legacy#tm-key)
     *
     * - [Translation component](component#translation)
     *
     * @example
     * Here is an example of how to set it up using your `createI18n`:
     * ```js
     * import { createI18n } from 'vue-i18n'
     *
     * // your message resolver
     * function messageResolver(obj, path) {
     *   // simple message resolving!
     *   const msg = obj[path]
     *   return msg != null ? msg : null
     * }
     *
     * // call with I18n option
     * const i18n = createI18n({
     *   locale: 'ja',
     *   messageResolver, // set your message resolver
     *   messages: {
     *     en: { ... },
     *     ja: { ... }
     *   }
     * })
     *
     * // the below your something to do ...
     * // ...
     * ```
     *
     * @VueI18nTip
     * :new: v9.2+
     *
     * @VueI18nWarning
     * If you use the message resolver, the [`flatJson`](legacy#flatjson) setting will be ignored. That is, you need to resolve the flat JSON by yourself.
     *
     * @VueI18nSee [Fallbacking](../guide/essentials/fallback)
     *
     * @defaultValue `undefined`
     */
    messageResolver?: MessageResolver;
}

/**
 * Resolve locale message translation functions for VueI18n legacy interfaces
 *
 * @deprecated will be removed at vue-i18n v12
 *
 * @remarks
 * This is the interface for {@link VueI18n}. This interface is an alias of {@link ComposerResolveLocaleMessageTranslation}.
 *
 * @VueI18nLegacy
 */
export declare type VueI18nResolveLocaleMessageTranslation<Locales = 'en-US'> = ComposerResolveLocaleMessageTranslation<Locales>;

/**
 * Locale message translation functions for VueI18n legacy interfaces
 *
 * @remarks
 * This is the interface for {@link VueI18n}
 *
 * @deprecated will be removed at vue-i18n v12
 *
 * @VueI18nLegacy
 */
export declare interface VueI18nTranslation<Messages extends Record<string, any> = {}, Locales = 'en-US', DefinedLocaleMessage extends RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>, C = IsEmptyObject<DefinedLocaleMessage> extends false ? PickupPaths<{
    [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K];
}> : never, M = IsEmptyObject<Messages> extends false ? PickupKeys<Messages> : never, ResourceKeys extends C | M = IsNever<C> extends false ? IsNever<M> extends false ? C | M : C : IsNever<M> extends false ? M : never> {
    /**
     * Locale message translation.
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * If [i18n component options](injection#i18n) is specified, it’s translated in preferentially local scope locale messages than global scope locale messages.
     *
     * If [i18n component options](injection#i18n) isn't specified, it’s translated with global scope locale messages.
     *
     * @param key - A target locale message key
     *
     * @returns Translated message
     *
     * @VueI18nSee [Scope and Locale Changing](../guide/essentials/scope)
     */
    <Key extends string>(key: Key | ResourceKeys): TranslateResult;
    /**
     * Locale message translation for plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, return a pluralized translation message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * @param key - A target locale message key
     * @param plural - Which plural string to get. 1 returns the first one.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     */
    <Key extends string>(key: Key | ResourceKeys, plural: number): TranslateResult;
    /**
     * Locale message translation for plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, return a pluralized translation message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param plural - Which plural string to get. 1 returns the first one.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     */
    <Key extends string>(key: Key | ResourceKeys, plural: number, options: TranslateOptions<Locales>): TranslateResult;
    /**
     * Locale message translation for missing default message
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, if no translation was found, return a default message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * @param key - A target locale message key
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns Translated message
     */
    <Key extends string>(key: Key | ResourceKeys, defaultMsg: string): TranslateResult;
    /**
     * Locale message translation for missing default message
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, if no translation was found, return a default message.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param defaultMsg - A default message to return if no translation was found
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     */
    <Key extends string>(key: Key | ResourceKeys, defaultMsg: string, options: TranslateOptions<Locales>): TranslateResult;
    /**
     * Locale message translation.
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, list: unknown[]): TranslateResult;
    /**
     * Locale message translation for list interpolations and plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list, and return a pluralized translation message.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param plural - Which plural string to get. 1 returns the first one.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, list: unknown[], plural: number): TranslateResult;
    /**
     * Locale message translation for list interpolations and missing default message
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list, and if no translation was found, return a default message.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, list: unknown[], defaultMsg: string): TranslateResult;
    /**
     * Locale message translation for list interpolations
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, the locale messages should contain a `{0}`, `{1}`, … for each placeholder in the list.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [List interpolation](../guide/essentials/syntax#list-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, list: unknown[], options: TranslateOptions<Locales>): TranslateResult;
    /**
     * Locale message translation.
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, named: Record<string, unknown>): TranslateResult;
    /**
     * Locale message translation for named interpolations and plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token, and return a pluralized translation message.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param plural - Which plural string to get. 1 returns the first one.
     *
     * @returns Translated message
     *
     * @VueI18nSee [Pluralization](../guide/essentials/pluralization)
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, named: NamedValue, plural: number): TranslateResult;
    /**
     * Locale message translation for named interpolations and plurals
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token, and if no translation was found, return a default message.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, named: NamedValue, defaultMsg: string): TranslateResult;
    /**
     * Locale message translation for named interpolations
     *
     * @remarks
     * Overloaded `t`. About details, see the [call signature](legacy#key-key-resourcekeys-translateresult) details.
     *
     * In this overloaded `t`, for each placeholder x, the locale messages should contain a `{x}` token.
     *
     * You can also suppress the warning, when the translation missing according to the options.
     *
     * About details of options, see the {@link TranslateOptions}.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     *
     * @VueI18nSee [Named interpolation](../guide/essentials/syntax#named-interpolation)
     */
    <Key extends string>(key: Key | ResourceKeys, named: NamedValue, options: TranslateOptions<Locales>): TranslateResult;
}

/** @VueI18nComposition */
export declare type VueMessageType = string | ResourceNode | VNode;

/**
 * @deprecated will be removed at vue-i18n v12
 * @VueI18nLegacy
 */
export declare type WarnHtmlInMessageLevel = 'off' | 'warn' | 'error';

export { }

declare module 'vue' {
  /**
   * Component Custom Options for Vue I18n
   *
   * @VueI18nInjection
   */
  export interface ComponentCustomOptions {
    /**
     * VueI18n options
     *
     * @remarks
     * See the {@link VueI18nOptions}
     */
    i18n?: VueI18nOptions
    /**
     * For custom blocks options
     * @internal
     */
    __i18n?: CustomBlocks
    /**
     * For devtools
     * @internal
     */
    __INTLIFY_META__?: string
  }

  /**
   * Component Custom Properties for Vue I18n
   *
   * @VueI18nInjection
   */
  export interface ComponentCustomProperties {
    /**
     * Exported Global Composer instance, or global VueI18n instance.
     *
     * @remarks
     * You can get the {@link ExportedGlobalComposer | exported composer instance} which are exported from global {@link Composer | composer instance} created with {@link createI18n}, or global {@link VueI18n | VueI18n instance}.
     * You can get the exported composer instance in {@link I18nMode | Composition API mode}, or the Vuei18n instance in {@link I18nMode | Legacy API mode}, which is the instance you can refer to with this property.
     * The locales, locale messages, and other resources managed by the instance referenced by this property are valid as global scope.
     * If the `i18n` component custom option is not specified, it's the same as the VueI18n instance that can be referenced by the i18n instance {@link I18n.global | global} property.
     */
    $i18n: VueI18nInstance
    /**
     * Locale message translation
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * In {@link I18nMode | Legacy API mode}, the input / output is the same as for VueI18n instance. About that details, see {@link VueI18n#t | `VueI18n#t`}.
     *
     * In {@link I18nMode | Composition API mode}, the `$t` is injected by `app.config.globalProperties`.
     * the input / output is the same as for Composer, and it work on **global scope**. About that details, see {@link Composer#t | `Composer#t` }.
     *
     * @param key - A target locale message key
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param plural - A choice number of plural
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      plural: number
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param plural - Which plural string to get. 1 returns the first one.
     * @param options - An options, see the {@link TranslateOptions}
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      plural: number,
      options: TranslateOptions
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      defaultMsg: string
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param defaultMsg - A default message to return if no translation was found
     * @param options - An options, see the {@link TranslateOptions}
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      defaultMsg: string,
      options: TranslateOptions
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      list: unknown[]
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param plural - A choice number of plural
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      list: unknown[],
      plural: number
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      list: unknown[],
      defaultMsg: string
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param list - A values of list interpolation
     * @param options - An options, see the {@link TranslateOptions}
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      list: unknown[],
      options: TranslateOptions
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      named: NamedValue
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param plural - A choice number of plural
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      named: NamedValue,
      plural: number
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param defaultMsg - A default message to return if no translation was found
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      named: NamedValue,
      defaultMsg: string
    ): TranslateResult
    /**
     * Locale message translation
     *
     * @remarks
     * Overloaded `$t`. About details, see the {@link $t} remarks.
     *
     * @param key - A target locale message key
     * @param named - A values of named interpolation
     * @param options - An options, see the {@link TranslateOptions}
     *
     * @returns translation message
     */
    $t<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      named: NamedValue,
      options: TranslateOptions
    ): TranslateResult
    /**
     * Resolve locale message translation
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * In {@link I18nMode | Legacy API mode}, the input / output is the same as for VueI18n instance. About that details, see {@link VueI18n#rt | `VueI18n#rt`}.
     *
     * In {@link I18nMode | Composition API mode}, the `$rt` is injected by `app.config.globalProperties`.
     * the input / output is the same as for Composer, and it work on **global scope**. About that details, see {@link Composer#rt | `Composer#rt` }.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `$tm`.
     *
     * @returns translated message
     */
    $rt(message: MessageFunction<VueMessageType> | VueMessageType): string
    /**
     * Resolve locale message translation for plurals
     *
     * @remarks
     * Overloaded `$rt`. About details, see the {@link $rt} remarks.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `$tm`.
     * @param plural - Which plural string to get. 1 returns the first one.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     */
    $rt(
      message: MessageFunction<VueMessageType> | VueMessageType,
      plural: number,
      options?: TranslateOptions
    ): string
    /**
     * Resolve locale message translation for list interpolations
     *
     * @remarks
     * Overloaded `$rt`. About details, see the {@link $rt} remarks.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `$tm`.
     * @param list - A values of list interpolation.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     */
    $rt(
      message: MessageFunction<VueMessageType> | VueMessageType,
      list: unknown[],
      options?: TranslateOptions
    ): string
    /**
     * Resolve locale message translation for named interpolations
     *
     * @remarks
     * Overloaded `$rt`. About details, see the {@link $rt} remarks.
     *
     * @param message - A target locale message to be resolved. You will need to specify the locale message returned by `$tm`.
     * @param named - A values of named interpolation.
     * @param options - Additional {@link TranslateOptions | options} for translation
     *
     * @returns Translated message
     */
    $rt(
      message: MessageFunction<VueMessageType> | VueMessageType,
      named: NamedValue,
      options?: TranslateOptions
    ): string
    /**
     * Translation message exist
     *
     * @remarks
     * About that details, see {@link VueI18n#te | `VueI18n#te` } or {@link Composer#te | `Composer#te`}.
     *
     * @param key - A target locale message key
     * @param locale - A locale, optional, override locale that global scope or local scope
     *
     * @returns If found locale message, `true`, else `false`, Note that `false` is returned even if the value present in the key is not translatable.
     */
    $te<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys,
      locale?: Locale
    ): boolean
    /**
     * Datetime formatting
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * In {@link I18nMode | Legacy API mode}, the input / output is the same as for VueI18n instance. About that details, see {@link VueI18n#d | `VueI18n#d` }.
     *
     * In {@link I18nMode | Composition API mode}, the `$d` is injected by `app.config.globalProperties`.
     * the input / output is the same as for Composer instance, and it work on **global scope**. About that details, see {@link Composer#d | `Composer#d` }.
     *
     * @param value - A value, timestamp number or `Date` instance
     *
     * @returns formatted value
     */
    $d(value: number | Date): DateTimeFormatResult
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param key - A key of datetime formats
     *
     * @returns formatted value
     */
    $d<
      Value extends number | Date = number,
      Key extends string = string,
      DefinedDateTimeFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedDateTimeFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: Value,
      key: Key | ResourceKeys
    ): DateTimeFormatResult
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param key - A key of datetime formats
     * @param locale - A locale, optional, override locale that global scope or local scope
     *
     * @returns formatted value
     */
    $d<
      Value extends number | Date = number,
      Key extends string = string,
      DefinedDateTimeFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedDateTimeFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: Value,
      key: Key | ResourceKeys,
      locale: Locale
    ): DateTimeFormatResult
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param args - An argument values
     *
     * @returns formatted value
     */
    $d(
      value: number | Date,
      args: { [key: string]: string }
    ): DateTimeFormatResult
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     *
     * @returns formatted value
     */
    $d(value: number | Date): string
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param key - A key of datetime formats
     *
     * @returns formatted value
     */
    $d<
      Value extends number | Date = number,
      Key extends string = string,
      DefinedDateTimeFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedDateTimeFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: Value,
      key: Key | ResourceKeys
    ): string
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param key - A key of datetime formats
     * @param locale - A locale, optional, override locale that global scope or local scope
     *
     * @returns formatted value
     */
    $d<
      Value extends number | Date = number,
      Key extends string = string,
      DefinedDateTimeFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedDateTimeFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: Value,
      key: Key | ResourceKeys,
      locale: Locale
    ): string
    /**
     * Datetime formatting
     *
     * @remarks
     * Overloaded `$d`. About details, see the {@link $d} remarks.
     *
     * @param value - A value, timestamp number or `Date` instance
     * @param options - An options, see the {@link DateTimeOptions}
     *
     * @returns formatted value
     */
    $d<
      value extends number | Date = number,
      Key extends string = string,
      DefinedDateTimeFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedDateTimeFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedDateTimeFormat]: DefinedDateTimeFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never,
      OptionsType = DateTimeOptions<Key | ResourceKeys>
    >(
      value: number | Date,
      options: OptionsType
    ): IsPart<OptionsType> extends true ? Intl.DateTimeFormatPart[] : string
    /**
     * Number formatting
     *
     * @remarks
     * If this is used in a reactive context, it will re-evaluate once the locale changes.
     *
     * In {@link I18nMode | Legacy API mode}, the input / output is the same as for VueI18n instance. About that details, see {@link VueI18n#n | `VueI18n.n` }.
     *
     * In {@link I18nMode | Composition API mode}, the `$n` is injected by `app.config.globalProperties`.
     * the input / output is the same as for Composer instance,  and it work on **global scope**. About that details, see {@link Composer#n | `Composer.n` }.
     *
     * @param value - A number value
     *
     * @returns formatted value
     */
    $n(value: number): NumberFormatResult
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param key - A key of number formats
     *
     * @returns formatted value
     */
    $n<
      Key extends string = string,
      DefinedNumberFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedNumberFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: number,
      key: Key | ResourceKeys
    ): NumberFormatResult
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param key - A key of number formats
     * @param locale - A locale, optional, override locale that global scope or local scope
     *
     * @returns formatted value
     */
    $n<
      Key extends string = string,
      DefinedNumberFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedNumberFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: number,
      key: Key | ResourceKeys,
      locale: Locale
    ): NumberFormatResult
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param args - An argument values
     *
     * @returns formatted value
     */
    $n(
      value: number,
      args: { [key: string]: string | boolean | number }
    ): NumberFormatResult
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param key - A key of number formats
     * @param args - An argument values
     *
     * @returns formatted value
     */
    $n(
      value: number,
      key: string,
      args: { [key: string]: string | boolean | number }
    ): NumberFormatResult
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param key - A key of number formats
     * @param locale - A locale, optional, override locale that global scope or local scope
     * @param args - An argument values
     *
     * @returns formatted value
     */
    $n(
      value: number,
      key: string,
      locale: Locale,
      args: { [key: string]: string | boolean | number }
    ): NumberFormatResult
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     *
     * @returns formatted value
     */
    $n(value: number): string
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param key - A key of number formats
     *
     * @returns formatted value
     */
    $n<
      Key extends string = string,
      DefinedNumberFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedNumberFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: number,
      key: Key | ResourceKeys
    ): string
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param key - A key of number formats
     * @param locale - A locale, optional, override locale that global scope or local scope
     *
     * @returns formatted value
     */
    $n<
      Key extends string = string,
      DefinedNumberFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedNumberFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      value: number,
      key: Key | ResourceKeys,
      locale: Locale
    ): string
    /**
     * Number formatting
     *
     * @remarks
     * Overloaded `$n`. About details, see the {@link $n} remarks.
     *
     * @param value - A number value
     * @param options - An options, see the {@link NumberOptions}
     *
     * @returns formatted value
     */
    $n<
      Key extends string,
      DefinedNumberFormat extends
        RemovedIndexResources<DefineDateTimeFormat> = RemovedIndexResources<DefineDateTimeFormat>,
      Keys = IsEmptyObject<DefinedNumberFormat> extends false
        ? PickupFormatPathKeys<{
            [K in keyof DefinedNumberFormat]: DefinedNumberFormat[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never,
      OptionsType = NumberOptions<Key | ResourceKeys>
    >(
      value: number,
      options: OptionsType
    ): IsPart<OptionsType> extends true ? Intl.NumberFormatPart[] : string
    /**
     * Locale messages getter
     *
     * In {@link I18nMode | Legacy API mode}, the input / output is the same as for VueI18n instance. About that details, see {@link VueI18n#tm | `VueI18n#tm` }.
     *
     * @remarks
     * In {@link I18nMode | Composition API mode}, the `$tm` is injected by `app.config.globalProperties`.
     * the input / output is the same as for Composer instance, and it work on **global scope**. About that details, see {@link Composer#tm | `Composer.tm` }.
     * Based on the current `locale`, locale messages will be returned from Composer instance messages.
     * If you change the `locale`, the locale messages returned will also correspond to the locale.
     * If there are no locale messages for the given `key` in the composer instance messages, they will be returned with fallbacking.
     *
     * @param key - A target locale message key
     *
     * @returns locale messages
     */
    $tm<
      Key extends string,
      DefinedLocaleMessage extends
        RemovedIndexResources<DefineLocaleMessage> = RemovedIndexResources<DefineLocaleMessage>,
      Keys = IsEmptyObject<DefinedLocaleMessage> extends false
        ? JsonPaths<{
            [K in keyof DefinedLocaleMessage]: DefinedLocaleMessage[K]
          }>
        : never,
      ResourceKeys extends Keys = IsNever<Keys> extends false ? Keys : never
    >(
      key: Key | ResourceKeys
    ): LocaleMessageValue<VueMessageType> | {}
  }
}

declare module 'vue' {
  export interface GlobalComponents {
    ['i18n-t']: typeof Translation
    ['i18n-d']: typeof DatetimeFormat
    ['i18n-n']: typeof NumberFormat
    ['I18nT']: typeof Translation
    ['I18nD']: typeof DatetimeFormat
    ['I18nN']: typeof NumberFormat
  }
}
