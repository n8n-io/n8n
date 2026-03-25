import type { MaybeRef } from '@vueuse/core';
import type { InjectionKey, Ref } from 'vue';
import type { Language } from 'element-plus/es/locale';
export declare type TranslatorOption = Record<string, string | number>;
export declare type Translator = (path: string, option?: TranslatorOption) => string;
export declare type LocaleContext = {
    locale: Ref<Language>;
    lang: Ref<string>;
    t: Translator;
};
export declare const buildTranslator: (locale: MaybeRef<Language>) => Translator;
export declare const translate: (path: string, option: undefined | TranslatorOption, locale: Language) => string;
export declare const buildLocaleContext: (locale: MaybeRef<Language>) => LocaleContext;
export declare const localeContextKey: InjectionKey<Ref<Language | undefined>>;
export declare const useLocale: (localeOverrides?: Ref<Language | undefined> | undefined) => LocaleContext;
