import type { NormalizedNodeType } from './types';
import type { Stack } from './utils';
import type { UserContext, ResolveResult, ProblemSeverity } from './walk';
import type { Location } from './ref-utils';
import type { Oas3Definition, Oas3_1Definition, Oas3ExternalDocs, Oas3Info, Oas3Contact, Oas3Components, Oas3_1Components, Oas3License, Oas3Schema, Oas3_1Schema, Oas3Header, Oas3Parameter, Oas3Operation, Oas3PathItem, Oas3ServerVariable, Oas3Server, Oas3MediaType, Oas3Response, Oas3Example, Oas3RequestBody, Oas3Tag, OasRef, Oas3SecurityScheme, Oas3SecurityRequirement, Oas3Encoding, Oas3Link, Oas3Xml, Oas3Discriminator, Oas3Callback } from './typings/openapi';
import type { Oas2Definition, Oas2Tag, Oas2ExternalDocs, Oas2SecurityRequirement, Oas2Info, Oas2Contact, Oas2License, Oas2PathItem, Oas2Operation, Oas2Header, Oas2Response, Oas2Schema, Oas2Xml, Oas2Parameter, Oas2SecurityScheme } from './typings/swagger';
import type { Async2Definition } from './typings/asyncapi';
import type { Async3Definition } from './typings/asyncapi3';
import type { ArazzoDefinition, ArazzoSourceDescription, CriteriaObject, ExtendedOperation, InfoObject, OnFailureObject, OnSuccessObject, OpenAPISourceDescription, Parameter, Replacement, RequestBody, SourceDescription, Step, Workflow } from './typings/arazzo';
export type SkipFunctionContext = Pick<UserContext, 'location' | 'rawNode' | 'resolve' | 'rawLocation'>;
export type VisitFunction<T> = (node: T, ctx: UserContext & {
    ignoreNextVisitorsOnNode: () => void;
}, parents?: any, context?: any) => void;
type VisitRefFunction = (node: OasRef, ctx: UserContext, resolved: ResolveResult<any>) => void;
type SkipFunction<T> = (node: T, key: string | number, ctx: SkipFunctionContext) => boolean;
type VisitObject<T> = {
    enter?: VisitFunction<T>;
    leave?: VisitFunction<T>;
    skip?: SkipFunction<T>;
};
export type NestedVisitObject<T, P> = VisitObject<T> & NestedVisitor<P>;
type VisitFunctionOrObject<T> = VisitFunction<T> | VisitObject<T>;
export type VisitorNode<T> = {
    ruleId: string;
    severity: ProblemSeverity;
    message?: string;
    context: VisitorLevelContext | VisitorSkippedLevelContext;
    depth: number;
    visit: VisitFunction<T>;
    skip?: SkipFunction<T>;
};
type VisitorRefNode = {
    ruleId: string;
    severity: ProblemSeverity;
    message?: string;
    context: VisitorLevelContext;
    depth: number;
    visit: VisitRefFunction;
};
export type VisitorLevelContext = {
    isSkippedLevel: false;
    type: NormalizedNodeType;
    parent: VisitorLevelContext | null;
    activatedOn: Stack<{
        node?: any;
        withParentNode?: any;
        skipped: boolean;
        nextLevelTypeActivated: Stack<NormalizedNodeType>;
        location?: Location;
    }>;
};
export type VisitorSkippedLevelContext = {
    isSkippedLevel: true;
    parent: VisitorLevelContext;
    seen: Set<any>;
};
export type NormalizeVisitor<Fn> = Fn extends VisitFunction<infer T> ? VisitorNode<T> : never;
export type BaseVisitor = {
    any?: {
        enter?: VisitFunction<any>;
        leave?: VisitFunction<any>;
        skip?: SkipFunction<any>;
    } | VisitFunction<any>;
    ref?: {
        enter?: VisitRefFunction;
        leave?: VisitRefFunction;
    } | VisitRefFunction;
};
type Oas3FlatVisitor = {
    Root?: VisitFunctionOrObject<Oas3Definition | Oas3_1Definition>;
    Tag?: VisitFunctionOrObject<Oas3Tag>;
    ExternalDocs?: VisitFunctionOrObject<Oas3ExternalDocs>;
    Server?: VisitFunctionOrObject<Oas3Server>;
    ServerVariable?: VisitFunctionOrObject<Oas3ServerVariable>;
    SecurityRequirement?: VisitFunctionOrObject<Oas3SecurityRequirement>;
    Info?: VisitFunctionOrObject<Oas3Info>;
    Contact?: VisitFunctionOrObject<Oas3Contact>;
    License?: VisitFunctionOrObject<Oas3License>;
    Paths?: VisitFunctionOrObject<Record<string, Oas3PathItem<Oas3Schema | Oas3_1Schema>>>;
    PathItem?: VisitFunctionOrObject<Oas3PathItem<Oas3Schema | Oas3_1Schema>>;
    Callback?: VisitFunctionOrObject<Oas3Callback<Oas3Schema | Oas3_1Schema>>;
    CallbacksMap?: VisitFunctionOrObject<Record<string, Oas3Callback<Oas3Schema | Oas3_1Schema>>>;
    Parameter?: VisitFunctionOrObject<Oas3Parameter<Oas3Schema | Oas3_1Schema>>;
    Operation?: VisitFunctionOrObject<Oas3Operation<Oas3Schema | Oas3_1Schema>>;
    RequestBody?: VisitFunctionOrObject<Oas3RequestBody<Oas3Schema | Oas3_1Schema>>;
    MediaTypesMap?: VisitFunctionOrObject<Record<string, Oas3MediaType<Oas3Schema | Oas3_1Schema>>>;
    MediaType?: VisitFunctionOrObject<Oas3MediaType<Oas3Schema | Oas3_1Schema>>;
    Example?: VisitFunctionOrObject<Oas3Example>;
    Encoding?: VisitFunctionOrObject<Oas3Encoding<Oas3Schema | Oas3_1Schema>>;
    Header?: VisitFunctionOrObject<Oas3Header<Oas3Schema | Oas3_1Schema>>;
    Responses?: VisitFunctionOrObject<Record<string, Oas3Response<Oas3Schema | Oas3_1Schema>>>;
    Response?: VisitFunctionOrObject<Oas3Response<Oas3Schema | Oas3_1Schema>>;
    Link?: VisitFunctionOrObject<Oas3Link>;
    Schema?: VisitFunctionOrObject<Oas3Schema | Oas3_1Schema>;
    Xml?: VisitFunctionOrObject<Oas3Xml>;
    SchemaProperties?: VisitFunctionOrObject<Record<string, Oas3Schema>>;
    DiscriminatorMapping?: VisitFunctionOrObject<Record<string, string>>;
    Discriminator?: VisitFunctionOrObject<Oas3Discriminator>;
    Components?: VisitFunctionOrObject<Oas3Components | Oas3_1Components>;
    NamedSchemas?: VisitFunctionOrObject<Record<string, Oas3Schema>>;
    NamedResponses?: VisitFunctionOrObject<Record<string, Oas3Response<Oas3Schema | Oas3_1Schema>>>;
    NamedParameters?: VisitFunctionOrObject<Record<string, Oas3Parameter<Oas3Schema | Oas3_1Schema>>>;
    NamedExamples?: VisitFunctionOrObject<Record<string, Oas3Example>>;
    NamedRequestBodies?: VisitFunctionOrObject<Record<string, Oas3RequestBody<Oas3Schema | Oas3_1Schema>>>;
    NamedHeaders?: VisitFunctionOrObject<Record<string, Oas3Header<Oas3Schema | Oas3_1Schema>>>;
    NamedSecuritySchemes?: VisitFunctionOrObject<Record<string, Oas3SecurityScheme>>;
    NamedLinks?: VisitFunctionOrObject<Record<string, Oas3Link>>;
    NamedCallbacks?: VisitFunctionOrObject<Record<string, Oas3Callback<Oas3Schema | Oas3_1Schema>>>;
    ImplicitFlow?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['implicit']>;
    PasswordFlow?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['password']>;
    ClientCredentials?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['clientCredentials']>;
    AuthorizationCode?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['authorizationCode']>;
    OAuth2Flows?: VisitFunctionOrObject<Oas3SecurityScheme['flows']>;
    SecurityScheme?: VisitFunctionOrObject<Oas3SecurityScheme>;
    SpecExtension?: VisitFunctionOrObject<unknown>;
};
type Oas2FlatVisitor = {
    Root?: VisitFunctionOrObject<Oas2Definition>;
    Tag?: VisitFunctionOrObject<Oas2Tag>;
    ExternalDocs?: VisitFunctionOrObject<Oas2ExternalDocs>;
    SecurityRequirement?: VisitFunctionOrObject<Oas2SecurityRequirement>;
    Info?: VisitFunctionOrObject<Oas2Info>;
    Contact?: VisitFunctionOrObject<Oas2Contact>;
    License?: VisitFunctionOrObject<Oas2License>;
    Paths?: VisitFunctionOrObject<Record<string, Oas2PathItem>>;
    PathItem?: VisitFunctionOrObject<Oas2PathItem>;
    Parameter?: VisitFunctionOrObject<any>;
    Operation?: VisitFunctionOrObject<Oas2Operation>;
    Examples?: VisitFunctionOrObject<Record<string, any>>;
    Header?: VisitFunctionOrObject<Oas2Header>;
    Responses?: VisitFunctionOrObject<Record<string, Oas2Response>>;
    Response?: VisitFunctionOrObject<Oas2Response>;
    Schema?: VisitFunctionOrObject<Oas2Schema>;
    Xml?: VisitFunctionOrObject<Oas2Xml>;
    SchemaProperties?: VisitFunctionOrObject<Record<string, Oas2Schema>>;
    NamedSchemas?: VisitFunctionOrObject<Record<string, Oas2Schema>>;
    NamedResponses?: VisitFunctionOrObject<Record<string, Oas2Response>>;
    NamedParameters?: VisitFunctionOrObject<Record<string, Oas2Parameter>>;
    SecurityScheme?: VisitFunctionOrObject<Oas2SecurityScheme>;
    NamedSecuritySchemes?: VisitFunctionOrObject<Record<string, Oas2SecurityScheme>>;
    SpecExtension?: VisitFunctionOrObject<unknown>;
};
type Async2FlatVisitor = {
    Root?: VisitFunctionOrObject<Async2Definition>;
};
type Async3FlatVisitor = {
    Root?: VisitFunctionOrObject<Async3Definition>;
};
type ArazzoFlatVisitor = {
    Root?: VisitFunctionOrObject<ArazzoDefinition>;
    ParameterObject?: VisitFunctionOrObject<Parameter>;
    InfoObject?: VisitFunctionOrObject<InfoObject>;
    OpenAPISourceDescription?: VisitFunctionOrObject<OpenAPISourceDescription>;
    ArazzoSourceDescription?: VisitFunctionOrObject<ArazzoSourceDescription>;
    SourceDescription?: VisitFunctionOrObject<SourceDescription>;
    ExtendedOperation?: VisitFunctionOrObject<ExtendedOperation>;
    Replacement?: VisitFunctionOrObject<Replacement>;
    RequestBody?: VisitFunctionOrObject<RequestBody>;
    CriteriaObject?: VisitFunctionOrObject<CriteriaObject>;
    OnSuccessObject?: VisitFunctionOrObject<OnSuccessObject>;
    OnFailureObject?: VisitFunctionOrObject<OnFailureObject>;
    Step?: VisitFunctionOrObject<Step>;
    Steps?: VisitFunctionOrObject<Step[]>;
    Workflow?: VisitFunctionOrObject<Workflow>;
    Workflows?: VisitFunctionOrObject<Workflow[]>;
};
type Oas3NestedVisitor = {
    [T in keyof Oas3FlatVisitor]: Oas3FlatVisitor[T] extends Function ? Oas3FlatVisitor[T] : Oas3FlatVisitor[T] & NestedVisitor<Oas3NestedVisitor>;
};
type Oas2NestedVisitor = {
    [T in keyof Oas2FlatVisitor]: Oas2FlatVisitor[T] extends Function ? Oas2FlatVisitor[T] : Oas2FlatVisitor[T] & NestedVisitor<Oas2NestedVisitor>;
};
type Async2NestedVisitor = {
    [T in keyof Async2FlatVisitor]: Async2FlatVisitor[T] extends Function ? Async2FlatVisitor[T] : Async2FlatVisitor[T] & NestedVisitor<Async2NestedVisitor>;
};
type Async3NestedVisitor = {
    [T in keyof Async3FlatVisitor]: Async3FlatVisitor[T] extends Function ? Async3FlatVisitor[T] : Async3FlatVisitor[T] & NestedVisitor<Async3NestedVisitor>;
};
type ArazzoNestedVisitor = {
    [T in keyof ArazzoFlatVisitor]: ArazzoFlatVisitor[T] extends Function ? ArazzoFlatVisitor[T] : ArazzoFlatVisitor[T] & NestedVisitor<ArazzoNestedVisitor>;
};
export type Oas3Visitor = BaseVisitor & Oas3NestedVisitor & Record<string, VisitFunction<any> | NestedVisitObject<any, Oas3NestedVisitor>>;
export type Oas2Visitor = BaseVisitor & Oas2NestedVisitor & Record<string, VisitFunction<any> | NestedVisitObject<any, Oas2NestedVisitor>>;
export type Async2Visitor = BaseVisitor & Async2NestedVisitor & Record<string, VisitFunction<any> | NestedVisitObject<any, Async2NestedVisitor>>;
export type Async3Visitor = BaseVisitor & Async3NestedVisitor & Record<string, VisitFunction<any> | NestedVisitObject<any, Async3NestedVisitor>>;
export type Arazzo1Visitor = BaseVisitor & ArazzoNestedVisitor & Record<string, VisitFunction<any> | NestedVisitObject<any, ArazzoNestedVisitor>>;
export type NestedVisitor<T> = Exclude<T, 'any' | 'ref' | 'Root'>;
export type NormalizedOasVisitors<T extends BaseVisitor> = {
    [V in keyof T]-?: {
        enter: Array<NormalizeVisitor<T[V]>>;
        leave: Array<NormalizeVisitor<T[V]>>;
    };
} & {
    ref: {
        enter: Array<VisitorRefNode>;
        leave: Array<VisitorRefNode>;
    };
    [k: string]: {
        enter: Array<VisitorNode<any>>;
        leave: Array<VisitorNode<any>>;
    };
};
export type Oas3Rule = (options: Record<string, any>) => Oas3Visitor | Oas3Visitor[];
export type Oas2Rule = (options: Record<string, any>) => Oas2Visitor | Oas2Visitor[];
export type Async2Rule = (options: Record<string, any>) => Async2Visitor | Async2Visitor[];
export type Async3Rule = (options: Record<string, any>) => Async3Visitor | Async3Visitor[];
export type Arazzo1Rule = (options: Record<string, any>) => Arazzo1Visitor | Arazzo1Visitor[];
export type Oas3Preprocessor = (options: Record<string, any>) => Oas3Visitor;
export type Oas2Preprocessor = (options: Record<string, any>) => Oas2Visitor;
export type Async2Preprocessor = (options: Record<string, any>) => Async2Visitor;
export type Async3Preprocessor = (options: Record<string, any>) => Async3Visitor;
export type Arazzo1Preprocessor = (options: Record<string, any>) => Arazzo1Visitor;
export type Oas3Decorator = (options: Record<string, any>) => Oas3Visitor;
export type Oas2Decorator = (options: Record<string, any>) => Oas2Visitor;
export type Async2Decorator = (options: Record<string, any>) => Async2Visitor;
export type Async3Decorator = (options: Record<string, any>) => Async3Visitor;
export type Arazzo1Decorator = (options: Record<string, any>) => Arazzo1Visitor;
export type OasRule = Oas3Rule;
export type OasPreprocessor = Oas3Preprocessor;
export type OasDecorator = Oas3Decorator;
export type RuleInstanceConfig = {
    ruleId: string;
    severity: ProblemSeverity;
    message?: string;
};
export declare function normalizeVisitors<T extends BaseVisitor>(visitorsConfig: (RuleInstanceConfig & {
    visitor: NestedVisitObject<unknown, T>;
})[], types: Record<keyof T, NormalizedNodeType>): NormalizedOasVisitors<T>;
export {};
