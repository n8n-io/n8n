import { SpecExtension } from './types';

import type { NormalizedNodeType } from './types';
import type { Stack } from './utils';
import type { UserContext, ResolveResult, ProblemSeverity } from './walk';
import type { Location } from './ref-utils';
import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3ExternalDocs,
  Oas3Info,
  Oas3Contact,
  Oas3Components,
  Oas3_1Components,
  Oas3License,
  Oas3Schema,
  Oas3_1Schema,
  Oas3Header,
  Oas3Parameter,
  Oas3Operation,
  Oas3PathItem,
  Oas3ServerVariable,
  Oas3Server,
  Oas3MediaType,
  Oas3Response,
  Oas3Example,
  Oas3RequestBody,
  Oas3Tag,
  OasRef,
  Oas3SecurityScheme,
  Oas3SecurityRequirement,
  Oas3Encoding,
  Oas3Link,
  Oas3Xml,
  Oas3Discriminator,
  Oas3Callback,
} from './typings/openapi';
import type {
  Oas2Definition,
  Oas2Tag,
  Oas2ExternalDocs,
  Oas2SecurityRequirement,
  Oas2Info,
  Oas2Contact,
  Oas2License,
  Oas2PathItem,
  Oas2Operation,
  Oas2Header,
  Oas2Response,
  Oas2Schema,
  Oas2Xml,
  Oas2Parameter,
  Oas2SecurityScheme,
} from './typings/swagger';
import type { Async2Definition } from './typings/asyncapi';
import type { Async3Definition } from './typings/asyncapi3';
import type {
  ArazzoDefinition,
  ArazzoSourceDescription,
  CriteriaObject,
  ExtendedOperation,
  InfoObject,
  OnFailureObject,
  OnSuccessObject,
  OpenAPISourceDescription,
  Parameter,
  Replacement,
  RequestBody,
  SourceDescription,
  Step,
  Workflow,
} from './typings/arazzo';
import type { Overlay1Definition } from './typings/overlay';

export type SkipFunctionContext = Pick<
  UserContext,
  'location' | 'rawNode' | 'resolve' | 'rawLocation'
>;

export type VisitFunction<T> = (
  node: T,
  ctx: UserContext & { ignoreNextVisitorsOnNode: () => void },
  parents?: any,
  context?: any
) => void;

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
  any?:
    | {
        enter?: VisitFunction<any>;
        leave?: VisitFunction<any>;
        skip?: SkipFunction<any>;
      }
    | VisitFunction<any>;

  ref?:
    | {
        enter?: VisitRefFunction;
        leave?: VisitRefFunction;
      }
    | VisitRefFunction;
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
  NamedRequestBodies?: VisitFunctionOrObject<
    Record<string, Oas3RequestBody<Oas3Schema | Oas3_1Schema>>
  >;
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

type Overlay1FlatVisitor = {
  Root?: VisitFunctionOrObject<Overlay1Definition>;
};

const legacyTypesMap = {
  Root: 'DefinitionRoot',
  ServerVariablesMap: 'ServerVariableMap',
  Paths: ['PathMap', 'PathsMap'],
  CallbacksMap: 'CallbackMap',
  MediaTypesMap: 'MediaTypeMap',
  ExamplesMap: 'ExampleMap',
  EncodingMap: 'EncodingsMap',
  HeadersMap: 'HeaderMap',
  LinksMap: 'LinkMap',
  OAuth2Flows: 'SecuritySchemeFlows',
  Responses: 'ResponsesMap',
};

type Oas3NestedVisitor = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [T in keyof Oas3FlatVisitor]: Oas3FlatVisitor[T] extends Function
    ? Oas3FlatVisitor[T]
    : Oas3FlatVisitor[T] & NestedVisitor<Oas3NestedVisitor>;
};

type Oas2NestedVisitor = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [T in keyof Oas2FlatVisitor]: Oas2FlatVisitor[T] extends Function
    ? Oas2FlatVisitor[T]
    : Oas2FlatVisitor[T] & NestedVisitor<Oas2NestedVisitor>;
};

type Async2NestedVisitor = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [T in keyof Async2FlatVisitor]: Async2FlatVisitor[T] extends Function
    ? Async2FlatVisitor[T]
    : Async2FlatVisitor[T] & NestedVisitor<Async2NestedVisitor>;
};

type Async3NestedVisitor = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [T in keyof Async3FlatVisitor]: Async3FlatVisitor[T] extends Function
    ? Async3FlatVisitor[T]
    : Async3FlatVisitor[T] & NestedVisitor<Async3NestedVisitor>;
};

