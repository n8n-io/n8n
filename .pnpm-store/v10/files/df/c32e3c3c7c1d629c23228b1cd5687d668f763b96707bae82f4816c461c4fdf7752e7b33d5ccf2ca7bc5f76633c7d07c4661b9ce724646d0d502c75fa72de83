/* eslint-disable no-unused-vars */
/* eslint-disable no-use-before-define */
// For TS consumers who use Node and don't have dom in their tsconfig lib, import the necessary types here.
/// <reference lib="dom" />

declare module 'highlight.js/private' {
    import { CompiledMode, Mode, Language } from "highlight.js";

    type MatchType = "begin" | "end" | "illegal"
    type EnhancedMatch = RegExpMatchArray & {rule: CompiledMode, type: MatchType}
    type AnnotatedError = Error & {mode?: Mode | Language, languageName?: string, badRule?: Mode}

    type KeywordData = [string, number];
    type KeywordDict = Record<string, KeywordData>
}
declare module 'highlight.js' {

    import { KeywordDict } from "highlight.js/private";

    export type HLJSApi = PublicApi & ModesAPI

    export interface VuePlugin {
        install: (vue: any) => void
    }

    // perhaps make this an interface?
    type RegexEitherOptions = {
        capture?: boolean
    }

    interface PublicApi {
        highlight(code: string, options: HighlightOptions): HighlightResult
        /** @deprecated use `higlight(code, {lang: ..., ignoreIllegals: ...})` */
        highlight(languageName: string, code: string, ignoreIllegals?: boolean): HighlightResult
        highlightAuto: (code: string, languageSubset?: string[]) => AutoHighlightResult
        highlightBlock: (element: HTMLElement) => void
        highlightElement: (element: HTMLElement) => void
        configure: (options: Partial<HLJSOptions>) => void
        initHighlighting: () => void
        initHighlightingOnLoad: () => void
        highlightAll: () => void
        registerLanguage: (languageName: string, language: LanguageFn) => void
        unregisterLanguage: (languageName: string) => void
        listLanguages: () => string[]
        registerAliases: (aliasList: string | string[], { languageName } : {languageName: string}) => void
        getLanguage: (languageName: string) => Language | undefined
        autoDetection: (languageName: string) => boolean
        inherit: <T>(original: T, ...args: Record<string, any>[]) => T
        addPlugin: (plugin: HLJSPlugin) => void
        removePlugin: (plugin: HLJSPlugin) => void
        debugMode: () => void
        safeMode: () => void
        versionString: string
        vuePlugin: () => VuePlugin
        regex: {
            concat: (...args: (RegExp | string)[]) => string,
            lookahead: (re: RegExp | string) => string,
            either: (...args: (RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]) => string,
            optional: (re: RegExp | string) => string,
            anyNumberOfTimes: (re: RegExp | string) => string
        }
        newInstance: () => HLJSApi
    }

    interface ModesAPI {
        SHEBANG: (mode?: Partial<Mode> & {binary?: string | RegExp}) => Mode
        BACKSLASH_ESCAPE: Mode
        QUOTE_STRING_MODE: Mode
        APOS_STRING_MODE: Mode
        PHRASAL_WORDS_MODE: Mode
        COMMENT: (begin: string | RegExp, end: string | RegExp, modeOpts?: Mode | {}) => Mode
        C_LINE_COMMENT_MODE: Mode
        C_BLOCK_COMMENT_MODE: Mode
        HASH_COMMENT_MODE: Mode
        NUMBER_MODE: Mode
        C_NUMBER_MODE: Mode
        BINARY_NUMBER_MODE: Mode
        REGEXP_MODE: Mode
        TITLE_MODE: Mode
        UNDERSCORE_TITLE_MODE: Mode
        METHOD_GUARD: Mode
        END_SAME_AS_BEGIN: (mode: Mode) => Mode
        // built in regex
        IDENT_RE: string
        UNDERSCORE_IDENT_RE: string
        MATCH_NOTHING_RE: string
        NUMBER_RE: string
        C_NUMBER_RE: string
        BINARY_NUMBER_RE: string
        RE_STARTERS_RE: string
    }

    export type LanguageFn = (hljs: HLJSApi) => Language
    export type CompilerExt = (mode: Mode, parent: Mode | Language | null) => void

    export interface HighlightResult {
        code?: string
        relevance : number
        value : string
        language? : string
        illegal : boolean
        errorRaised? : Error
        // * for auto-highlight
        secondBest? : Omit<HighlightResult, 'second_best'>
        // private
        _illegalBy? : illegalData
        _emitter : Emitter
        _top? : Language | CompiledMode
    }
    export interface AutoHighlightResult extends HighlightResult {}

    export interface illegalData {
        message: string
        context: string
        index: number
        resultSoFar : string
        mode: CompiledMode
    }

