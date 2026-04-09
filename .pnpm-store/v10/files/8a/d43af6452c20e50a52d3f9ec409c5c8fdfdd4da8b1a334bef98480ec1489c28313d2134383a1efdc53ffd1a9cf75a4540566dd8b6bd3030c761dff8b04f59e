import type { BuiltInAsync2RuleId, BuiltInAsync3RuleId, BuiltInArazzo1RuleId, BuiltInOAS2RuleId, BuiltInOAS3RuleId, BuiltInOverlay1RuleId } from './types/redocly-yaml';
import type { Oas3Rule, Oas3Preprocessor, Oas2Rule, Oas2Preprocessor, Async2Preprocessor, Async2Rule, Async3Preprocessor, Async3Rule, Arazzo1Preprocessor, Arazzo1Rule, Overlay1Preprocessor, Overlay1Rule } from './visitors';
export declare enum SpecVersion {
    OAS2 = "oas2",
    OAS3_0 = "oas3_0",
    OAS3_1 = "oas3_1",
    Async2 = "async2",
    Async3 = "async3",
    Arazzo1 = "arazzo1",
    Overlay1 = "overlay1"
}
export declare enum SpecMajorVersion {
    OAS2 = "oas2",
    OAS3 = "oas3",
    Async2 = "async2",
    Async3 = "async3",
    Arazzo1 = "arazzo1",
    Overlay1 = "overlay1"
}
export type RuleMap<Key extends string, RuleConfig, T> = Record<T extends 'built-in' ? Key : string, RuleConfig>;
export type Oas3RuleSet<T = undefined> = RuleMap<BuiltInOAS3RuleId | 'struct' | 'assertions', Oas3Rule, T>;
export type Oas2RuleSet<T = undefined> = RuleMap<BuiltInOAS2RuleId | 'struct' | 'assertions', Oas2Rule, T>;
export type Async2RuleSet<T = undefined> = RuleMap<BuiltInAsync2RuleId | 'struct' | 'assertions', Async2Rule, T>;
export type Async3RuleSet<T = undefined> = RuleMap<BuiltInAsync3RuleId | 'struct' | 'assertions', Async3Rule, T>;
export type Arazzo1RuleSet<T = undefined> = RuleMap<BuiltInArazzo1RuleId | 'struct' | 'assertions', Arazzo1Rule, T>;
export type Overlay1RuleSet<T = undefined> = RuleMap<BuiltInOverlay1RuleId | 'struct' | 'assertions', Overlay1Rule, T>;
export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;
export type Oas2PreprocessorsSet = Record<string, Oas2Preprocessor>;
export type Async2PreprocessorsSet = Record<string, Async2Preprocessor>;
export type Async3PreprocessorsSet = Record<string, Async3Preprocessor>;
export type Arazzo1PreprocessorsSet = Record<string, Arazzo1Preprocessor>;
export type Overlay1PreprocessorsSet = Record<string, Overlay1Preprocessor>;
export type Oas3DecoratorsSet = Record<string, Oas3Preprocessor>;
export type Oas2DecoratorsSet = Record<string, Oas2Preprocessor>;
export type Async2DecoratorsSet = Record<string, Async2Preprocessor>;
export type Async3DecoratorsSet = Record<string, Async3Preprocessor>;
export type Arazzo1DecoratorsSet = Record<string, Arazzo1Preprocessor>;
export type Overlay1DecoratorsSet = Record<string, Overlay1Preprocessor>;
export declare function detectSpec(root: unknown): SpecVersion;
export declare function getMajorSpecVersion(version: SpecVersion): SpecMajorVersion;
export declare function getTypes(spec: SpecVersion): Record<string, import("./types").NodeType> | Record<"Root" | "Tag" | "TagList" | "ExternalDocs" | "SecurityRequirement" | "SecurityRequirementList" | "Info" | "Contact" | "License" | "Paths" | "PathItem" | "Parameter" | "ParameterList" | "ParameterItems" | "Operation" | "Example" | "ExamplesMap" | "Examples" | "Header" | "Responses" | "Response" | "Schema" | "Xml" | "SchemaProperties" | "NamedSchemas" | "NamedResponses" | "NamedParameters" | "NamedSecuritySchemes" | "SecurityScheme" | "TagGroup" | "TagGroups" | "EnumDescriptions" | "Logo" | "XCodeSample" | "XCodeSampleList" | "XServer" | "XServerList", import("./types").NodeType> | Record<"Root" | "Tag" | "TagList" | "ExternalDocs" | "SecurityRequirement" | "SecurityRequirementList" | "Info" | "Contact" | "License" | "Paths" | "PathItem" | "Parameter" | "ParameterList" | "Operation" | "Example" | "ExamplesMap" | "Header" | "Responses" | "Response" | "Schema" | "Xml" | "SchemaProperties" | "NamedSchemas" | "NamedResponses" | "NamedParameters" | "NamedSecuritySchemes" | "SecurityScheme" | "TagGroup" | "TagGroups" | "EnumDescriptions" | "Logo" | "XCodeSample" | "XCodeSampleList" | "Server" | "ServerList" | "ServerVariable" | "ServerVariablesMap" | "Callback" | "CallbacksMap" | "RequestBody" | "MediaTypesMap" | "MediaType" | "Encoding" | "EncodingMap" | "HeadersMap" | "Link" | "LinksMap" | "DiscriminatorMapping" | "Discriminator" | "Components" | "NamedExamples" | "NamedRequestBodies" | "NamedHeaders" | "NamedLinks" | "NamedCallbacks" | "ImplicitFlow" | "PasswordFlow" | "ClientCredentials" | "AuthorizationCode" | "OAuth2Flows" | "XUsePkce" | "WebhooksMap", import("./types").NodeType> | Record<"Root" | "Info" | "License" | "Operation" | "Schema" | "SchemaProperties" | "SecurityScheme" | "Components" | "PatternProperties" | "NamedPathItems" | "DependentRequired", import("./types").NodeType>;