type ArazzoNestedVisitor = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [T in keyof ArazzoFlatVisitor]: ArazzoFlatVisitor[T] extends Function
    ? ArazzoFlatVisitor[T]
    : ArazzoFlatVisitor[T] & NestedVisitor<ArazzoNestedVisitor>;
};

type Overlay1NestedVisitor = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [T in keyof Overlay1FlatVisitor]: Overlay1FlatVisitor[T] extends Function
    ? Overlay1FlatVisitor[T]
    : Overlay1FlatVisitor[T] & NestedVisitor<Overlay1NestedVisitor>;
};

export type Oas3Visitor = BaseVisitor &
  Oas3NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, Oas3NestedVisitor>>;

export type Oas2Visitor = BaseVisitor &
  Oas2NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, Oas2NestedVisitor>>;

export type Async2Visitor = BaseVisitor &
  Async2NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, Async2NestedVisitor>>;

export type Async3Visitor = BaseVisitor &
  Async3NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, Async3NestedVisitor>>;

export type Arazzo1Visitor = BaseVisitor &
  ArazzoNestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, ArazzoNestedVisitor>>;

export type Overlay1Visitor = BaseVisitor &
  Overlay1NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, Overlay1NestedVisitor>>;

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
    // any internal types
    enter: Array<VisitorNode<any>>;
    leave: Array<VisitorNode<any>>;
  };
};

export type Oas3Rule = (options: Record<string, any>) => Oas3Visitor | Oas3Visitor[];
export type Oas2Rule = (options: Record<string, any>) => Oas2Visitor | Oas2Visitor[];
export type Async2Rule = (options: Record<string, any>) => Async2Visitor | Async2Visitor[];
export type Async3Rule = (options: Record<string, any>) => Async3Visitor | Async3Visitor[];
export type Arazzo1Rule = (options: Record<string, any>) => Arazzo1Visitor | Arazzo1Visitor[];
export type Overlay1Rule = (options: Record<string, any>) => Overlay1Visitor | Overlay1Visitor[];
export type Oas3Preprocessor = (options: Record<string, any>) => Oas3Visitor;
export type Oas2Preprocessor = (options: Record<string, any>) => Oas2Visitor;
export type Async2Preprocessor = (options: Record<string, any>) => Async2Visitor;
export type Async3Preprocessor = (options: Record<string, any>) => Async3Visitor;
export type Arazzo1Preprocessor = (options: Record<string, any>) => Arazzo1Visitor;
export type Overlay1Preprocessor = (options: Record<string, any>) => Overlay1Visitor;
export type Oas3Decorator = (options: Record<string, any>) => Oas3Visitor;
export type Oas2Decorator = (options: Record<string, any>) => Oas2Visitor;
export type Async2Decorator = (options: Record<string, any>) => Async2Visitor;
export type Async3Decorator = (options: Record<string, any>) => Async3Visitor;
export type Arazzo1Decorator = (options: Record<string, any>) => Arazzo1Visitor;
export type Overlay1Decorator = (options: Record<string, any>) => Overlay1Visitor;

// alias for the latest version supported
// every time we update it - consider semver
export type OasRule = Oas3Rule;
export type OasPreprocessor = Oas3Preprocessor;
export type OasDecorator = Oas3Decorator;

export type RuleInstanceConfig = {
  ruleId: string;
  severity: ProblemSeverity;
  message?: string;
};