    export type BeforeHighlightContext = {
        code: string,
        language: string,
        result?: HighlightResult
    }
    export type PluginEvent = keyof HLJSPlugin;
    export type HLJSPlugin = {
        'after:highlight'?: (result: HighlightResult) => void,
        'before:highlight'?: (context: BeforeHighlightContext) => void,
        'after:highlightElement'?: (data: { el: Element, result: HighlightResult, text: string}) => void,
        'before:highlightElement'?: (data: { el: Element, language: string}) => void,
        // TODO: Old API, remove with v12
        'after:highlightBlock'?: (data: { block: Element, result: HighlightResult, text: string}) => void,
        'before:highlightBlock'?: (data: { block: Element, language: string}) => void,
    }

    interface EmitterConstructor {
        new (opts: any): Emitter
    }

    export interface HighlightOptions {
        language: string
        ignoreIllegals?: boolean
    }

    export interface HLJSOptions {
        noHighlightRe: RegExp
        languageDetectRe: RegExp
        classPrefix: string
        cssSelector: string
        languages?: string[]
        __emitter: EmitterConstructor
        ignoreUnescapedHTML?: boolean
        throwUnescapedHTML?: boolean
    }

    export interface CallbackResponse {
        data: Record<string, any>
        ignoreMatch: () => void
        isMatchIgnored: boolean
    }

    export type ModeCallback = (match: RegExpMatchArray, response: CallbackResponse) => void
    export type Language = LanguageDetail & Partial<Mode>
    export interface Mode extends ModeCallbacks, ModeDetails {}

    export interface LanguageDetail {
        name?: string
        unicodeRegex?: boolean
        rawDefinition?: () => Language
        aliases?: string[]
        disableAutodetect?: boolean
        contains: (Mode)[]
        case_insensitive?: boolean
        keywords?: string | string[] | Record<string, string | string[] | RegExp>
        isCompiled?: boolean,
        exports?: any,
        classNameAliases?: Record<string, string>
        compilerExtensions?: CompilerExt[]
        supersetOf?: string
    }

    // technically private, but exported for convenience as this has
    // been a pretty stable API and is quite useful
    export interface Emitter {
        startScope(name: string): void
        endScope(): void
        addText(text: string): void
        toHTML(): string
        finalize(): void
        __addSublanguage(emitter: Emitter, subLanguageName: string): void
    }

    export type HighlightedHTMLElement = HTMLElement & {result?: object, secondBest?: object, parentNode: HTMLElement}

    /* modes */

    interface ModeCallbacks {
        "on:end"?: Function,
        "on:begin"?: ModeCallback
    }

    export interface CompiledLanguage extends LanguageDetail, CompiledMode {
        isCompiled: true
        contains: CompiledMode[]
        keywords: Record<string, any>
    }

    export type CompiledScope = Record<number, string> & {_emit?: Record<number, boolean>, _multi?: boolean, _wrap?: string};

    export type CompiledMode = Omit<Mode, 'contains'> &
        {
            begin?: RegExp | string
            end?: RegExp | string
            scope?: string
            contains: CompiledMode[]
            keywords: KeywordDict
            data: Record<string, any>
            terminatorEnd: string
            keywordPatternRe: RegExp
            beginRe: RegExp
            endRe: RegExp
            illegalRe: RegExp
            matcher: any
            isCompiled: true
            starts?: CompiledMode
            parent?: CompiledMode
            beginScope?: CompiledScope
            endScope?: CompiledScope
        }

    interface ModeDetails {
        begin?: RegExp | string | (RegExp | string)[]
        match?: RegExp | string | (RegExp | string)[]
        end?: RegExp | string | (RegExp | string)[]
        // deprecated in favor of `scope`
        className?: string
        scope?: string | Record<number, string>
        beginScope?: string | Record<number, string>
        endScope?: string | Record<number, string>
        contains?: ("self" | Mode)[]
        endsParent?: boolean
        endsWithParent?: boolean
        endSameAsBegin?: boolean
        skip?: boolean
        excludeBegin?: boolean
        excludeEnd?: boolean
        returnBegin?: boolean
        returnEnd?: boolean
        __beforeBegin?: Function
        parent?: Mode
        starts?:Mode
        lexemes?: string | RegExp
        keywords?: string | string[] | Record<string, string | string[]>
        beginKeywords?: string
        relevance?: number
        illegal?: string | RegExp | Array<string | RegExp>
        variants?: Mode[]
        cachedVariants?: Mode[]
        // parsed
        subLanguage?: string | string[]
        isCompiled?: boolean
        label?: string
    }

    const hljs : HLJSApi;
    export default hljs;

}

declare module 'highlight.js/lib/languages/*' {
    import { LanguageFn } from "highlight.js";
    const defineLanguage: LanguageFn;
    export default defineLanguage;
}
