import type { Location } from '../ref-utils';
import type { ProblemSeverity, UserContext } from '../walk';
import type { Oas3PreprocessorsSet, SpecMajorVersion, Oas3DecoratorsSet, Oas2RuleSet, Oas2PreprocessorsSet, Oas2DecoratorsSet, Oas3RuleSet, SpecVersion, Async2PreprocessorsSet, Async2DecoratorsSet, Async2RuleSet, Async3PreprocessorsSet, Async3DecoratorsSet, Async3RuleSet, Arazzo1RuleSet, Arazzo1PreprocessorsSet, Arazzo1DecoratorsSet, RuleMap, Overlay1PreprocessorsSet, Overlay1DecoratorsSet, Overlay1RuleSet } from '../oas-types';
import type { NodeType } from '../types';
import type { SkipFunctionContext } from '../visitors';
import type { JSONSchema } from 'json-schema-to-ts';
export type RuleSeverity = ProblemSeverity | 'off';
export type RuleSettings = {
    severity: RuleSeverity;
    message?: string;
};
export type PreprocessorSeverity = RuleSeverity | 'on';
export type RuleConfig = RuleSeverity | (Partial<RuleSettings> & Record<string, any>);
export type PreprocessorConfig = PreprocessorSeverity | ({
    severity?: ProblemSeverity;
} & Record<string, any>);
export type DecoratorConfig = PreprocessorConfig;
export type StyleguideRawConfig<T = undefined> = {
    plugins?: (string | Plugin)[];
    extends?: string[];
    doNotResolveExamples?: boolean;
    recommendedFallback?: boolean;
    rules?: RuleMap<string, RuleConfig, T>;
    oas2Rules?: RuleMap<string, RuleConfig, T>;
    oas3_0Rules?: RuleMap<string, RuleConfig, T>;
    oas3_1Rules?: RuleMap<string, RuleConfig, T>;
    async2Rules?: RuleMap<string, RuleConfig, T>;
    async3Rules?: RuleMap<string, RuleConfig, T>;
    arazzo1Rules?: RuleMap<string, RuleConfig, T>;
    overlay1Rules?: RuleMap<string, RuleConfig, T>;
    preprocessors?: Record<string, PreprocessorConfig>;
    oas2Preprocessors?: Record<string, PreprocessorConfig>;
    oas3_0Preprocessors?: Record<string, PreprocessorConfig>;
    oas3_1Preprocessors?: Record<string, PreprocessorConfig>;
    async2Preprocessors?: Record<string, PreprocessorConfig>;
    async3Preprocessors?: Record<string, PreprocessorConfig>;
    arazzo1Preprocessors?: Record<string, PreprocessorConfig>;
    overlay1Preprocessors?: Record<string, PreprocessorConfig>;
    decorators?: Record<string, DecoratorConfig>;
    oas2Decorators?: Record<string, DecoratorConfig>;
    oas3_0Decorators?: Record<string, DecoratorConfig>;
    oas3_1Decorators?: Record<string, DecoratorConfig>;
    async2Decorators?: Record<string, DecoratorConfig>;
    async3Decorators?: Record<string, DecoratorConfig>;
    arazzo1Decorators?: Record<string, DecoratorConfig>;
    overlay1Decorators?: Record<string, DecoratorConfig>;
};
export type ApiStyleguideRawConfig = Omit<StyleguideRawConfig, 'plugins'>;
export type ResolvedStyleguideConfig = PluginStyleguideConfig & {
    plugins?: Plugin[];
    recommendedFallback?: boolean;
    extends?: void | never;
    extendPaths?: string[];
    pluginPaths?: string[];
};
export type PreprocessorsConfig = {
    oas3?: Oas3PreprocessorsSet;
    oas2?: Oas2PreprocessorsSet;
    async2?: Async2PreprocessorsSet;
    async3?: Async3PreprocessorsSet;
    arazzo1?: Arazzo1PreprocessorsSet;
    overlay1?: Overlay1PreprocessorsSet;
};
export type DecoratorsConfig = {
    oas3?: Oas3DecoratorsSet;
    oas2?: Oas2DecoratorsSet;
    async2?: Async2DecoratorsSet;
    async3?: Async3DecoratorsSet;
    arazzo1?: Arazzo1DecoratorsSet;
    overlay1?: Overlay1DecoratorsSet;
};
export type TypesExtensionFn = (types: Record<string, NodeType>, oasVersion: SpecVersion) => Record<string, NodeType>;
export type TypeExtensionsConfig = Partial<Record<SpecMajorVersion, TypesExtensionFn>>;
export type RulesConfig<T> = {
    oas3?: Oas3RuleSet<T>;
    oas2?: Oas2RuleSet<T>;
    async2?: Async2RuleSet<T>;
    async3?: Async3RuleSet<T>;
    arazzo1?: Arazzo1RuleSet<T>;
    overlay1?: Overlay1RuleSet<T>;
};
export type CustomRulesConfig = RulesConfig<undefined>;
export type AssertionContext = Partial<UserContext> & SkipFunctionContext & {
    node: any;
};
export type AssertResult = {
    message?: string;
    location?: Location;
};
export type CustomFunction = (value: any, options: unknown, baseLocation: Location) => AssertResult[];
export type AssertionsConfig = Record<string, CustomFunction>;
export type Plugin<T = undefined> = {
    id: string;
    configs?: Record<string, PluginStyleguideConfig>;
    rules?: RulesConfig<T>;
    preprocessors?: PreprocessorsConfig;
    decorators?: DecoratorsConfig;
    typeExtension?: TypeExtensionsConfig;
    assertions?: AssertionsConfig;
    path?: string;
    absolutePath?: string;
    processContent?: (actions: any, content: any) => Promise<void> | void;
    afterRoutesCreated?: (actions: any, content: any) => Promise<void> | void;
    loaders?: Record<string, (path: string, context: any, reportError: (error: Error) => void) => Promise<unknown>>;
    requiredEntitlements?: string[];
    ssoConfigSchema?: JSONSchema;
    redoclyConfigSchema?: JSONSchema;
    ejectIgnore?: string[];
};
type PluginCreatorOptions = {
    contentDir: string;
};
export type PluginCreator = (options: PluginCreatorOptions) => Plugin | Promise<Plugin>;
export type ImportedPlugin = {
    default?: PluginCreator;
} | PluginCreator | Plugin;
export type PluginStyleguideConfig<T = undefined> = Omit<StyleguideRawConfig<T>, 'plugins' | 'extends'>;
export type ResolveHeader = {
    name: string;
    envVariable?: undefined;
    value: string;
    matches: string;
} | {
    name: string;
    value?: undefined;
    envVariable: string;
    matches: string;
};
export type RawResolveConfig = {
    http?: Partial<HttpResolveConfig>;
    doNotResolveExamples?: boolean;
};
export type HttpResolveConfig = {
    headers: ResolveHeader[];
    customFetch?: Function;
};
export type ResolveConfig = {
    http: HttpResolveConfig;
};
export type Region = 'us' | 'eu';
export type Telemetry = 'on' | 'off';
export type AccessTokens = {
    [region in Region]?: string;
};
export type DeprecatedInRawConfig = {
    apiDefinitions?: Record<string, string>;
    lint?: StyleguideRawConfig;
    styleguide?: StyleguideRawConfig;
    referenceDocs?: Record<string, any>;
    apis?: Record<string, Api & DeprecatedInApi>;
} & DeprecatedFeaturesConfig;
export type Api = {
    root: string;
    output?: string;
    styleguide?: ApiStyleguideRawConfig;
} & ThemeConfig;
export type DeprecatedInApi = {
    lint?: ApiStyleguideRawConfig;
} & DeprecatedFeaturesConfig;
export type ResolvedApi = Omit<Api, 'styleguide'> & {
    styleguide: ResolvedStyleguideConfig;
    files?: string[];
};
export type RawConfig = {
    apis?: Record<string, Api>;
    styleguide?: StyleguideRawConfig;
    resolve?: RawResolveConfig;
    region?: Region;
    organization?: string;
    files?: string[];
    telemetry?: Telemetry;
} & ThemeConfig;
export type RawUniversalConfig = Omit<RawConfig, 'styleguide'> & StyleguideRawConfig;
export type FlatApi = Omit<Api, 'styleguide'> & Omit<ApiStyleguideRawConfig, 'doNotResolveExamples'>;
export type FlatRawConfig = Omit<RawConfig, 'styleguide' | 'resolve' | 'apis'> & Omit<StyleguideRawConfig, 'doNotResolveExamples'> & {
    resolve?: RawResolveConfig;
    apis?: Record<string, FlatApi>;
} & ThemeRawConfig;
export type ResolvedConfig = Omit<RawConfig, 'apis' | 'styleguide'> & {
    apis: Record<string, ResolvedApi>;
    styleguide: ResolvedStyleguideConfig;
};
type DeprecatedFeaturesConfig = {
    'features.openapi'?: Record<string, any>;
    'features.mockServer'?: Record<string, any>;
};
export type ThemeConfig = {
    theme?: ThemeRawConfig;
};
export type ThemeRawConfig = {
    openapi?: Record<string, any>;
    mockServer?: Record<string, any>;
};
export type RulesFields = 'rules' | 'oas2Rules' | 'oas3_0Rules' | 'oas3_1Rules' | 'async2Rules' | 'async3Rules' | 'arazzo1Rules' | 'overlay1Rules' | 'preprocessors' | 'oas2Preprocessors' | 'oas3_0Preprocessors' | 'oas3_1Preprocessors' | 'async2Preprocessors' | 'async3Preprocessors' | 'arazzo1Preprocessors' | 'overlay1Preprocessors' | 'decorators' | 'oas2Decorators' | 'oas3_0Decorators' | 'oas3_1Decorators' | 'async2Decorators' | 'async3Decorators' | 'arazzo1Decorators' | 'overlay1Decorators';
export {};