export function normalizeVisitors<T extends BaseVisitor>(
  visitorsConfig: (RuleInstanceConfig & { visitor: NestedVisitObject<unknown, T> })[],
  types: Record<keyof T, NormalizedNodeType>
): NormalizedOasVisitors<T> {
  const normalizedVisitors: NormalizedOasVisitors<T> = {} as any;

  normalizedVisitors.any = {
    enter: [],
    leave: [],
  };

  for (const typeName of Object.keys(types) as Array<keyof T>) {
    normalizedVisitors[typeName] = {
      enter: [],
      leave: [],
    } as any;
  }

  normalizedVisitors.ref = {
    enter: [],
    leave: [],
  };

  for (const { ruleId, severity, message, visitor } of visitorsConfig) {
    normalizeVisitorLevel({ ruleId, severity, message }, visitor, null);
  }

  for (const v of Object.keys(normalizedVisitors)) {
    normalizedVisitors[v].enter.sort((a, b) => b.depth - a.depth);
    normalizedVisitors[v].leave.sort((a, b) => a.depth - b.depth);
  }

  return normalizedVisitors;

  function addWeakNodes(
    ruleConf: RuleInstanceConfig,
    from: NormalizedNodeType,
    to: NormalizedNodeType,
    parentContext: VisitorLevelContext,
    stack: NormalizedNodeType[] = []
  ) {
    if (stack.includes(from)) return;

    stack = [...stack, from];

    const possibleChildren = new Set<NormalizedNodeType>();

    for (const type of Object.values(from.properties)) {
      if (type === to) {
        addWeakFromStack(ruleConf, stack);
        continue;
      }
      if (typeof type === 'object' && type !== null && type.name) {
        possibleChildren.add(type);
      }
    }
    if (from.additionalProperties && typeof from.additionalProperties !== 'function') {
      if (from.additionalProperties === to) {
        addWeakFromStack(ruleConf, stack);
      } else if (from.additionalProperties.name !== undefined) {
        possibleChildren.add(from.additionalProperties);
      }
    }
    if (from.items && typeof from.items !== 'function') {
      if (from.items === to) {
        addWeakFromStack(ruleConf, stack);
      } else if (from.items.name !== undefined) {
        possibleChildren.add(from.items);
      }
    }

    if (from.extensionsPrefix) {
      possibleChildren.add(SpecExtension);
    }

    for (const fromType of Array.from(possibleChildren.values())) {
      addWeakNodes(ruleConf, fromType, to, parentContext, stack);
    }

    function addWeakFromStack(ruleConf: RuleInstanceConfig, stack: NormalizedNodeType[]) {
      for (const interType of stack.slice(1)) {
        (normalizedVisitors as any)[interType.name] = normalizedVisitors[interType.name] || {
          enter: [],
          leave: [],
        };
        normalizedVisitors[interType.name].enter.push({
          ...ruleConf,
          visit: () => undefined,
          depth: 0,
          context: {
            isSkippedLevel: true,
            seen: new Set(),
            parent: parentContext,
          },
        });
      }
    }
  }

  function findLegacyVisitorNode<T>(
    visitor: NestedVisitObject<unknown, T>,
    typeName: keyof T | Array<keyof T>
  ) {
    if (Array.isArray(typeName)) {
      const name = typeName.find((name) => visitor[name]) || undefined;
      return name && visitor[name];
    }

    return visitor[typeName];
  }

  function normalizeVisitorLevel(
    ruleConf: RuleInstanceConfig,
    visitor: NestedVisitObject<unknown, T>,
    parentContext: VisitorLevelContext | null,
    depth = 0
  ) {
    const visitorKeys = Object.keys(types) as Array<keyof T | 'any'>;

    if (depth === 0) {
      visitorKeys.push('any');
      visitorKeys.push('ref');
    } else {
      if (visitor.any) {
        throw new Error('any() is allowed only on top level');
      }
      if (visitor.ref) {
        throw new Error('ref() is allowed only on top level');
      }
    }

    for (const typeName of visitorKeys as Array<keyof T>) {
      const typeVisitor = (visitor[typeName] ||
        findLegacyVisitorNode(
          visitor,
          legacyTypesMap[typeName as keyof typeof legacyTypesMap] as keyof T
        )) as NestedVisitObject<unknown, T>;
      const normalizedTypeVisitor = normalizedVisitors[typeName];

      if (!typeVisitor) continue;

      let visitorEnter: VisitFunction<unknown> | undefined;
      let visitorLeave: VisitFunction<unknown> | undefined;
      let visitorSkip: SkipFunction<unknown> | undefined;

      const isObjectVisitor = typeof typeVisitor === 'object';

      if (typeName === 'ref' && isObjectVisitor && typeVisitor.skip) {
        throw new Error('ref() visitor does not support skip');
      }

      if (typeof typeVisitor === 'function') {
        visitorEnter = typeVisitor;
      } else if (isObjectVisitor) {
        visitorEnter = typeVisitor.enter;
        visitorLeave = typeVisitor.leave;
        visitorSkip = typeVisitor.skip;
      }

      const context: VisitorLevelContext = {
        activatedOn: null,
        type: types[typeName],
        parent: parentContext,
        isSkippedLevel: false,
      };

      if (typeof typeVisitor === 'object') {
        normalizeVisitorLevel(ruleConf, typeVisitor, context, depth + 1);
      }

      if (parentContext) {
        addWeakNodes(ruleConf, parentContext.type, types[typeName], parentContext);
      }

      if (visitorEnter || isObjectVisitor) {
        if (visitorEnter && typeof visitorEnter !== 'function') {
          throw new Error('DEV: should be function');
        }

        normalizedTypeVisitor.enter.push({
          ...ruleConf,
          visit: visitorEnter || (() => undefined),
          skip: visitorSkip,
          depth,
          context,
        });
      }

      if (visitorLeave) {
        if (typeof visitorLeave !== 'function') {
          throw new Error('DEV: should be function');
        }
        normalizedTypeVisitor.leave.push({
          ...ruleConf,
          visit: visitorLeave,
          depth,
          context,
        });
      }
    }
  }
}
