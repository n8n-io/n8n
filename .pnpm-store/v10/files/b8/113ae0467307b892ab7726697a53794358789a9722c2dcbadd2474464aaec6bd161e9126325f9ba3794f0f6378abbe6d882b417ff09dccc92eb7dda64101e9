import { SpecVersion, SpecMajorVersion } from '../oas-types';
import type { NormalizedProblem } from '../walk';
import type { Oas2RuleSet, Oas3RuleSet, Async3RuleSet, Arazzo1RuleSet, Overlay1RuleSet } from '../oas-types';
import type { NodeType } from '../types';
import type { DecoratorConfig, Plugin, PreprocessorConfig, Region, ResolveConfig, ResolvedApi, ResolvedConfig, ResolvedStyleguideConfig, RuleConfig, RuleSettings, Telemetry, ThemeRawConfig } from './types';
export declare const IGNORE_FILE = ".redocly.lint-ignore.yaml";
export declare class StyleguideConfig {
    rawConfig: ResolvedStyleguideConfig;
    configFile?: string | undefined;
    plugins: Plugin[];
    ignore: Record<string, Record<string, Set<string>>>;
    doNotResolveExamples: boolean;
    rules: Record<SpecVersion, Record<string, RuleConfig>>;
    preprocessors: Record<SpecVersion, Record<string, PreprocessorConfig>>;
    decorators: Record<SpecVersion, Record<string, DecoratorConfig>>;
    private _usedRules;
    private _usedVersions;
    recommendedFallback: boolean;
    extendPaths: string[];
    pluginPaths: string[];
    constructor(rawConfig: ResolvedStyleguideConfig, configFile?: string | undefined);
    resolveIgnore(ignoreFile?: string): void;
    saveIgnore(): void;
    addIgnore(problem: NormalizedProblem): void;
    addProblemToIgnore(problem: NormalizedProblem): NormalizedProblem;
    extendTypes(types: Record<string, NodeType>, version: SpecVersion): Record<string, NodeType>;
    getRuleSettings(ruleId: string, oasVersion: SpecVersion): RuleSettings;
    getPreprocessorSettings(ruleId: string, oasVersion: SpecVersion): RuleSettings;
    getDecoratorSettings(ruleId: string, oasVersion: SpecVersion): RuleSettings;
    getUnusedRules(): {
        rules: string[];
        preprocessors: string[];
        decorators: string[];
    };
    getRulesForSpecVersion(version: SpecMajorVersion): Oas3RuleSet[] | Oas2RuleSet[] | Async3RuleSet[] | Arazzo1RuleSet[] | Overlay1RuleSet[];
    skipRules(rules?: string[]): void;
    skipPreprocessors(preprocessors?: string[]): void;
    skipDecorators(decorators?: string[]): void;
}
export declare class Config {
    rawConfig: ResolvedConfig;
    configFile?: string | undefined;
    apis: Record<string, ResolvedApi>;
    styleguide: StyleguideConfig;
    resolve: ResolveConfig;
    licenseKey?: string;
    region?: Region;
    theme: ThemeRawConfig;
    organization?: string;
    files: string[];
    telemetry?: Telemetry;
    constructor(rawConfig: ResolvedConfig, configFile?: string | undefined);
}
